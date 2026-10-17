import test from "node:test";
import assert from "node:assert/strict";

import {
  validateReportPeriod,
} from "../src/modules/reports/validation.js";

import {
  getOverdueReport,
  getReportSummary,
} from "../src/modules/reports/service.js";

const MANAGER = {
  id: 10,
  role: "Manager",
  categoryIds: [1, 2],
};

const REQUESTER = {
  id: 20,
  role: "Requester",
  categoryIds: [],
};

const TARGET = 5;

function fakeReports({
  summary = [],
  open = [],
} = {}) {
  const calls = {
    summary: [],
    open: 0,
  };

  return {
    calls,

    reports: {
      async forSummary(args) {
        calls.summary.push(args);
        return summary;
      },

      async openRequests() {
        calls.open += 1;
        return open;
      },
    },
  };
}

test("valid period is accepted", () => {
  assert.equal(
    validateReportPeriod({
      from: "2026-10-01",
      to: "2026-10-07",
    }).ok,
    true,
  );
});

test("bad and backwards periods are refused", () => {
  assert.equal(
    validateReportPeriod({
      from: "2026-02-31",
    }).ok,
    false,
  );

  const backwards =
    validateReportPeriod({
      from: "2026-10-07",
      to: "2026-10-01",
    });

  assert.equal(
    backwards.ok,
    false,
  );

  assert.match(
    backwards.errors.to,
    /on or after/,
  );
});

test("missing actor is refused", async () => {
  const fake = fakeReports();

  const result =
    await getReportSummary(
      {
        actor: null,
        overdueTargetDays: TARGET,
      },
      fake,
    );

  assert.equal(
    result.code,
    "not-signed-in",
  );

  assert.equal(
    fake.calls.summary.length,
    0,
  );
});

test("actor without management permission is refused", async () => {
  const fake = fakeReports();

  const result =
    await getReportSummary(
      {
        actor: REQUESTER,
        overdueTargetDays: TARGET,
      },
      fake,
    );

  assert.equal(
    result.code,
    "not-authorised",
  );
});

test("summary returns the #135 response contract", async () => {
  const now =
    new Date(
      "2026-10-10T12:00:00.000Z",
    );

  const fake = fakeReports({
    summary: [
      {
        reference: "CC-1",
        category: {
          name: "Roads",
        },
        status: "New",
        createdAt:
          "2026-10-01T12:00:00.000Z",
      },
      {
        reference: "CC-2",
        category: {
          name: "Water",
        },
        status: "Resolved",
        createdAt:
          "2026-10-09T12:00:00.000Z",
      },
      {
        reference: "CC-3",
        category: {
          name: "Roads",
        },
        status: "Closed",
        createdAt:
          "2026-10-08T12:00:00.000Z",
      },
    ],
  });

  const result =
    await getReportSummary(
      {
        actor: MANAGER,
        query: {
          from: "2026-10-01",
          to: "2026-10-10",
        },
        now,
        overdueTargetDays: TARGET,
      },
      fake,
    );

  assert.equal(
    result.ok,
    true,
  );

  assert.deepEqual(
    result.summary.counts,
    {
      open: 1,
      overdue: 1,
      resolved: 1,
      closed: 1,
    },
  );

  assert.equal(
    result.summary.overdueTargetDays,
    TARGET,
  );

  assert.equal(
    result.summary.from,
    "2026-10-01",
  );

  assert.equal(
    result.summary.to,
    "2026-10-10",
  );
});

test("breakdown contains category and status counts", async () => {
  const fake = fakeReports({
    summary: [
      {
        category: {
          name: "Roads",
        },
        status: "New",
        createdAt:
          "2026-10-01T00:00:00.000Z",
      },
      {
        category: {
          name: "Roads",
        },
        status: "New",
        createdAt:
          "2026-10-01T00:00:00.000Z",
      },
      {
        category: {
          name: "Water",
        },
        status: "Resolved",
        createdAt:
          "2026-10-01T00:00:00.000Z",
      },
    ],
  });

  const result =
    await getReportSummary(
      {
        actor: MANAGER,
        overdueTargetDays: TARGET,
        now: new Date(
          "2026-10-10T00:00:00.000Z",
        ),
      },
      fake,
    );

  assert.deepEqual(
    result.summary.breakdown,
    [
      {
        category: "Roads",
        status: "New",
        count: 2,
      },
      {
        category: "Water",
        status: "Resolved",
        count: 1,
      },
    ],
  );
});

test("age equal to target is not overdue", async () => {
  const fake = fakeReports({
    open: [
      {
        reference: "CC-1",
        category: {
          name: "Roads",
        },
        status: "New",
        createdAt:
          "2026-10-05T12:00:00.000Z",
        assignee: null,
      },
    ],
  });

  const result =
    await getOverdueReport(
      {
        actor: MANAGER,
        now: new Date(
          "2026-10-10T12:00:00.000Z",
        ),
        overdueTargetDays: 5,
      },
      fake,
    );

  assert.equal(
    result.overdue.requests.length,
    0,
  );
});

test("age greater than target is overdue", async () => {
  const fake = fakeReports({
    open: [
      {
        reference: "CC-1",
        category: {
          name: "Roads",
        },
        status: "Assigned",
        createdAt:
          "2026-10-01T12:00:00.000Z",
        assignee: {
          id: 5,
          name: "Sam Staff",
        },
      },
    ],
  });

  const result =
    await getOverdueReport(
      {
        actor: MANAGER,
        now: new Date(
          "2026-10-10T12:00:00.000Z",
        ),
        overdueTargetDays: 5,
      },
      fake,
    );

  assert.deepEqual(
    result.overdue,
    {
      targetDays: 5,

      requests: [
        {
          reference: "CC-1",
          category: "Roads",
          ageDays: 9,
          assignee: {
            id: 5,
            name: "Sam Staff",
          },
        },
      ],
    },
  );
});

test("resolved and closed requests never appear in overdue list", async () => {
  const fake = fakeReports({
    open: [
      {
        reference: "CC-RES",
        category: {
          name: "Roads",
        },
        status: "Resolved",
        createdAt:
          "2026-09-01T00:00:00.000Z",
      },
      {
        reference: "CC-CLOSED",
        category: {
          name: "Roads",
        },
        status: "Closed",
        createdAt:
          "2026-09-01T00:00:00.000Z",
      },
    ],
  });

  const result =
    await getOverdueReport(
      {
        actor: MANAGER,
        now: new Date(
          "2026-10-10T00:00:00.000Z",
        ),
        overdueTargetDays: 5,
      },
      fake,
    );

  assert.deepEqual(
    result.overdue.requests,
    [],
  );
});

test("overdue list is oldest first", async () => {
  const fake = fakeReports({
    open: [
      {
        reference: "CC-YOUNGER",
        category: {
          name: "Water",
        },
        status: "New",
        createdAt:
          "2026-10-02T00:00:00.000Z",
      },
      {
        reference: "CC-OLDER",
        category: {
          name: "Roads",
        },
        status: "Assigned",
        createdAt:
          "2026-09-25T00:00:00.000Z",
      },
    ],
  });

  const result =
    await getOverdueReport(
      {
        actor: MANAGER,
        now: new Date(
          "2026-10-10T00:00:00.000Z",
        ),
        overdueTargetDays: 5,
      },
      fake,
    );

  assert.deepEqual(
    result.overdue.requests.map(
      (request) =>
        request.reference,
    ),
    [
      "CC-OLDER",
      "CC-YOUNGER",
    ],
  );
});
