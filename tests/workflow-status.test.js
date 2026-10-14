// Tests for the transition table and transition policy (ADR-005, FR-015 to FR-020).
// The expected transitions are read from a fixture exported from the Status Model register, so the
// table is checked against the controlled artefact rather than against a second copy of the rules.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { STATUSES, TRANSITIONS } from "../src/modules/workflow-status/transition-table.js";
import { allowedMoves, checkTransition, findTransition } from "../src/modules/workflow-status/transitions.js";

const register = JSON.parse(readFileSync(new URL("./fixtures/status-model.json", import.meta.url), "utf8"));
const ROLES = ["Requester", "Staff", "Coordinator", "Manager"];

// Stands in for the authorisation policy (ADR-006): the role check only. Record scope is the
// policy's own concern and is tested there.
const byRole = (actor, request, transition) => transition.roles.includes(actor.role);

const VALID_INPUT = { reason: "Recorded reason", resolutionSummary: "Fixed and verified", assigneeId: "u-other", confirmed: true };

function setup(from, to, role) {
  const actor = { id: "u-actor", role, categoryIds: ["c1"] };
  const request = { id: "r1", status: from, requesterId: "u-requester", categoryId: "c1", assigneeId: null };
  if (from !== "New") request.assigneeId = "u-actor";
  if (from === "Assigned" && to === "Assigned") request.assigneeId = "u-staff";
  const transition = findTransition(from, to);
  const change = {};
  for (const field of transition?.guard.requires ?? []) change[field] = VALID_INPUT[field];
  return { actor, request, change };
}

test("the table holds exactly the transitions in the Status Model register", () => {
  const table = TRANSITIONS.map((t) => ({ from: t.from, to: t.to, roles: [...t.roles] }));
  const expected = register.transitions.map((t) => ({ from: t.from, to: t.to, roles: t.roles }));
  assert.deepEqual(table, expected);
});

test("every status pair and role: allowed only where the model permits it, refused otherwise (FR-016)", () => {
  let allowed = 0;
  let refused = 0;
  for (const from of STATUSES) {
    for (const to of STATUSES) {
      for (const role of ROLES) {
        const { actor, request, change } = setup(from, to, role);
        const result = checkTransition({ actor, request, to, change, authorise: byRole });
        const permitted = register.transitions.some((t) => t.from === from && t.to === to && t.roles.includes(role));
        const inModel = register.transitions.some((t) => t.from === from && t.to === to);
        if (permitted) {
          assert.equal(result.ok, true, `${role}: ${from} to ${to} should be allowed`);
          allowed++;
        } else {
          assert.equal(result.ok, false, `${role}: ${from} to ${to} should be refused`);
          assert.equal(result.code, inModel ? "not-authorised" : "not-in-model");
          refused++;
        }
      }
    }
  }
  assert.equal(allowed + refused, STATUSES.length * STATUSES.length * ROLES.length);
  assert.equal(allowed, register.transitions.reduce((n, t) => n + t.roles.length, 0));
});

test("every guard that needs input refuses the move without it", () => {
  for (const t of TRANSITIONS.filter((x) => x.guard.requires.length > 0)) {
    const { actor, request } = setup(t.from, t.to, t.roles[0]);
    const result = checkTransition({ actor, request, to: t.to, change: {}, authorise: byRole });
    assert.equal(result.code, "guard-failed", `${t.from} to ${t.to} without ${t.guard.requires}`);
  }
});

test("Resolved needs a non-empty resolution summary (FR-018)", () => {
  const { actor, request } = setup("In Progress", "Resolved", "Staff");
  const result = checkTransition({ actor, request, to: "Resolved", change: { resolutionSummary: "   " }, authorise: byRole });
  assert.equal(result.code, "guard-failed");
  assert.match(result.message, /FR-018/);
});

test("rejection needs a reason (FR-020)", () => {
  for (const from of ["New", "Assigned", "On Hold"]) {
    const { actor, request } = setup(from, "Rejected", "Coordinator");
    const result = checkTransition({ actor, request, to: "Rejected", change: {}, authorise: byRole });
    assert.equal(result.code, "guard-failed", from);
    assert.match(result.message, /FR-020/);
  }
});

test("only an unassigned New request can be accepted (FR-015)", () => {
  const { actor, request } = setup("New", "In Progress", "Staff");
  request.assigneeId = "u-someone";
  assert.equal(checkTransition({ actor, request, to: "In Progress", authorise: byRole }).code, "guard-failed");
});

test("Staff who are not the assignee cannot begin work on an assigned request", () => {
  const { actor, request } = setup("Assigned", "In Progress", "Staff");
  request.assigneeId = "u-someone-else";
  assert.equal(checkTransition({ actor, request, to: "In Progress", authorise: byRole }).code, "guard-failed");
});

test("reassignment needs a different assignee (FR-025 audits it as an assignee change)", () => {
  const { actor, request } = setup("Assigned", "Assigned", "Coordinator");
  const same = checkTransition({ actor, request, to: "Assigned", change: { assigneeId: request.assigneeId }, authorise: byRole });
  assert.equal(same.code, "guard-failed");
});

test("an unauthorised actor is refused before the guard is evaluated", () => {
  const { actor, request } = setup("In Progress", "Resolved", "Requester");
  const result = checkTransition({ actor, request, to: "Resolved", change: {}, authorise: byRole });
  assert.equal(result.code, "not-authorised");
});

test("the interface is offered exactly the moves the table permits, with their inputs", () => {
  const { actor, request } = setup("In Progress", "Resolved", "Staff");
  const moves = allowedMoves({ actor, request, authorise: byRole });
  assert.deepEqual(moves.map((m) => m.to).sort(), ["On Hold", "Resolved"]);
  assert.deepEqual(moves.find((m) => m.to === "Resolved").requires, ["resolutionSummary"]);
});
