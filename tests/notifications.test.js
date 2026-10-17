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

// From the reviews of #142.

test("an actor whose role grants no view of own requests is refused before persistence is read", async () => {
  const fake = source([]);
  const result = await getRequesterNotifications({ actor: { id: 1, role: "Visitor", categoryIds: [] } }, fake);
  assert.deepEqual(result, { ok: false, code: "not-authorised" });
  assert.equal(fake.calls.length, 0);
});

test("the requester id matches whether the session and the store give it as a string or a number", async () => {
  const at = new Date("2026-10-06T10:00:00Z");
  const request = { reference: "CC-0000-0001", requesterId: "1", statusHistory: [{ fromStatus: "New", toStatus: "Assigned", createdAt: at }], actionEntries: [] };
  const result = await getRequesterNotifications({ actor: REQUESTER }, source([request]));
  assert.deepEqual(result.notifications.map((n) => n.event), ["accepted"]);
});

test("indications with the same time are listed in the same order on every refresh", async () => {
  const at = new Date("2026-10-06T10:00:00Z");
  // Every row has the same time, and the store gives the requests in a different order each call.
  const history = [
    { id: "3", fromStatus: "In Progress", toStatus: "Resolved", createdAt: at },
    { id: "2", fromStatus: "New", toStatus: "In Progress", createdAt: at },
  ];
  const a = { reference: "CC-0000-0002", requesterId: 1, statusHistory: history, actionEntries: [] };
  const b = { reference: "CC-0000-0001", requesterId: 1, statusHistory: [{ id: "9", fromStatus: "New", toStatus: "Assigned", createdAt: at }], actionEntries: [] };
  const first = await getRequesterNotifications({ actor: REQUESTER }, source([a, b]));
  const second = await getRequesterNotifications({ actor: REQUESTER }, source([b, a]));
  assert.deepEqual(first.notifications.map((n) => `${n.reference} ${n.event}`), [
    "CC-0000-0001 accepted",
    "CC-0000-0002 accepted",
    "CC-0000-0002 completed",
  ]);
  assert.deepEqual(second.notifications, first.notifications);
});
