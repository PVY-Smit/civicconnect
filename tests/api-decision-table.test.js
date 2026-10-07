// Decision table (NFR-005, FR-002): every role against every function of the Access Matrix register,
// each cell made into a call at the API boundary that expects to succeed or to be refused (#121).
//
// The expected outcome of each cell is read from the register's fixture, never written here, so a change
// to the Access Matrix changes the expectations. A cell listed in MATRIX_CONFLICTS is one the register
// grants and the requirements refuse (#92); the policy denies it, so it is expected to be refused. Once
// CR-002 corrects the register (#136) the list is empty and the fixture alone decides.
//
// A refusal is a 403, except where a requirement says otherwise: a request outside the actor's scope is
// "not found" (404, FR-012), and an internal action entry the actor may not see is left out of the detail
// (FR-011). Each refused call is also checked to have written nothing.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FUNCTIONS, MATRIX_CONFLICTS, ROLES } from "../src/modules/authorisation-policy/policy.js";
import { TRANSITIONS } from "../src/modules/workflow-status/transition-table.js";
import { BY_ROLE, createApi, USERS, VALID_SUBMISSION } from "./support/api.js";

const matrix = JSON.parse(readFileSync(new URL("./fixtures/access-matrix.json", import.meta.url), "utf-8"));
const keyFor = Object.fromEntries(Object.entries(FUNCTIONS).map(([key, label]) => [label, key]));
const conflicted = (fn, role) => MATRIX_CONFLICTS.some((c) => c.fn === fn && c.role === role);

// A request the role can see: its own for a Requester, otherwise one in category 10, which every scoped
// user in the harness holds.
const ownerFor = (user) => (user.role === "Requester" ? user.id : USERS.otherRequester.id);
const FULL_CHANGE = Object.freeze({ assigneeId: USERS.staffSecond.id, reason: "Recorded for the test.", resolutionSummary: "Replaced the lamp.", confirmed: true });

// The probe for each function: makes the call and answers whether it was permitted, after checking that a
// refusal took the form the requirements give it and changed nothing.
const PROBES = {
  async submitRequest(user) {
    const { api, db } = createApi();
    const res = await api.submit(user, VALID_SUBMISSION);
    if (res.status === 201) return true;
    assert.equal(res.status, 403);
    assert.equal(db.state.requests.length, 0, "a refused submission saves nothing");
    return false;
  },

  async viewOwnRequests(user) {
    const { api } = createApi();
    const res = await api.listMine(user);
    if (res.status === 200) return true;
    assert.equal(res.status, 403);
    return false;
  },

  // A request someone else submitted, in category 10.
  async viewRequestsInScope(user) {
    const { api, seed } = createApi();
    const { reference } = seed({ requesterId: USERS.otherRequester.id });
    const res = await api.detail(user, reference);
    if (res.status === 200) return true;
    assert.equal(res.status, 404, "FR-012: refused as not found, never 403");
    return false;
  },

  // The actor's own request, holding one internal and one requester-visible entry.
  async viewInternalEntries(user) {
    const { api, seed } = createApi();
    const { reference } = seed({
      requesterId: user.id,
      entries: [
        { body: "Internal note", visibility: "internal" },
        { body: "Visible update", visibility: "requester-visible" },
      ],
    });
    const res = await api.detail(user, reference);
    assert.equal(res.status, 200);
    const bodies = res.body.request.actionEntries.map((e) => e.body);
    assert.ok(bodies.includes("Visible update"));
    return bodies.includes("Internal note");
  },

  async assignRequest(user) {
    return moveProbe(user, { status: "New" }, "Assigned");
  },

  async acceptRequest(user) {
    return moveProbe(user, { status: "New" }, "In Progress");
  },

  async closeRequest(user) {
    return moveProbe(user, { status: "Resolved", assigneeId: USERS.staff.id }, "Closed");
  },

  async rejectRequest(user) {
    return moveProbe(user, { status: "New" }, "Rejected");
  },

  // Permitted when the role can make at least one move of the status model through the endpoint. Every
  // move in the table is tried: each succeeds exactly when the table names the role, and is otherwise a
  // 403 that changes nothing.
  async changeStatus(user) {
    let any = false;
    for (const t of TRANSITIONS) {
      const allowed = await moveProbe(user, { status: t.from, assigneeId: t.from === "New" ? null : USERS.staff.id }, t.to);
      assert.equal(allowed, t.roles.includes(user.role), `${t.from} to ${t.to}`);
      any ||= allowed;
    }
    return any;
  },

  async setPriority(user) {
    const { api, seed, find, db } = createApi();
    const { reference } = seed({ requesterId: ownerFor(user) });
    const res = await api.priority(user, reference, "High");
    if (res.status === 200) return true;
    assert.equal(res.status, 403);
    assert.equal(find(reference).priority, null);
    assert.equal(db.state.audit.length, 0);
    return false;
  },

  async recordActionEntry(user) {
    const { api, seed, find } = createApi();
    const { reference } = seed({ requesterId: ownerFor(user) });
    const res = await api.entry(user, reference, "Checked the site.", "internal");
    if (res.status === 201) return true;
    assert.equal(res.status, 403);
    assert.equal(find(reference).actionEntries.length, 0);
    return false;
  },

  // Reached through the permission check their routes will use until #117 and #115 build the endpoints.
  viewManagementCounts: (user) => guardedProbe(user, "viewManagementCounts"),
  maintainCategories: (user) => guardedProbe(user, "maintainCategories"),
  manageUsers: (user) => guardedProbe(user, "manageUsers"),
  // FR-026: no endpoint edits or deletes an audit entry, and the permission check refuses everyone.
  editAuditEntry: (user) => guardedProbe(user, "editAuditEntry"),
};

async function moveProbe(user, state, to) {
  const { api, seed, find, db } = createApi();
  const { reference } = seed({ ...state, requesterId: ownerFor(user) });
  const res = await api.move(user, reference, to, FULL_CHANGE);
  if (res.status === 200) {
    assert.equal(find(reference).status, to);
    return true;
  }
  assert.equal(res.status, 403, `${state.status} to ${to}: ${JSON.stringify(res.body)}`);
  assert.equal(find(reference).status, state.status, "a refused move changes nothing");
  assert.equal(find(reference).statusHistory.length, 1);
  assert.equal(db.state.audit.length, 0);
  return false;
}

async function guardedProbe(user, fn) {
  const { api } = createApi();
  const res = await api.guarded(user, fn);
  if (res.status === 200) return true;
  assert.equal(res.status, 403);
  return false;
}

const ENDPOINT_PENDING = { viewManagementCounts: "#117", maintainCategories: "#115", manageUsers: "#115" };

test("the decision table covers every function in the register, each with a probe", () => {
  assert.deepEqual(matrix.functions.map((f) => keyFor[f.function]).sort(), Object.keys(PROBES).sort());
  assert.deepEqual(matrix.roles, [...ROLES]);
});

for (const row of matrix.functions) {
  const fn = keyFor[row.function];
  for (const role of ROLES) {
    const expected = row[role] && !conflicted(fn, role);
    const note = conflicted(fn, role) ? " (register grants it; refused under CR-002, #92)" : "";
    test(`NFR-005 decision table: ${role}, ${row.function}: ${expected ? "permitted" : "refused"}${note}`, async () => {
      assert.equal(await PROBES[fn](BY_ROLE[role]), expected);
    });
  }
}

for (const [fn, issue] of Object.entries(ENDPOINT_PENDING)) {
  test.todo(`NFR-005 decision table: ${FUNCTIONS[fn]} through its own endpoint, once ${issue} builds it`);
}

test("FR-001: without a session every call answers 401 and writes nothing", async () => {
  const { api, seed, find, db } = createApi();
  const { reference } = seed({ status: "Resolved", assigneeId: USERS.staff.id });
  const calls = [
    api.submit(null, VALID_SUBMISSION),
    api.listMine(null),
    api.detail(null, reference),
    api.move(null, reference, "Closed", FULL_CHANGE),
    api.priority(null, reference, "High"),
    api.entry(null, reference, "Text", "internal"),
    ...Object.keys(FUNCTIONS).map((fn) => api.guarded(null, fn)),
  ];
  for (const res of await Promise.all(calls)) assert.equal(res.status, 401);
  assert.equal(db.state.requests.length, 1);
  assert.equal(find(reference).status, "Resolved");
  assert.equal(db.state.audit.length, 0);
});
