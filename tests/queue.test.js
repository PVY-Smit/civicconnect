// The staff queue (FR-013, FR-014): query validation, the filters, the scope and the HTTP boundary.
//
// The fake store evaluates the where clause the service builds against rows, so scope and filters are
// checked by the rows that come back, not by the shape of the condition. The same queue runs against
// PostgreSQL in TC-32 (tests/api-postgres.test.js).

import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_QUEUE_SORT, MAX_PAGE, PAGE_SIZE, Q_MAX, validateQueueQuery } from "../src/modules/queue/validation.js";
import { buildFilterWhere, getQueue, startOfDay, startOfNextDay } from "../src/modules/queue/service.js";
import { createQueueHandlers } from "../src/modules/queue/http.js";

const STAFF = { id: "5", role: "Staff", categoryIds: ["10", "20"] };
const COORDINATOR = { id: "7", role: "Coordinator", categoryIds: [] };
const REQUESTER = { id: "1", role: "Requester", categoryIds: [] };

// Enough of Prisma's where to evaluate what the policy and the queue build.
function matches(row, where) {
  return Object.entries(where).every(([key, cond]) => {
    if (key === "AND") return cond.every((w) => matches(row, w));
    if (key === "OR") return cond.some((w) => matches(row, w));
    const value = row[key];
    if (cond === null) return value === null;
    if (typeof cond !== "object" || cond instanceof Date) return String(value) === String(cond);
    if (cond.in) return cond.in.map(String).includes(String(value));
    if (cond.contains) return String(value).toLowerCase().includes(cond.contains.toLowerCase());
    if (cond.gte && !(value >= cond.gte)) return false;
    if (cond.lt && !(value < cond.lt)) return false;
    return true;
  });
}

const row = (n, over = {}) => ({
  reference: `CC-0000-000${n}`,
  title: `Request ${n}`,
  description: "Something to fix",
  location: "Main Road",
  category: { name: "Roads" },
  status: "New",
  priority: null,
  reportedUrgency: "Low",
  assignee: null,
  assigneeId: null,
  requesterId: "1",
  categoryId: "10",
  createdAt: new Date("2026-10-06T08:00:00Z"),
  updatedAt: new Date("2026-10-06T08:00:00Z"),
  ...over,
});

function fakeStore(rows) {
  const calls = [];
  return {
    calls,
    requests: {
      async findQueue({ where, sort, skip, take }) {
        calls.push({ where, sort, skip, take });
        const found = rows.filter((r) => matches(r, where));
        return { rows: found.slice(skip, skip + take), total: found.length };
      },
    },
  };
}

const refs = (result) => result.queue.requests.map((r) => r.reference);

test("defaults: page 1, the default sort, the fixed page size", () => {
  const result = validateQueueQuery({});
  assert.equal(result.ok, true);
  assert.equal(result.value.page, 1);
  assert.equal(result.value.sort, DEFAULT_QUEUE_SORT);
  assert.equal(result.value.pageSize, PAGE_SIZE);
});

test("each invalid value is refused with its own field error", () => {
  const result = validateQueueQuery({
    status: "Done",
    categoryId: "x",
    assigneeId: "someone",
    from: "2026-02-30",
    to: "06/10/2026",
    sort: "title",
    page: "0",
  });
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ["assigneeId", "categoryId", "from", "page", "sort", "status", "to"]);
});

test("to before from is refused", () => {
  assert.ok(validateQueueQuery({ from: "2026-10-06", to: "2026-10-05" }).errors.to);
  assert.equal(validateQueueQuery({ from: "2026-10-06", to: "2026-10-06" }).ok, true);
});

test("a repeated parameter is refused, never dropped (Express 5 gives an array)", () => {
  const result = validateQueueQuery({ status: ["New", "Closed"] });
  assert.equal(result.ok, false);
  assert.ok(result.errors.status);
  assert.ok(validateQueueQuery({ q: { contains: "x" } }).errors.q);
});

test("the page is capped, so skip stays a safe integer", () => {
  assert.equal(validateQueueQuery({ page: String(MAX_PAGE) }).ok, true);
  assert.ok(validateQueueQuery({ page: String(MAX_PAGE + 1) }).errors.page);
  assert.ok(validateQueueQuery({ page: "100000000000000000000" }).errors.page);
});

test("the search is capped at Q_MAX characters", () => {
  assert.equal(validateQueueQuery({ q: "a".repeat(Q_MAX) }).ok, true);
  assert.ok(validateQueueQuery({ q: "a".repeat(Q_MAX + 1) }).errors.q);
});

test("day bounds are South African days: from is the day's start, to ends before the next day's start", () => {
  assert.equal(startOfDay("2026-10-06").toISOString(), "2026-10-05T22:00:00.000Z");
  assert.equal(startOfNextDay("2026-10-06").toISOString(), "2026-10-06T22:00:00.000Z");
  const where = buildFilterWhere(STAFF, { from: "2026-10-06", to: "2026-10-06" });
  assert.deepEqual(where.AND[0].createdAt, { gte: startOfDay("2026-10-06"), lt: startOfNextDay("2026-10-06") });
});

test("00:30 on 6 October in Johannesburg is in from=6 October and not in to=5 October", async () => {
  const early = row(1, { createdAt: new Date("2026-10-05T22:30:00Z") }); // 00:30 SAST on 6 October
  const late = row(2, { createdAt: new Date("2026-10-06T21:30:00Z") }); // 23:30 SAST on 6 October
  const lastMicro = row(3, { createdAt: new Date("2026-10-06T21:59:59.999Z") }); // the last millisecond of 6 October
  const next = row(4, { createdAt: new Date("2026-10-06T22:00:00Z") }); // 00:00 SAST on 7 October
  const { requests } = fakeStore([early, late, lastMicro, next]);
  const on6 = await getQueue({ actor: COORDINATOR, query: { from: "2026-10-06", to: "2026-10-06" } }, { requests });
  assert.deepEqual(refs(on6), [early, late, lastMicro].map((r) => r.reference));
  const to5 = await getQueue({ actor: COORDINATOR, query: { to: "2026-10-05" } }, { requests });
  assert.deepEqual(refs(to5), []);
});

test("Staff see only their own and their categories' requests, whatever the filters", async () => {
  const mine = row(1, { requesterId: "5", categoryId: "99" });
  const inScope = row(2, { categoryId: "20" });
  const outOfScope = row(3, { categoryId: "30" });
  const { requests } = fakeStore([mine, inScope, outOfScope]);
  assert.deepEqual(refs(await getQueue({ actor: STAFF }, { requests })), [mine.reference, inScope.reference]);
  const filtered = await getQueue({ actor: STAFF, query: { categoryId: "30" } }, { requests });
  assert.deepEqual(refs(filtered), [], "a filter cannot widen the scope");
});

test("a Coordinator sees every category, and the filters narrow it", async () => {
  const a = row(1, { categoryId: "30", status: "Assigned" });
  const b = row(2, { categoryId: "40" });
  const { requests } = fakeStore([a, b]);
  assert.deepEqual(refs(await getQueue({ actor: COORDINATOR }, { requests })), [a.reference, b.reference]);
  assert.deepEqual(refs(await getQueue({ actor: COORDINATOR, query: { status: "Assigned" } }, { requests })), [a.reference]);
});

test("assignee filters: me is the actor, none is unassigned, an id stays the id", async () => {
  const mine = row(1, { assigneeId: "5" });
  const theirs = row(2, { assigneeId: "6" });
  const nobody = row(3);
  const { requests } = fakeStore([mine, theirs, nobody]);
  const q = (assigneeId) => getQueue({ actor: COORDINATOR, query: { assigneeId } }, { requests }).then(refs);
  assert.deepEqual(await getQueue({ actor: STAFF, query: { assigneeId: "me" } }, { requests }).then(refs), [mine.reference]);
  assert.deepEqual(await q("none"), [nobody.reference]);
  assert.deepEqual(await q("6"), [theirs.reference]);
});

test("the search covers reference, title, description and location, ignoring case", async () => {
  const rows = [row(1, { title: "Burst PIPE" }), row(2, { location: "Pipe Lane" }), row(3, { description: "pipes" }), row(4)];
  const { requests } = fakeStore(rows);
  assert.deepEqual(refs(await getQueue({ actor: COORDINATOR, query: { q: "pipe" } }, { requests })), rows.slice(0, 3).map((r) => r.reference));
  assert.deepEqual(refs(await getQueue({ actor: COORDINATOR, query: { q: "0003" } }, { requests })), [rows[2].reference]);
});

test("the page, its size and the sort reach the store", async () => {
  const store = fakeStore([]);
  await getQueue({ actor: COORDINATOR, query: { page: "3", sort: "priority_desc" } }, store);
  const { sort, skip, take } = store.calls[0];
  assert.deepEqual({ sort, skip, take }, { sort: "priority_desc", skip: 2 * PAGE_SIZE, take: PAGE_SIZE });
});

test("the response is the contract the client's queue reads", async () => {
  const assigned = row(1, { assignee: { id: "5", name: "Sam Staff" }, assigneeId: "5", priority: "High" });
  const result = await getQueue({ actor: COORDINATOR }, fakeStore([assigned]));
  assert.deepEqual(result.queue, {
    requests: [
      {
        reference: assigned.reference,
        title: assigned.title,
        category: "Roads",
        status: "New",
        priority: "High",
        reportedUrgency: "Low",
        assignee: { id: "5", name: "Sam Staff" },
        submittedAt: assigned.createdAt,
        updatedAt: assigned.updatedAt,
      },
    ],
    total: 1,
    page: 1,
    pageSize: PAGE_SIZE,
  });
});

test("a row without its category is a data fault, not a blank cell", async () => {
  await assert.rejects(getQueue({ actor: COORDINATOR }, fakeStore([row(1, { category: null })])));
});

test("a Requester and a missing actor are refused before any query", async () => {
  const store = fakeStore([row(1)]);
  assert.equal((await getQueue({ actor: REQUESTER }, store)).code, "not-authorised");
  assert.equal((await getQueue({ actor: null }, store)).code, "not-signed-in");
  assert.equal(store.calls.length, 0);
});

// The HTTP boundary, with plain objects for req and res.
function response() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("handler: 401, 403, 400 and 200, and the staff list only for queue users", async () => {
  const store = fakeStore([row(1)]);
  const users = { activeStaff: async () => [{ id: "5", name: "Sam Staff" }] };
  const { queue, staff } = createQueueHandlers({ requests: store.requests, users });
  const call = async (handler, actor, query = {}) => {
    const res = response();
    await handler({ actor, query }, res);
    return res;
  };
  assert.equal((await call(queue, null)).statusCode, 401);
  assert.equal((await call(queue, REQUESTER)).statusCode, 403);
  assert.equal((await call(queue, REQUESTER)).body.error, "You are not authorised to do this.");
  assert.equal((await call(queue, COORDINATOR, { sort: "nope" })).statusCode, 400);
  assert.equal((await call(queue, COORDINATOR)).statusCode, 200);
  assert.equal((await call(staff, REQUESTER)).statusCode, 403);
  assert.deepEqual((await call(staff, STAFF)).body, { staff: [{ id: "5", name: "Sam Staff" }] });
});
