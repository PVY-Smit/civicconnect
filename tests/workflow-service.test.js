// Tests for the workflow service (FR-015 to FR-021, FR-025, FR-026, ADR-001 rule 3, ADR-005 to ADR-007).
//
// The store is a fake with real transaction behaviour: a function that throws inside store.transaction
// leaves nothing behind. That is what lets these tests check that a status change and its audit entry
// are written together or not at all. The PostgreSQL versions are under #121.

import { test } from "node:test";
import assert from "node:assert/strict";
import { AUDITED_FIELDS, auditEntriesFor, auditEntry } from "../src/modules/audit/audit.js";
import * as auditModule from "../src/modules/audit/audit.js";
import { changeStatus, PRIORITY_LEVELS, recordActionEntry, setPriority } from "../src/modules/workflow-status/service.js";
import { createWorkflowHandlers } from "../src/modules/workflow-status/http.js";
import { authoriseTransition } from "../src/modules/authorisation-policy/policy.js";
import { TRANSITIONS } from "../src/modules/workflow-status/transition-table.js";

const USERS = [
  { id: 1, role: "Requester", active: true, categoryIds: [] },
  { id: 2, role: "Requester", active: true, categoryIds: [] },
  { id: 3, role: "Coordinator", active: true, categoryIds: [] },
  { id: 4, role: "Manager", active: true, categoryIds: [10] },
  { id: 5, role: "Staff", active: true, categoryIds: [10] },
  { id: 6, role: "Staff", active: true, categoryIds: [11] },
  { id: 7, role: "Staff", active: false, categoryIds: [10] },
];
const actor = (id) => {
  const u = USERS.find((x) => x.id === id);
  return { id: u.id, role: u.role, categoryIds: u.categoryIds };
};
const [REQ, REQ2, COORD, MANAGER, STAFF, STAFF_OTHER, STAFF_INACTIVE] = [1, 2, 3, 4, 5, 6, 7].map(actor);

function evaluate(where, record) {
  return Object.entries(where).every(([field, cond]) => {
    if (field === "AND") return cond.every((w) => evaluate(w, record));
    if (field === "OR") return cond.some((w) => evaluate(w, record));
    if (cond && typeof cond === "object" && "in" in cond) return cond.in.map(String).includes(String(record[field]));
    return String(record[field]) === String(cond);
  });
}

// A store whose transactions really roll back. failOn names a tx operation that throws.
function fakeStore({ status = "New", assigneeId = null, priority = null, failOn = null } = {}) {
  const state = {
    requests: [
      { id: 100, reference: "CC-000001", requesterId: 1, categoryId: 10, status, assigneeId, priority, reportedUrgency: "High", resolutionSummary: null },
    ],
    history: [],
    audit: [],
    entries: [],
  };
  const fail = (op) => {
    if (failOn === op) throw new Error(`simulated failure in ${op}`);
  };
  const tx = {
    async updateRequest({ id, expect }, data) {
      fail("updateRequest");
      const row = state.requests.find((r) => r.id === id);
      const matches = Object.entries(expect).every(([k, v]) => (row[k] ?? null) === (v ?? null));
      if (!matches) return 0;
      Object.assign(row, data);
      return 1;
    },
    async appendStatusHistory(row) {
      fail("appendStatusHistory");
      state.history.push(row);
    },
    async appendAudit(entry) {
      fail("appendAudit");
      state.audit.push(entry);
    },
    async appendActionEntry(entry) {
      fail("appendActionEntry");
      const saved = { ...entry, createdAt: new Date(Date.UTC(2026, 9, 7, 9)) };
      state.entries.push(saved);
      return saved;
    },
  };
  const deps = {
    requests: { findOne: async ({ where }) => structuredClone(state.requests.find((r) => evaluate(where, r)) ?? null) },
    users: { findById: async (id) => USERS.find((u) => String(u.id) === String(id)) ?? null },
    store: {
      async transaction(fn) {
        const snapshot = structuredClone(state);
        try {
          return await fn(tx);
        } catch (error) {
          Object.assign(state, snapshot);
          throw error;
        }
      },
    },
  };
  return { state, deps, row: () => state.requests[0] };
}

const move = (s, who, to, change = {}) => changeStatus({ actor: who, reference: "CC-000001", to, change }, s.deps);

// ---- status changes (FR-015, FR-016, FR-018 to FR-020, FR-025) ----

test("FR-015, FR-025: assigning a new request writes the status, one history row and one audit entry for each changed field", async () => {
  const s = fakeStore();
  const result = await move(s, COORD, "Assigned", { assigneeId: 5 });
  assert.equal(result.ok, true);
  assert.equal(s.row().status, "Assigned");
  assert.equal(s.row().assigneeId, 5);
  assert.deepEqual(s.state.history, [{ requestId: 100, fromStatus: "New", toStatus: "Assigned", actorId: 3, reason: null }]);
  assert.deepEqual(s.state.audit, [
    { requestId: 100, actorId: 3, fieldChanged: "status", previousValue: "New", newValue: "Assigned" },
    { requestId: 100, actorId: 3, fieldChanged: "assigneeId", previousValue: null, newValue: 5 },
  ]);
});

test("FR-015: Staff accepting an unassigned request in their category become its assignee", async () => {
  const s = fakeStore();
  const result = await move(s, STAFF, "In Progress");
  assert.equal(result.ok, true);
  assert.equal(s.row().assigneeId, 5);
  assert.deepEqual(s.state.audit.map((a) => a.fieldChanged), ["status", "assigneeId"]);
});

test("FR-015: a request can only be assigned to an active Staff member authorised for its category", async () => {
  for (const [assigneeId, why] of [[1, "a Requester"], [7, "inactive Staff"], [6, "Staff in another category"], [999, "nobody"]]) {
    const s = fakeStore();
    const result = await move(s, COORD, "Assigned", { assigneeId });
    assert.equal(result.code, "guard-failed", why);
    assert.equal(s.row().status, "New", why);
    assert.equal(s.state.audit.length + s.state.history.length, 0, why);
  }
});

test("FR-015, FR-025: reassigning changes only the assignee, with one audit entry and no status history row", async () => {
  const s = fakeStore({ status: "Assigned", assigneeId: 5 });
  USERS.push({ id: 8, role: "Staff", active: true, categoryIds: [10] });
  try {
    const result = await move(s, COORD, "Assigned", { assigneeId: 8 });
    assert.equal(result.ok, true);
    assert.equal(s.state.history.length, 0);
    assert.deepEqual(s.state.audit, [{ requestId: 100, actorId: 3, fieldChanged: "assigneeId", previousValue: 5, newValue: 8 }]);
  } finally {
    USERS.pop();
  }
});

test("FR-018: resolving needs a summary; without one nothing is written, with one it is stored trimmed", async () => {
  const s = fakeStore({ status: "In Progress", assigneeId: 5 });
  const refused = await move(s, STAFF, "Resolved", { resolutionSummary: "   " });
  assert.equal(refused.code, "guard-failed");
  assert.equal(s.state.audit.length, 0);
  const done = await move(s, STAFF, "Resolved", { resolutionSummary: "  Lamp replaced.  " });
  assert.equal(done.ok, true);
  assert.equal(s.row().resolutionSummary, "Lamp replaced.");
  assert.equal(s.state.audit.length, 1);
});

test("FR-019: only a Coordinator or Manager closes a resolved request, and only when confirmed", async () => {
  for (const [who, expected] of [[COORD, true], [MANAGER, true], [STAFF, "not-authorised"], [REQ, "not-authorised"]]) {
    const s = fakeStore({ status: "Resolved", assigneeId: 5 });
    const result = await move(s, who, "Closed", { confirmed: true });
    assert.equal(result.ok === true ? true : result.code, expected, who.role);
  }
  const s = fakeStore({ status: "Resolved", assigneeId: 5 });
  assert.equal((await move(s, COORD, "Closed", {})).code, "guard-failed");
});

test("FR-020: a Coordinator rejects with a reason kept on the history row; no reason, or a Manager, is refused", async () => {
  const s = fakeStore();
  assert.equal((await move(s, COORD, "Rejected", {})).code, "guard-failed");
  assert.equal((await move(s, MANAGER, "Rejected", { reason: "Duplicate" })).code, "not-authorised", "CR-002");
  const ok = await move(s, COORD, "Rejected", { reason: "  Duplicate of CC-000002.  " });
  assert.equal(ok.ok, true);
  assert.equal(s.state.history[0].reason, "Duplicate of CC-000002.");
});

test("FR-016: a move outside the status model is refused and nothing is written", async () => {
  for (const to of ["Closed", "Resolved", "On Hold", "New", "Archived"]) {
    const s = fakeStore();
    const result = await move(s, COORD, to, { confirmed: true, resolutionSummary: "x", reason: "x" });
    assert.ok(["not-in-model", "unknown-status"].includes(result.code), `${to}: ${result.code}`);
    assert.equal(s.row().status, "New");
    assert.equal(s.state.audit.length + s.state.history.length, 0);
  }
});

test("FR-012, FR-016: a Requester cannot move their own request, and another requester's request is not found", async () => {
  const s = fakeStore({ status: "In Progress", assigneeId: 5 });
  assert.equal((await move(s, REQ, "Resolved", { resolutionSummary: "fixed it myself" })).code, "not-authorised");
  assert.equal((await move(s, REQ2, "Resolved", { resolutionSummary: "x" })).code, "not-found");
  assert.equal((await move(s, STAFF_OTHER, "On Hold", { reason: "x" })).code, "not-found", "Staff outside the category");
  assert.equal(s.row().status, "In Progress");
});

// ---- the transaction (ADR-001 rule 3, NFR-011) ----

test("ADR-001 rule 3: if the audit entry cannot be written, the status change and its history row are rolled back", async () => {
  for (const failOn of ["appendAudit", "appendStatusHistory"]) {
    const s = fakeStore({ failOn });
    await assert.rejects(move(s, COORD, "Assigned", { assigneeId: 5 }), /simulated failure/);
    assert.equal(s.row().status, "New", failOn);
    assert.equal(s.row().assigneeId, null, failOn);
    assert.deepEqual([s.state.history, s.state.audit], [[], []], failOn);
  }
});

test("a change made by someone else after the request was read is refused, and nothing is written", async () => {
  const s = fakeStore({ status: "Assigned", assigneeId: 5 });
  const stale = s.deps.requests.findOne;
  s.deps.requests.findOne = async (q) => {
    const seen = await stale(q);
    s.row().status = "In Progress"; // another user moves it between our read and our write
    return seen;
  };
  const result = await move(s, STAFF, "In Progress");
  assert.equal(result.code, "conflict");
  assert.deepEqual([s.state.history, s.state.audit], [[], []]);
});

// ---- priority (FR-021, FR-025) ----

test("FR-021, FR-025: a Coordinator sets the priority with one audit entry, and the reported urgency is untouched", async () => {
  const s = fakeStore();
  const result = await setPriority({ actor: COORD, reference: "CC-000001", priority: "Low" }, s.deps);
  assert.equal(result.ok, true);
  assert.equal(s.row().priority, "Low");
  assert.equal(s.row().reportedUrgency, "High");
  assert.deepEqual(s.state.audit, [{ requestId: 100, actorId: 3, fieldChanged: "priority", previousValue: null, newValue: "Low" }]);
});

test("FR-021: Staff, a Manager and the Requester are refused when they try to set the priority", async () => {
  for (const who of [STAFF, MANAGER, REQ]) {
    const s = fakeStore();
    const result = await setPriority({ actor: who, reference: "CC-000001", priority: "High" }, s.deps);
    assert.equal(result.code, "not-authorised", who.role);
    assert.equal(s.row().priority, null);
    assert.equal(s.state.audit.length, 0);
  }
});

test("a priority outside the scale is refused, and setting the same priority again writes no audit entry", async () => {
  const s = fakeStore({ priority: "Medium" });
  for (const bad of ["Urgent", "medium", null]) {
    assert.equal((await setPriority({ actor: COORD, reference: "CC-000001", priority: bad }, s.deps)).code, "invalid", String(bad));
  }
  const same = await setPriority({ actor: COORD, reference: "CC-000001", priority: "Medium" }, s.deps);
  assert.deepEqual([same.ok, same.changed, s.state.audit.length], [true, false, 0]);
  assert.deepEqual(PRIORITY_LEVELS, ["Low", "Medium", "High"]);
});

// ---- action entries (FR-017, DEC-003) ----

test("FR-017, DEC-003: an action entry without an explicit visibility is refused; there is no default", async () => {
  for (const visibility of [undefined, "", "public", "Internal"]) {
    const s = fakeStore();
    const result = await recordActionEntry({ actor: STAFF, reference: "CC-000001", body: "Called the requester.", visibility }, s.deps);
    assert.equal(result.code, "invalid", String(visibility));
    assert.match(result.errors.visibility, /internal or requester-visible/);
    assert.equal(s.state.entries.length, 0);
  }
});

test("FR-017: Staff record entries of either visibility with the author and text; entries are not audit entries", async () => {
  const s = fakeStore();
  for (const visibility of ["internal", "requester-visible"]) {
    const result = await recordActionEntry({ actor: STAFF, reference: "CC-000001", body: `  ${visibility} note  `, visibility }, s.deps);
    assert.equal(result.ok, true);
  }
  assert.deepEqual(s.state.entries.map((e) => [e.authorId, e.body, e.visibility]), [[5, "internal note", "internal"], [5, "requester-visible note", "requester-visible"]]);
  assert.equal(s.state.audit.length, 0);
});

test("a Requester cannot record an action entry, and an empty or oversized entry is refused", async () => {
  const s = fakeStore();
  assert.equal((await recordActionEntry({ actor: REQ, reference: "CC-000001", body: "hello", visibility: "requester-visible" }, s.deps)).code, "not-authorised");
  assert.match((await recordActionEntry({ actor: STAFF, reference: "CC-000001", body: "  ", visibility: "internal" }, s.deps)).errors.body, /required/);
  assert.match((await recordActionEntry({ actor: STAFF, reference: "CC-000001", body: "x".repeat(4001), visibility: "internal" }, s.deps)).errors.body, /at most 4000/);
  assert.equal((await recordActionEntry({ actor: STAFF, reference: "CC-000001", body: "x".repeat(4000), visibility: "internal" }, s.deps)).ok, true);
});

// ---- the audit module (FR-025, FR-026) ----

test("FR-026: the audit module offers no way to edit or delete an entry, and refuses entries that record nothing", () => {
  assert.deepEqual(Object.keys(auditModule).sort(), ["AUDITED_FIELDS", "auditEntriesFor", "auditEntry"]);
  assert.ok(Object.isFrozen(auditEntry({ requestId: 1, actorId: 1, field: "status", previousValue: "New", newValue: "Assigned" })));
  assert.throws(() => auditEntry({ requestId: 1, actorId: 1, field: "title", previousValue: "a", newValue: "b" }), /Not an audited field/);
  assert.throws(() => auditEntry({ requestId: 1, actorId: 1, field: "status", previousValue: "New", newValue: "New" }), /No change/);
});

test("FR-025: exactly one entry per audited field that changed, and none for unchanged or unaudited fields", () => {
  const entries = auditEntriesFor({
    requestId: 1,
    actorId: 3,
    before: { status: "New", assigneeId: null, priority: "Low", title: "a" },
    after: { status: "Assigned", assigneeId: 5, priority: "Low", title: "b" },
  });
  assert.deepEqual(entries.map((e) => e.fieldChanged), ["status", "assigneeId"]);
  assert.deepEqual(AUDITED_FIELDS, ["status", "assigneeId", "priority"]);
});

// ---- HTTP boundary ----

function fakeRes() {
  const res = { statusCode: null, body: undefined };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
}

test("the workflow routes answer 200, 403, 404, 409 and 422 for the matching outcomes", async () => {
  const cases = [
    { who: COORD, body: { to: "Assigned", assigneeId: 5 }, expect: 200 },
    { who: REQ, body: { to: "Assigned", assigneeId: 5 }, expect: 403 },
    { who: REQ2, body: { to: "Assigned", assigneeId: 5 }, expect: 404 },
    { who: COORD, body: { to: "Closed", confirmed: true }, expect: 409 },
    { who: COORD, body: { to: "Rejected" }, expect: 422 },
  ];
  for (const { who, body, expect } of cases) {
    const s = fakeStore();
    const res = fakeRes();
    await createWorkflowHandlers(s.deps).status({ actor: who, params: { reference: "CC-000001" }, body }, res);
    assert.equal(res.statusCode, expect, `${who.role} ${body.to}`);
  }
  const res = fakeRes();
  await createWorkflowHandlers(fakeStore().deps).status({ actor: REQ2, params: { reference: "CC-999999" }, body: { to: "Assigned" } }, res);
  assert.deepEqual(res.body, { error: "No request with that reference was found." });
});

// ---- the accept move without the scope load (#132 review) ----

test("FR-015: the policy alone refuses Staff accepting a New request outside their categories", () => {
  const accept = TRANSITIONS.find((t) => t.from === "New" && t.to === "In Progress");
  assert.equal(accept.scope, "category", "the table marks accept as category-scoped");
  const request = { id: 100, requesterId: 1, categoryId: 10, status: "New", assigneeId: null };
  assert.equal(authoriseTransition(STAFF, request, accept), true, "Staff in the category");
  assert.equal(authoriseTransition(STAFF_OTHER, request, accept), false, "Staff in another category");
  assert.equal(authoriseTransition(COORD, request, accept), false, "a Coordinator is not in the move's roles");
});

test("FR-015: if the scope load were bypassed, the accept is still refused and nothing is written", async () => {
  const s = fakeStore();
  s.deps.requests.findOne = async () => structuredClone(s.state.requests[0]); // ignores the scope condition
  const result = await move(s, STAFF_OTHER, "In Progress");
  assert.equal(result.code, "not-authorised");
  assert.equal(s.row().status, "New");
  assert.equal(s.row().assigneeId, null);
  assert.deepEqual([s.state.history, s.state.audit], [[], []]);
});
