// State transition testing (FR-016, FR-025, ADR-005) at the API boundary (#121).
//
// Every ordered pair of the seven statuses, 49 in all, is sent to the status endpoint. A pair in the
// Status Model succeeds for a role the model names, and leaves exactly the history and audit rows it
// should. Every other pair answers 409 for every role, with the status, history and audit untouched. A
// target that is not a status at all is a 400. The pairs come from the transition table, which the
// workflow tests already check against the Status Model register.

import { test } from "node:test";
import assert from "node:assert/strict";
import { ROLES } from "../src/modules/authorisation-policy/policy.js";
import { STATUSES, TRANSITIONS } from "../src/modules/workflow-status/transition-table.js";
import { BY_ROLE, createApi, USERS } from "./support/api.js";

const FULL_CHANGE = Object.freeze({ assigneeId: USERS.staffSecond.id, reason: "Recorded for the test.", resolutionSummary: "Replaced the lamp.", confirmed: true });
const inModel = (from, to) => TRANSITIONS.find((t) => t.from === from && t.to === to) ?? null;

// A request in the given state that the user can see: their own for a Requester, otherwise in category 10.
// Outside New it is assigned to the harness's Staff member, who is then the one who works on it.
function seeded(user, status) {
  const ctx = createApi();
  const { reference } = ctx.seed({
    status,
    assigneeId: status === "New" ? null : USERS.staff.id,
    requesterId: user.role === "Requester" ? user.id : USERS.otherRequester.id,
  });
  return { ...ctx, reference };
}

const PAIRS = STATUSES.flatMap((from) => STATUSES.map((to) => [from, to]));

test("the suite covers all 49 ordered pairs, and the model's moves are among them", () => {
  assert.equal(PAIRS.length, 49);
  for (const t of TRANSITIONS) assert.ok(PAIRS.some(([f, to]) => f === t.from && to === t.to));
});

for (const [from, to] of PAIRS) {
  const t = inModel(from, to);
  if (t) {
    for (const role of t.roles) {
      test(`FR-016 ${from} to ${to}: in the model, ${role} succeeds with its history and audit rows`, async () => {
        const { api, find, db, reference } = seeded(BY_ROLE[role], from);
        const before = structuredClone(find(reference));
        const res = await api.move(BY_ROLE[role], reference, to, FULL_CHANGE);
        assert.equal(res.status, 200, JSON.stringify(res.body));
        assert.equal(res.body.status, to);
        const after = find(reference);
        assert.equal(after.status, to);

        // A status change adds one history row; reassignment keeps the status and adds none (FR-025).
        const added = after.statusHistory.slice(before.statusHistory.length);
        if (from === to) assert.equal(added.length, 0);
        else assert.deepEqual(added.map((h) => [h.fromStatus, h.toStatus, h.actorId]), [[from, to, BY_ROLE[role].id]]);

        // One audit entry per audited field that changed, and nothing else (FR-025).
        const changed = ["status", "assigneeId"].filter((f) => (before[f] ?? null) !== (after[f] ?? null));
        assert.deepEqual(db.state.audit.map((e) => e.fieldChanged).sort(), changed.sort());
      });
    }
  } else {
    for (const role of ROLES) {
      test(`FR-016 ${from} to ${to}: not in the model, ${role} gets 409 and nothing changes`, async () => {
        const { api, find, db, reference } = seeded(BY_ROLE[role], from);
        const before = structuredClone(find(reference));
        const res = await api.move(BY_ROLE[role], reference, to, FULL_CHANGE);
        assert.equal(res.status, 409, JSON.stringify(res.body));
        assert.deepEqual(find(reference), before);
        assert.equal(db.state.audit.length, 0);
      });
    }
  }
}

test("FR-016: a target that is not a status is refused with 400 and changes nothing", async () => {
  for (const to of ["Archived", "new", "in progress", " Closed", "", null, undefined, 3, ["Closed"]]) {
    const { api, find, db, reference } = seeded(USERS.coordinator, "Resolved");
    const res = await api.move(USERS.coordinator, reference, to, FULL_CHANGE);
    assert.equal(res.status, 400, `to ${JSON.stringify(to)}`);
    assert.equal(find(reference).status, "Resolved");
    assert.equal(db.state.audit.length, 0);
  }
});

test("FR-016: Closed and Rejected are final; no move leaves them", async () => {
  for (const from of ["Closed", "Rejected"]) {
    assert.equal(TRANSITIONS.filter((t) => t.from === from).length, 0);
    for (const to of STATUSES) {
      const { api, find, reference } = seeded(USERS.coordinator, from);
      assert.equal((await api.move(USERS.coordinator, reference, to, FULL_CHANGE)).status, 409);
      assert.equal(find(reference).status, from);
    }
  }
});

// A path through the model, each move made by the role that would make it, as one request's life.
test("FR-016, FR-025: a request's whole life through the endpoint leaves its path in the history", async () => {
  const { api, seed, find, db } = createApi();
  const { reference } = seed({ status: "New", requesterId: USERS.requester.id });
  const { coordinator, staff, staffSecond } = USERS;
  const path = [
    [coordinator, "Assigned", { assigneeId: staff.id }],
    [coordinator, "Assigned", { assigneeId: staffSecond.id }],
    [staffSecond, "In Progress"],
    [staffSecond, "On Hold", { reason: "Waiting for a part." }],
    [staffSecond, "In Progress", { reason: "The part arrived." }],
    [staffSecond, "Resolved", { resolutionSummary: "Replaced the lamp." }],
    [coordinator, "In Progress", { reason: "The light failed again." }],
    [staffSecond, "Resolved", { resolutionSummary: "Replaced the fitting." }],
    [coordinator, "Closed", { confirmed: true }],
  ];
  for (const [who, to, change] of path) {
    const res = await api.move(who, reference, to, change);
    assert.equal(res.status, 200, `${who.name} to ${to}: ${JSON.stringify(res.body)}`);
  }
  assert.deepEqual(
    find(reference).statusHistory.map((h) => h.toStatus),
    ["New", "Assigned", "In Progress", "On Hold", "In Progress", "Resolved", "In Progress", "Resolved", "Closed"],
  );
  assert.equal(find(reference).assigneeId, staffSecond.id);
  assert.equal(find(reference).resolutionSummary, "Replaced the fitting.");
  // 8 status changes and 2 assignee changes, one audit entry each (FR-025).
  assert.equal(db.state.audit.length, 10);
});
