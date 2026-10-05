// The workflow service: status changes, priority and action entries on a request (FR-015 to FR-021,
// FR-025, ADR-005, ADR-006, ADR-007).
//
// Every operation follows the same order. The request is loaded with the authorisation policy's scope,
// so a request the actor may not see is "not found" and nothing about it is disclosed (FR-012). The
// decision comes from the transition table and the policy (ADR-005, ADR-006). The change is written in
// one transaction with its status history row and exactly one audit entry per changed field (FR-025,
// ADR-001 rule 3): if any write fails, none of them is kept.
//
// The update inside the transaction is conditional on the values the decision was made against. If
// another user changed the request in between, nothing is written and the caller is told to reload,
// so two people cannot both move the same request out of the same state.
//
// The store is passed in: requests.findOne and users.findById are persistence queries, and
// store.transaction runs a function with tx.updateRequest, tx.appendStatusHistory, tx.appendAudit and
// tx.appendActionEntry, rolling all of them back if it throws.

import { authoriseTransition, permits, scopedWhere } from "../authorisation-policy/policy.js";
import { auditEntriesFor } from "../audit/audit.js";
import { checkTransition } from "./transitions.js";

// Proposed in #113 alongside DEC-017, since the M1 baseline gives no priority scale. The same three
// levels as reported urgency, so a Coordinator compares like with like (DEC-002).
export const PRIORITY_LEVELS = Object.freeze(["Low", "Medium", "High"]);
export const VISIBILITIES = Object.freeze(["internal", "requester-visible"]);
export const ACTION_ENTRY_MAX = 4000;

class ConflictError extends Error {}

const findInScope = (actor, reference, requests) =>
  typeof reference === "string" && reference ? requests.findOne({ where: scopedWhere(actor, { reference }) }) : null;

const trimmed = (v) => (typeof v === "string" ? v.trim() : "");

// The assignee a move gives the request: the nominated one when a Coordinator assigns or reassigns, the
// actor when Staff accept an unassigned request (FR-015), otherwise unchanged.
function assigneeAfter(request, to, change, actor) {
  if (request.status === "New" && to === "Assigned") return change.assigneeId;
  if (request.status === "Assigned" && to === "Assigned") return change.assigneeId;
  if (request.status === "New" && to === "In Progress") return actor.id;
  return request.assigneeId ?? null;
}

// FR-015: a request is assigned to a Staff member, who must be active and authorised for its category.
async function checkAssignee(assigneeId, request, users) {
  const user = await users.findById(assigneeId);
  const ok = user && user.active && user.role === "Staff" && (user.categoryIds ?? []).map(String).includes(String(request.categoryId));
  return ok ? null : "The assignee must be an active Staff member authorised for this request's category.";
}

export async function changeStatus({ actor, reference, to, change = {} }, { requests, users, store }) {
  const request = await findInScope(actor, reference, requests);
  if (!request) return { ok: false, code: "not-found" };

  const decision = checkTransition({ actor, request, to, change, authorise: authoriseTransition });
  if (!decision.ok) return { ok: false, code: decision.code, message: decision.message };

  const before = { status: request.status, assigneeId: request.assigneeId ?? null };
  const after = { status: to, assigneeId: assigneeAfter(request, to, change, actor) };
  if (after.assigneeId !== before.assigneeId && to !== "In Progress") {
    const problem = await checkAssignee(after.assigneeId, request, users);
    if (problem) return { ok: false, code: "guard-failed", message: problem };
  }

  const data = { ...after };
  if (to === "Resolved") data.resolutionSummary = trimmed(change.resolutionSummary); // FR-018
  const reason = trimmed(change.reason) || null; // FR-020: shown to the Requester on rejection

  try {
    await store.transaction(async (tx) => {
      const updated = await tx.updateRequest({ id: request.id, expect: before }, data);
      if (!updated) throw new ConflictError();
      if (before.status !== after.status) {
        await tx.appendStatusHistory({ requestId: request.id, fromStatus: before.status, toStatus: to, actorId: actor.id, reason });
      }
      for (const entry of auditEntriesFor({ requestId: request.id, actorId: actor.id, before, after })) {
        await tx.appendAudit(entry);
      }
    });
  } catch (error) {
    if (error instanceof ConflictError) return { ok: false, code: "conflict", message: "This request was changed by someone else. Reload it and try again." };
    throw error;
  }
  return { ok: true, request: { reference: request.reference, status: to, assigneeId: after.assigneeId } };
}

// FR-021: only a Coordinator sets or changes the priority, and the change is audited (FR-025). The
// urgency the Requester reported is never touched.
export async function setPriority({ actor, reference, priority }, { requests, store }) {
  const request = await findInScope(actor, reference, requests);
  if (!request) return { ok: false, code: "not-found" };
  if (!permits(actor, "setPriority")) return { ok: false, code: "not-authorised", message: "Only a Coordinator can set the priority." };
  if (!PRIORITY_LEVELS.includes(priority)) {
    return { ok: false, code: "invalid", errors: { priority: `Priority must be one of ${PRIORITY_LEVELS.join(", ")}.` } };
  }
  const before = { priority: request.priority ?? null };
  if (before.priority === priority) return { ok: true, changed: false, request: { reference: request.reference, priority } };

  try {
    await store.transaction(async (tx) => {
      const updated = await tx.updateRequest({ id: request.id, expect: before }, { priority });
      if (!updated) throw new ConflictError();
      for (const entry of auditEntriesFor({ requestId: request.id, actorId: actor.id, before, after: { priority } })) {
        await tx.appendAudit(entry);
      }
    });
  } catch (error) {
    if (error instanceof ConflictError) return { ok: false, code: "conflict", message: "This request was changed by someone else. Reload it and try again." };
    throw error;
  }
  return { ok: true, changed: true, request: { reference: request.reference, priority } };
}

// FR-017, DEC-003: an action entry is dated, attributed, and its visibility is chosen explicitly every
// time. There is no default, so a missing choice is refused rather than guessed.
export async function recordActionEntry({ actor, reference, body, visibility }, { requests, store }) {
  const request = await findInScope(actor, reference, requests);
  if (!request) return { ok: false, code: "not-found" };
  if (!permits(actor, "recordActionEntry")) return { ok: false, code: "not-authorised", message: "You are not authorised to do this." };

  const errors = {};
  const text = trimmed(body);
  if (!text) errors.body = "Entry text is required.";
  else if (text.length > ACTION_ENTRY_MAX) errors.body = `Entry text must be at most ${ACTION_ENTRY_MAX} characters; it is ${text.length}.`;
  if (!VISIBILITIES.includes(visibility)) errors.visibility = "Choose who can see this entry: internal or requester-visible.";
  if (Object.keys(errors).length > 0) return { ok: false, code: "invalid", errors };

  const saved = await store.transaction((tx) =>
    tx.appendActionEntry({ requestId: request.id, authorId: actor.id, body: text, visibility }),
  );
  return { ok: true, entry: { reference: request.reference, visibility, createdAt: saved?.createdAt ?? null } };
}
