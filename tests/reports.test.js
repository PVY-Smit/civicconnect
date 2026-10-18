// Management reporting (FR-022 to FR-024): the period, the counts, the breakdown, the overdue list, the
// scope and the HTTP boundary.
//
// The fake store evaluates the where clause the service builds against rows, so the period's bounds and
// the actor's scope are checked by the rows that come back. The same reports run against PostgreSQL in
// TC-32 (tests/api-postgres.test.js).

import { test } from "node:test";
import assert from "node:assert/strict";
import { validateReportPeriod } from "../src/modules/reports/validation.js";
import { assertTargetDays, getOverdueReport, getReportSummary } from "../src/modules/reports/service.js";
import { createReportHandlers } from "../src/modules/reports/http.js";

const COORDINATOR = { id: "7", role: "Coordinator", categoryIds: [] };
const MANAGER = { id: "8", role: "Manager", categoryIds: ["10"] };
const STAFF = { id: "5", role: "Staff", categoryIds: ["10"] };
const NOW = new Date("2026-10-20T10:00:00Z");
const TARGET = 10;
const DAY = 24 * 60 * 60 * 1000;

function matches(row, where) {
  return Object.entries(where).every(([key, cond]) => {
    if (key === "AND") return cond.every((w) => matches(row, w));
    if (key === "OR") return cond.some((w) => matches(row, w));
    const value = row[key];
    if (cond === null) return value === null;
    if (typeof cond !== "object" || cond instanceof Date) return String(value) === String(cond);
    if (cond.in) return cond.in.map(String).includes(String(value));
    if (cond.gte && !(value >= cond.gte)) return false;
    if (cond.lt && !(value < cond.lt)) return false;
    return true;
  });
}

let n = 0;
const row = (over = {}) => ({
  reference: `CC-0000-${String(++n).padStart(4, "0")}`,
  status: "New",
  categoryId: "10",
  requesterId: "1",
  category: { name: "Roads" },
  assignee: null,
  createdAt: new Date(NOW.getTime() - 2 * DAY),
  ...over,
});
const daysOld = (days, over = {}) => row({ createdAt: new Date(NOW.getTime() - days * DAY), ...over });

function fakeReports(rows) {
  const calls = [];
  const find = async ({ where }) => {
    calls.push(where);
    return rows.filter((r) => matches(r, where));
  };
  return { calls, reports: { forSummary: find, openRequests: find } };
}

const summary = (rows, query = {}, actor = COORDINATOR) =>
  getReportSummary({ actor, query, now: NOW, targetDays: TARGET }, fakeReports(rows)).then((r) => r.summary);

test("the period: optional dates, refused when invalid, reversed or repeated", () => {
  assert.deepEqual(validateReportPeriod({}), { ok: true, value: { from: null, to: null } });
  assert.ok(validateReportPeriod({ from: "2026-02-30" }).errors.from);
  assert.ok(validateReportPeriod({ from: "2026-10-06", to: "2026-10-05" }).errors.to);
  assert.ok(validateReportPeriod({ from: ["2026-10-01", "2026-10-02"] }).errors.from, "a repeated date is refused, never dropped");
});

test("FR-022: each count equals the value worked out by hand, with an age equal to the target not overdue", async () => {
  const rows = [
    daysOld(TARGET, { status: "New" }), // equal to the target: open, not overdue
    daysOld(TARGET + 1, { status: "Assigned" }), // overdue
    daysOld(TARGET + 5, { status: "On Hold" }), // overdue
    daysOld(TARGET + 5, { status: "Resolved" }), // old but resolved: never overdue
    daysOld(1, { status: "Resolved" }),
    daysOld(3, { status: "Closed" }),
    daysOld(4, { status: "Rejected" }),
  ];
  const result = await summary(rows);
  assert.deepEqual(result.counts, { open: 3, overdue: 2, resolved: 2, closed: 1 });
  assert.equal(result.overdueTargetDays, TARGET);
});

test("FR-022: the period is South African days, and the to date's own day is included", async () => {
  const lateOnTo = row({ createdAt: new Date("2026-10-06T21:30:00Z") }); // 23:30 on 6 October in Johannesburg
  const earlyOnFrom = row({ createdAt: new Date("2026-10-05T22:30:00Z") }); // 00:30 on 6 October in Johannesburg
  const nextDay = row({ createdAt: new Date("2026-10-06T22:00:00Z") }); // 00:00 on 7 October
  const before = row({ createdAt: new Date("2026-10-05T21:59:59.999Z") }); // 23:59 on 5 October
  const result = await summary([lateOnTo, earlyOnFrom, nextDay, before], { from: "2026-10-06", to: "2026-10-06" });
  assert.equal(result.counts.open, 2);
  assert.deepEqual(result.breakdown, [{ category: "Roads", status: "New", count: 2 }]);
});

test("FR-023: the breakdown reconciles to the period's total and is in a stable order", async () => {
  const rows = [
    row({ category: { name: "Water" }, status: "Closed" }),
    row({ category: { name: "Roads" }, status: "New" }),
    row({ category: { name: "Roads" }, status: "New" }),
    row({ category: { name: "Roads" }, status: "Closed" }),
  ];
  const result = await summary(rows);
  assert.deepEqual(result.breakdown, [
    { category: "Roads", status: "Closed", count: 1 },
    { category: "Roads", status: "New", count: 2 },
    { category: "Water", status: "Closed", count: 1 },
  ]);
  assert.equal(result.breakdown.reduce((total, r) => total + r.count, 0), rows.length);
  assert.deepEqual((await summary([])).breakdown, [], "an empty period has an empty breakdown");
});

test("a request with no category is a data fault, not an Unknown row", async () => {
  await assert.rejects(summary([row({ category: null })]));
});

test("FR-024: every open request older than the target, oldest first, with its four fields", async () => {
  const assigned = { id: "5", name: "Sam Staff" };
  const rows = [
    daysOld(TARGET, { status: "New" }),
    daysOld(TARGET + 3, { status: "In Progress", assignee: assigned }),
    daysOld(TARGET + 9, { status: "New" }),
    daysOld(TARGET + 9, { status: "Closed" }),
  ];
  const { overdue } = await getOverdueReport({ actor: COORDINATOR, now: NOW, targetDays: TARGET }, fakeReports(rows));
  assert.equal(overdue.targetDays, TARGET);
  assert.deepEqual(overdue.requests, [
    { reference: rows[2].reference, category: "Roads", ageDays: TARGET + 9, assignee: null },
    { reference: rows[1].reference, category: "Roads", ageDays: TARGET + 3, assignee: assigned },
  ]);
});

test("age is in whole days, rounded down", async () => {
  const almost = row({ createdAt: new Date(NOW.getTime() - (TARGET + 1) * DAY + 60_000) }); // one minute short of 11 days
  const { overdue } = await getOverdueReport({ actor: COORDINATOR, now: NOW, targetDays: TARGET }, fakeReports([almost]));
  assert.deepEqual(overdue.requests, []);
});

test("scope: a Manager's reports cover only the requests they may open", async () => {
  const theirs = daysOld(TARGET + 1, { categoryId: "10" });
  const elsewhere = daysOld(TARGET + 1, { categoryId: "20" });
  const managerSummary = await summary([theirs, elsewhere], {}, MANAGER);
  assert.equal(managerSummary.counts.open, 1);
  const { overdue } = await getOverdueReport({ actor: MANAGER, now: NOW, targetDays: TARGET }, fakeReports([theirs, elsewhere]));
  assert.deepEqual(overdue.requests.map((r) => r.reference), [theirs.reference]);
  assert.equal((await summary([theirs, elsewhere])).counts.open, 2, "a Coordinator sees every category");
});

test("Staff and a missing actor are refused before any query", async () => {
  const fake = fakeReports([row()]);
  assert.equal((await getReportSummary({ actor: STAFF, now: NOW, targetDays: TARGET }, fake)).code, "not-authorised");
  assert.equal((await getOverdueReport({ actor: null, now: NOW, targetDays: TARGET }, fake)).code, "not-signed-in");
  assert.equal(fake.calls.length, 0);
});

test("the target must be a whole number of days, at least 1, or the handlers are not made", () => {
  assert.equal(assertTargetDays(10), 10);
  for (const bad of [undefined, 0, -1, 2.5, NaN, "10"]) {
    assert.throws(() => createReportHandlers({ reports: {}, overdueTargetDays: bad }), /OVERDUE_TARGET_DAYS/);
  }
});

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

test("handler: 401, 403, 400 and 200, with the time taken from the injected clock", async () => {
  const { reports } = fakeReports([daysOld(TARGET + 1)]);
  const { summary: summaryHandler, overdue } = createReportHandlers({ reports, overdueTargetDays: TARGET, now: () => NOW });
  const call = async (handler, actor, query = {}) => {
    const res = response();
    await handler({ actor, query }, res);
    return res;
  };
  assert.equal((await call(summaryHandler, null)).statusCode, 401);
  const refused = await call(summaryHandler, STAFF);
  assert.deepEqual([refused.statusCode, refused.body], [403, { error: "You are not authorised to do this." }]);
  assert.equal((await call(summaryHandler, COORDINATOR, { to: "nope" })).statusCode, 400);
  const ok = await call(summaryHandler, COORDINATOR);
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.body.counts.overdue, 1);
  assert.deepEqual((await call(overdue, COORDINATOR)).body.requests.map((r) => r.ageDays), [TARGET + 1]);
});
