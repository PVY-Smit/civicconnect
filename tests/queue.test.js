import test from "node:test";
import assert from "node:assert/strict";

import {
  validateQueueQuery,
  QUEUE_SORTS,
  DEFAULT_QUEUE_SORT,
  PAGE_SIZE,
} from "../src/modules/queue/validation.js";

import {
  getQueue,
} from "../src/modules/queue/service.js";

const STAFF = {
  id: 5,
  role: "Staff",
  categoryIds: [10, 20],
};

const COORDINATOR = {
  id: 7,
  role: "Coordinator",
  categoryIds: [],
};

const REQUESTER = {
  id: 1,
  role: "Requester",
  categoryIds: [],
};

function fakeRequests(rows = []) {
  const calls = {
    find: [],
    count: [],
  };

  return {
    calls,

    requests: {
      async findQueue(args) {
        calls.find.push(args);
        return rows;
      },

      async countQueue(args) {
        calls.count.push(args);
        return rows.length;
      },
    },
  };
}

test("queue query defaults to page 1 and submitted_desc", () => {
  const result = validateQueueQuery({});

  assert.equal(result.ok, true);
  assert.equal(result.value.page, 1);
  assert.equal(result.value.pageSize, PAGE_SIZE);
  assert.equal(result.value.sort, DEFAULT_QUEUE_SORT);
});

test("all six queue sorts are accepted", () => {
  assert.deepEqual(
    [...QUEUE_SORTS],
    [
      "submitted_desc",
      "submitted_asc",
      "updated_desc",
      "updated_asc",
      "priority_desc",
      "priority_asc",
    ],
  );

  for (const sort of QUEUE_SORTS) {
    const result = validateQueueQuery({ sort });

    assert.equal(result.ok, true, sort);
    assert.equal(result.value.sort, sort);
  }
});

test("invalid status, sort and page are refused together", () => {
  const result = validateQueueQuery({
    status: "Finished",
    sort: "DROP",
    page: "0",
  });

  assert.equal(result.ok, false);

  assert.deepEqual(
    Object.keys(result.errors).sort(),
    ["page", "sort", "status"],
  );
});

test("category must be a positive integer", () => {
  assert.equal(
    validateQueueQuery({ categoryId: "10" }).ok,
    true,
  );

  assert.equal(
    validateQueueQuery({ categoryId: "0" }).ok,
    false,
  );

  assert.equal(
    validateQueueQuery({ categoryId: "abc" }).ok,
    false,
  );
});

test('assignee accepts an id, "none", or "me"', () => {
  for (const value of ["5", "none", "me", ""]) {
    assert.equal(
      validateQueueQuery({ assigneeId: value }).ok,
      true,
      value,
    );
  }

  assert.equal(
    validateQueueQuery({ assigneeId: "-1" }).ok,
    false,
  );
});

test("date range must contain real dates and must not run backwards", () => {
  assert.equal(
    validateQueueQuery({
      from: "2026-10-01",
      to: "2026-10-07",
    }).ok,
    true,
  );

  assert.equal(
    validateQueueQuery({
      from: "2026-02-31",
    }).ok,
    false,
  );

  const backwards = validateQueueQuery({
    from: "2026-10-07",
    to: "2026-10-01",
  });

  assert.equal(backwards.ok, false);
  assert.match(
    backwards.errors.to,
    /on or after/,
  );
});

test("Requester cannot use the staff queue", async () => {
  const fake = fakeRequests();

  const result = await getQueue(
    {
      actor: REQUESTER,
      query: {},
    },
    fake,
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "not-authorised");
  assert.equal(fake.calls.find.length, 0);
});

test("missing actor is refused before touching persistence", async () => {
  const fake = fakeRequests();

  const result = await getQueue(
    {
      actor: null,
      query: {},
    },
    fake,
  );

  assert.equal(result.ok, false);
  assert.equal(result.code, "not-signed-in");
  assert.equal(fake.calls.find.length, 0);
});

test("Staff scope is always combined with queue filters", async () => {
  const fake = fakeRequests();

  const result = await getQueue(
    {
      actor: STAFF,
      query: {
        q: "pothole",
        status: "New",
        categoryId: "10",
      },
    },
    fake,
  );

  assert.equal(result.ok, true);

  const where = fake.calls.find[0].where;

  assert.equal(Array.isArray(where.AND), true);
  assert.equal(where.AND.length, 2);

  const filter = where.AND[0];
  const scope = where.AND[1];

  assert.equal(Array.isArray(filter.AND), true);

  assert.deepEqual(
    scope,
    {
      OR: [
        { requesterId: STAFF.id },
        {
          categoryId: {
            in: STAFF.categoryIds,
          },
        },
      ],
    },
  );
});

test("Coordinator keeps global scope while filters still apply", async () => {
  const fake = fakeRequests();

  await getQueue(
    {
      actor: COORDINATOR,
      query: {
        status: "Assigned",
      },
    },
    fake,
  );

  const where = fake.calls.find[0].where;

  assert.deepEqual(
    where.AND[1],
    {},
  );

  assert.deepEqual(
    where.AND[0],
    {
      AND: [
        {
          status: "Assigned",
        },
      ],
    },
  );
});

test('assigneeId "me" becomes the actor id', async () => {
  const fake = fakeRequests();

  await getQueue(
    {
      actor: STAFF,
      query: {
        assigneeId: "me",
      },
    },
    fake,
  );

  const filters =
    fake.calls.find[0].where.AND[0].AND;

  assert.deepEqual(
    filters,
    [
      {
        assigneeId: STAFF.id,
      },
    ],
  );
});

test('assigneeId "none" becomes a null assignee filter', async () => {
  const fake = fakeRequests();

  await getQueue(
    {
      actor: STAFF,
      query: {
        assigneeId: "none",
      },
    },
    fake,
  );

  const filters =
    fake.calls.find[0].where.AND[0].AND;

  assert.deepEqual(
    filters,
    [
      {
        assigneeId: null,
      },
    ],
  );
});

test("search covers reference and request text fields", async () => {
  const fake = fakeRequests();

  await getQueue(
    {
      actor: STAFF,
      query: {
        q: "main road",
      },
    },
    fake,
  );

  const search =
    fake.calls.find[0].where.AND[0].AND[0];

  assert.equal(search.OR.length, 4);

  assert.deepEqual(
    Object.keys(search.OR[0]),
    ["reference"],
  );

  assert.deepEqual(
    Object.keys(search.OR[1]),
    ["title"],
  );

  assert.deepEqual(
    Object.keys(search.OR[2]),
    ["description"],
  );

  assert.deepEqual(
    Object.keys(search.OR[3]),
    ["location"],
  );
});

test("page 3 applies the expected skip and fixed page size", async () => {
  const fake = fakeRequests();

  await getQueue(
    {
      actor: COORDINATOR,
      query: {
        page: "3",
      },
    },
    fake,
  );

  assert.equal(
    fake.calls.find[0].skip,
    PAGE_SIZE * 2,
  );

  assert.equal(
    fake.calls.find[0].take,
    PAGE_SIZE,
  );
});

test("queue response matches the contract required by #134", async () => {
  const fake = fakeRequests([
    {
      reference: "CC-4829-1573",
      title: "Pothole",
      category: {
        id: 10,
        name: "Roads",
      },
      status: "Assigned",
      priority: "High",
      reportedUrgency: "Medium",
      assignee: {
        id: 5,
        name: "Sam Staff",
      },
      createdAt: new Date(
        "2026-10-01T08:00:00.000Z",
      ),
      updatedAt: new Date(
        "2026-10-02T09:00:00.000Z",
      ),
    },
  ]);

  const result = await getQueue(
    {
      actor: COORDINATOR,
      query: {},
    },
    fake,
  );

  assert.equal(result.ok, true);

  assert.deepEqual(
    result.queue,
    {
      requests: [
        {
          reference: "CC-4829-1573",
          title: "Pothole",
          category: "Roads",
          status: "Assigned",
          priority: "High",
          reportedUrgency: "Medium",
          assignee: {
            id: 5,
            name: "Sam Staff",
          },
          submittedAt: new Date(
            "2026-10-01T08:00:00.000Z",
          ),
          updatedAt: new Date(
            "2026-10-02T09:00:00.000Z",
          ),
        },
      ],
      total: 1,
      page: 1,
      pageSize: PAGE_SIZE,
    },
  );
});
