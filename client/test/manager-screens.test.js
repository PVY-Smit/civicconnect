// Tests for the manager screens' logic (FR-022 to FR-024) and for navigation driven by the permissions the
// server sends (ADR-006). Route permissions are checked against the policy module itself, so a route cannot
// name a function the policy does not know.

import { test } from "node:test";
import assert from "node:assert/strict";
import { FUNCTIONS, permits, ROLES } from "../../src/modules/authorisation-policy/policy.js";
import { can, homeFor, matchRoute, ROUTES } from "../src/router.js";
import { ageText, defaultPeriod, periodProblem, pivot, STATUS_ORDER } from "../src/reports.js";

// What the server sends at sign-in: the functions the policy permits for the user's role.
const userWith = (role) => ({ id: 1, name: role, role, permissions: Object.keys(FUNCTIONS).filter((fn) => permits({ role }, fn)) });

test("ADR-006: every permission a route asks for is a function the policy knows", () => {
  for (const route of ROUTES.filter((r) => r.permission)) {
    assert.ok(route.permission in FUNCTIONS, `${route.pattern} asks for ${route.permission}`);
  }
});

test("FR-002: each role is offered exactly the screens the policy permits it", () => {
  const offered = (role) => ROUTES.filter((r) => r.permission && can(userWith(role), r.permission)).map((r) => r.name);
  assert.deepEqual(offered("Requester"), []);
  assert.deepEqual(offered("Staff"), ["queue"]);
  assert.deepEqual(offered("Coordinator"), ["queue", "reports"]);
  assert.deepEqual(offered("Manager"), ["queue", "reports", "users", "categories"]);
  assert.deepEqual([...ROLES], ["Requester", "Staff", "Coordinator", "Manager"]);
});

test("without a permissions list from the server nothing extra is offered, whatever the role name says", () => {
  assert.equal(can({ role: "Manager" }, "manageUsers"), false);
  assert.equal(can(null, "viewRequestsInScope"), false);
  assert.equal(homeFor({ role: "Manager" }), "/requests");
  assert.equal(homeFor(userWith("Staff")), "/queue");
  assert.equal(homeFor(userWith("Requester")), "/requests");
});

test("the reset screen is public and the administration screens are not", () => {
  assert.equal(matchRoute("/reset-password").public, true);
  for (const path of ["/reports", "/admin/users", "/admin/categories"]) assert.ok(!matchRoute(path).public && matchRoute(path).permission, path);
});

test("FR-023: the breakdown becomes categories by statuses with totals both ways, missing pairs counting zero", () => {
  const t = pivot([
    { category: "Water", status: "New", count: 3 },
    { category: "Lighting", status: "Closed", count: 2 },
    { category: "Water", status: "Closed", count: 1 },
    { category: "Lighting", status: "New", count: 4 },
    { category: "Lighting", status: "In Progress", count: 5 },
  ]);
  assert.deepEqual(t.statuses, ["New", "In Progress", "Closed"], "only statuses present, in the status model's order");
  assert.deepEqual(t.rows, [
    { category: "Lighting", counts: [4, 5, 2], total: 11 },
    { category: "Water", counts: [3, 0, 1], total: 4 },
  ]);
  assert.deepEqual(t.columnTotals, [7, 5, 3]);
  assert.equal(t.total, 15);
});

test("FR-023: a pair sent twice is added, and a bad count is treated as zero rather than breaking the totals", () => {
  const t = pivot([
    { category: "Water", status: "New", count: 2 },
    { category: "Water", status: "New", count: 3 },
    { category: "Water", status: "Closed", count: -1 },
    { category: "Water", status: "Rejected", count: "x" },
  ]);
  assert.deepEqual(t.rows[0].counts, [5, 0, 0]);
  assert.equal(t.total, 5);
  assert.deepEqual(pivot([]), { statuses: [], rows: [], columnTotals: [], total: 0 });
  assert.equal(STATUS_ORDER.length, 7);
});

test("FR-022: the default period is the 30 days ending today in South African time", () => {
  // 23:30 UTC on 5 October is already 6 October in Johannesburg.
  assert.deepEqual(defaultPeriod(new Date(Date.UTC(2026, 9, 5, 23, 30))), { from: "2026-09-07", to: "2026-10-06" });
  assert.deepEqual(defaultPeriod(new Date(Date.UTC(2026, 9, 6, 8, 0))), { from: "2026-09-07", to: "2026-10-06" });
});

test("FR-022: a period must have both dates and must not end before it starts", () => {
  assert.equal(periodProblem({ from: "2026-10-01", to: "2026-10-06" }), null);
  assert.equal(periodProblem({ from: "2026-10-06", to: "2026-10-06" }), null);
  assert.match(periodProblem({ from: "2026-10-06", to: "2026-10-01" }), /on or after/);
  assert.match(periodProblem({ from: "", to: "2026-10-01" }), /both/);
  assert.match(periodProblem({ from: "06/10/2026", to: "2026-10-01" }), /both/);
});

test("FR-024: ages read as whole days", () => {
  assert.equal(ageText(1), "1 day");
  assert.equal(ageText(0), "0 days");
  assert.equal(ageText(12), "12 days");
});
