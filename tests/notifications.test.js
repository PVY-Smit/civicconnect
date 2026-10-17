import test from "node:test";
import assert from "node:assert/strict";

import {
  getRequesterNotifications,
} from "../src/modules/notifications/service.js";

const REQUESTER = {
  id: 1,
  role: "Requester",
  categoryIds: [],
};

function source(requests) {
  const calls = [];

  return {
    calls,

    notificationSources: {
      async forRequester(requesterId) {
        calls.push(requesterId);
        return requests;
      },
    },
  };
}

test("missing actor is refused before persistence is read", async () => {
  const fake = source([]);

  const result =
    await getRequesterNotifications(
      {
        actor: null,
      },
      fake,
    );

  assert.equal(result.ok, false);
  assert.equal(result.code, "not-signed-in");
  assert.equal(fake.calls.length, 0);
});

test("New to Assigned produces accepted", async () => {
  const fake = source([
    {
      requesterId: 1,
      reference: "CC-0001-0001",
      statusHistory: [
        {
          fromStatus: "New",
          toStatus: "Assigned",
          createdAt:
            "2026-10-01T08:00:00.000Z",
        },
      ],
      actionEntries: [],
    },
  ]);

  const result =
    await getRequesterNotifications(
      {
        actor: REQUESTER,
      },
      fake,
    );

  assert.deepEqual(
    result.notifications,
    [
      {
        reference: "CC-0001-0001",
        event: "accepted",
        at: "2026-10-01T08:00:00.000Z",
      },
    ],
  );
});

test("New to In Progress also produces accepted", async () => {
  const fake = source([
    {
      requesterId: 1,
      reference: "CC-0001-0002",
      statusHistory: [
        {
          fromStatus: "New",
          toStatus: "In Progress",
          createdAt:
            "2026-10-01T09:00:00.000Z",
        },
      ],
      actionEntries: [],
    },
  ]);

  const result =
    await getRequesterNotifications(
      {
        actor: REQUESTER,
      },
      fake,
    );

  assert.equal(
    result.notifications[0].event,
    "accepted",
  );
});

test("only the first qualifying acceptance transition produces accepted", async () => {
  const fake = source([
    {
      requesterId: 1,
      reference: "CC-0001-0003",
      statusHistory: [
        {
          fromStatus: "New",
          toStatus: "Assigned",
          createdAt:
            "2026-10-01T08:00:00.000Z",
        },
        {
          fromStatus: "New",
          toStatus: "In Progress",
          createdAt:
            "2026-10-01T09:00:00.000Z",
        },
      ],
      actionEntries: [],
    },
  ]);

  const result =
    await getRequesterNotifications(
      {
        actor: REQUESTER,
      },
      fake,
    );

  assert.equal(
    result.notifications.filter(
      (item) =>
        item.event === "accepted",
    ).length,
    1,
  );
});

test("requester-visible action entry produces updated", async () => {
  const fake = source([
    {
      requesterId: 1,
      reference: "CC-0001-0004",
      statusHistory: [],
      actionEntries: [
        {
          visibility: "requester-visible",
          createdAt:
            "2026-10-02T10:00:00.000Z",
        },
      ],
    },
  ]);

  const result =
    await getRequesterNotifications(
      {
        actor: REQUESTER,
      },
      fake,
    );

  assert.deepEqual(
    result.notifications,
    [
      {
        reference: "CC-0001-0004",
        event: "updated",
        at: "2026-10-02T10:00:00.000Z",
      },
    ],
  );
});

test("internal action entry produces no notification", async () => {
  const fake = source([
    {
      requesterId: 1,
      reference: "CC-0001-0005",
      statusHistory: [],
      actionEntries: [
        {
          visibility: "internal",
          createdAt:
            "2026-10-02T11:00:00.000Z",
        },
      ],
    },
  ]);

  const result =
    await getRequesterNotifications(
      {
        actor: REQUESTER,
      },
      fake,
    );

  assert.deepEqual(
    result.notifications,
    [],
  );
});

test("transition to Rejected produces rejected", async () => {
  const fake = source([
    {
      requesterId: 1,
      reference: "CC-0001-0006",
      statusHistory: [
        {
          fromStatus: "Assigned",
          toStatus: "Rejected",
          createdAt:
            "2026-10-03T08:00:00.000Z",
        },
      ],
      actionEntries: [],
    },
  ]);

  const result =
    await getRequesterNotifications(
      {
        actor: REQUESTER,
      },
      fake,
    );

  assert.equal(
    result.notifications[0].event,
    "rejected",
  );
});

test("each transition to Resolved produces completed", async () => {
  const fake = source([
    {
      requesterId: 1,
      reference: "CC-0001-0007",
      statusHistory: [
        {
          fromStatus: "In Progress",
          toStatus: "Resolved",
          createdAt:
            "2026-10-03T09:00:00.000Z",
        },
        {
          fromStatus: "Resolved",
          toStatus: "In Progress",
          createdAt:
            "2026-10-04T09:00:00.000Z",
        },
        {
          fromStatus: "In Progress",
          toStatus: "Resolved",
          createdAt:
            "2026-10-05T09:00:00.000Z",
        },
      ],
      actionEntries: [],
    },
  ]);

  const result =
    await getRequesterNotifications(
      {
        actor: REQUESTER,
      },
      fake,
    );

  assert.equal(
    result.notifications.filter(
      (item) =>
        item.event === "completed",
    ).length,
    2,
  );
});

test("Closed does not create another completed notification", async () => {
  const fake = source([
    {
      requesterId: 1,
      reference: "CC-0001-0008",
      statusHistory: [
        {
          fromStatus: "Resolved",
          toStatus: "Closed",
          createdAt:
            "2026-10-05T10:00:00.000Z",
        },
      ],
      actionEntries: [],
    },
  ]);

  const result =
    await getRequesterNotifications(
      {
        actor: REQUESTER,
      },
      fake,
    );

  assert.deepEqual(
    result.notifications,
    [],
  );
});

test("another requester's request is never returned", async () => {
  const fake = source([
    {
      requesterId: 99,
      reference: "CC-SECRET-0001",
      statusHistory: [
        {
          fromStatus: "New",
          toStatus: "Assigned",
          createdAt:
            "2026-10-01T08:00:00.000Z",
        },
      ],
      actionEntries: [
        {
          visibility: "requester-visible",
          createdAt:
            "2026-10-02T08:00:00.000Z",
        },
      ],
    },
  ]);

  const result =
    await getRequesterNotifications(
      {
        actor: REQUESTER,
      },
      fake,
    );

  assert.deepEqual(
    result.notifications,
    [],
  );
});

test("authenticated actor id is passed to persistence", async () => {
  const fake = source([]);

  await getRequesterNotifications(
    {
      actor: REQUESTER,
    },
    fake,
  );

  assert.deepEqual(
    fake.calls,
    [REQUESTER.id],
  );
});

test("notifications use the #133 response fields and newest appears first", async () => {
  const fake = source([
    {
      requesterId: 1,
      reference: "CC-0001-0009",
      statusHistory: [
        {
          fromStatus: "New",
          toStatus: "Assigned",
          createdAt:
            "2026-10-01T08:00:00.000Z",
        },
        {
          fromStatus: "In Progress",
          toStatus: "Resolved",
          createdAt:
            "2026-10-03T08:00:00.000Z",
        },
      ],
      actionEntries: [
        {
          visibility: "requester-visible",
          createdAt:
            "2026-10-02T08:00:00.000Z",
        },
      ],
    },
  ]);

  const result =
    await getRequesterNotifications(
      {
        actor: REQUESTER,
      },
      fake,
    );

  assert.deepEqual(
    result.notifications.map(
      ({ reference, event }) => ({
        reference,
        event,
      }),
    ),
    [
      {
        reference: "CC-0001-0009",
        event: "completed",
      },
      {
        reference: "CC-0001-0009",
        event: "updated",
      },
      {
        reference: "CC-0001-0009",
        event: "accepted",
      },
    ],
  );
});
