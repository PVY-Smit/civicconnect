// Tests for the authorisation policy (ADR-006, FR-002, FR-011 to FR-013, NFR-005).
// The expected permissions are read from a fixture exported from the Access Matrix register, so
// every cell of the matrix is a test case, as NFR-005 requires.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  FUNCTIONS,
  MATRIX_CONFLICTS,
  ROLES,
  actionEntryScope,
  authoriseTransition,
  permits,
  requestScope,
  scopedWhere,
} from "../src/modules/authorisation-policy/policy.js";

const matrix = JSON.parse(readFileSync(new URL("./fixtures/access-matrix.json", import.meta.url), "utf8"));
const keyFor = Object.fromEntries(Object.entries(FUNCTIONS).map(([key, label]) => [label, key]));
const actor = (role, extra = {}) => ({ id: `u-${role.toLowerCase()}`, role, categoryIds: ["c1"], ...extra });

// A minimal evaluator for the query conditions the policy returns, so the tests can check that the
// condition and the single-request check select exactly the same requests.
function evaluate(where, record) {
  return Object.entries(where).every(([field, cond]) => {
    if (field === "AND") return cond.every((w) => evaluate(w, record));
    if (field === "OR") return cond.some((w) => evaluate(w, record));
    if (cond && typeof cond === "object" && "in" in cond) return cond.in.includes(record[field]);
    return record[field] === cond;
  });
}

const REQUESTS = [
  { id: "r1", requesterId: "u-requester", categoryId: "c1" },
  { id: "r2", requesterId: "u-other", categoryId: "c1" },
  { id: "r3", requesterId: "u-other", categoryId: "c2" },
  { id: "r4", requesterId: "u-staff", categoryId: "c2" },
  { id: "r5", requesterId: "u-manager", categoryId: "c3" },
];

test("the policy knows every function in the Access Matrix register, and no others", () => {
  assert.deepEqual(matrix.functions.map((f) => f.function).sort(), Object.values(FUNCTIONS).sort());
  assert.deepEqual(matrix.roles, [...ROLES]);
});

test("every role and function pair matches the Access Matrix, except the recorded conflicts (NFR-005)", () => {
  const conflict = (fn, role) => MATRIX_CONFLICTS.some((c) => c.fn === fn && c.role === role);
  let cells = 0;
  for (const row of matrix.functions) {
    const fn = keyFor[row.function];
    for (const role of ROLES) {
      const expected = conflict(fn, role) ? false : row[role];
      assert.equal(permits(actor(role), fn), expected, `${role}: ${row.function}`);
      cells++;
    }
  }
  assert.equal(cells, matrix.functions.length * ROLES.length);
});

test("each recorded conflict is a cell the matrix grants and the policy denies, so a corrected matrix is noticed", () => {
  for (const { fn, role } of MATRIX_CONFLICTS) {
    const row = matrix.functions.find((f) => f.function === FUNCTIONS[fn]);
    assert.equal(row[role], true, `the matrix no longer grants ${role} ${fn}: remove the conflict entry`);
    assert.equal(permits(actor(role), fn), false);
  }
});

test("nobody may edit or delete an audit entry (FR-026)", () => {
  for (const role of ROLES) assert.equal(permits(actor(role), "editAuditEntry"), false);
});

test("a Requester's scope holds only the requests they submitted (FR-012)", () => {
  const scope = requestScope(actor("Requester"));
  assert.deepEqual(REQUESTS.filter(scope.matches).map((r) => r.id), ["r1"]);
});

test("Staff see their authorised categories and their own requests, and nothing else (FR-013)", () => {
  const scope = requestScope(actor("Staff"));
  assert.deepEqual(REQUESTS.filter(scope.matches).map((r) => r.id), ["r1", "r2", "r4"]);
});

test("a Coordinator sees every category (FR-013)", () => {
  assert.equal(REQUESTS.filter(requestScope(actor("Coordinator")).matches).length, REQUESTS.length);
});

test("the query condition and the single-request check select the same requests for every role", () => {
  for (const role of ROLES) {
    const scope = requestScope(actor(role));
    for (const r of REQUESTS) assert.equal(evaluate(scope.where, r), scope.matches(r), `${role} on ${r.id}`);
    const combined = scopedWhere(actor(role), { categoryId: "c1" });
    for (const r of REQUESTS) assert.equal(evaluate(combined, r), r.categoryId === "c1" && scope.matches(r), `${role} on ${r.id}, combined`);
  }
});

test("a Requester sees only requester-visible action entries, and staff roles see all (FR-011, FR-017)", () => {
  const entries = [{ visibility: "internal" }, { visibility: "requester-visible" }];
  assert.deepEqual(entries.filter(actionEntryScope(actor("Requester")).matches), [{ visibility: "requester-visible" }]);
  for (const role of ["Staff", "Coordinator", "Manager"]) assert.equal(entries.filter(actionEntryScope(actor(role)).matches).length, 2);
});

test("a transition is authorised only for its roles, and only on a request in scope", () => {
  const resolve = { from: "In Progress", to: "Resolved", roles: ["Staff", "Coordinator"] };
  assert.equal(authoriseTransition(actor("Staff"), REQUESTS[1], resolve), true);
  assert.equal(authoriseTransition(actor("Staff"), REQUESTS[2], resolve), false, "outside Staff categories");
  assert.equal(authoriseTransition(actor("Requester"), REQUESTS[0], resolve), false, "role not in the transition");
  assert.equal(authoriseTransition(actor("Coordinator"), REQUESTS[4], resolve), true);
});

test("accepting an unassigned request needs it in the actor's categories, even if they submitted it (FR-015)", () => {
  const accept = { from: "New", to: "In Progress", roles: ["Staff"], scope: "category" };
  assert.equal(authoriseTransition(actor("Staff"), REQUESTS[1], accept), true);
  assert.equal(authoriseTransition(actor("Staff"), REQUESTS[3], accept), false, "own request outside their categories");
});

test("an unknown role is denied everything", () => {
  const stranger = { id: "u-x", role: "Visitor", categoryIds: ["c1"] };
  assert.equal(REQUESTS.filter(requestScope(stranger).matches).length, 0);
  assert.equal(permits(stranger, "submitRequest"), false);
});
