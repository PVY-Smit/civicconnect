// The workflow service: status changes, priority and action entries on a request (FR-015 to FR-021,
// FR-025, ADR-005, ADR-006, ADR-007).
//
// Every operation follows the same order. An actor is required: the routes sit behind authenticate
// (#111), and an operation called without one refuses rather than fails. The request is loaded with the
// authorisation policy's scope, so a request the actor may not see is "not found" and nothing about it is
// disclosed (FR-012). The decision comes from the transition table and the policy (ADR-005, ADR-006).
// The change is written in one transaction with its status history row and exactly one audit entry per
// changed field (FR-025, ADR-001 rule 3): if any write fails, none of them is kept.
//
// The update inside the transaction is conditional on the values the decision was made against. If
// another user changed the request in between, nothing is written and the caller is told to reload,
// so two people cannot both move the same request out of the same state.
//
// Text the user types (a reason, a resolution summary, an action entry) follows the shared text rules
// (src/shared/text.js), as a submission does (#112): at most TEXT_MAX characters, counted as PostgreSQL
// counts them, and no control characters other than line breaks and tabs.
//
// The store is passed in: requests.findOne and users.findById are persistence queries, and
// store.transaction runs a function with tx.updateRequest, tx.appendStatusHistory, tx.appendAudit and
// tx.appendActionEntry, rolling all of them back if it throws.

import { authoriseTransition, permits, scopedWhere } from "../authorisation-policy/policy.js";
import { auditEntriesFor } from "../audit/audit.js";
import { isReference } from "../request-capture/reference.js";
import { characters, hasControlCharacter } from "../../shared/text.js";
import { checkTransition } from "./transitions.js";

// Proposed in #113 alongside DEC-017, since the M1 baseline gives no priority scale. The same three
// levels as reported urgency, so a Coordinator compares like with like (DEC-002).
export const PRIORITY_LEVELS = Object.freeze(["Low", "Medium", "High"]);
export const VISIBILITIES = Object.freeze(["internal", "requester-visible"]);
export const TEXT_MAX = 4000;
export const ACTION_ENTRY_MAX = TEXT_MAX;

const NOT_SIGNED_IN = Object.freeze({ ok: false, code: "not-signed-in" });
const CONFLICT = Object.freeze({ ok: false, code: "conflict", message: "This request was changed by someone else. Reload it and try again." });

class ConflictError extends Error {}

// Only the reference format reaches a lookup, as in the request detail (#112).
const findInScope = (actor, reference, requests) =>
  isReference(reference) ? requests.findOne({ where: scopedWhere(actor, { reference }) }) : null;

const trimmed = (v) => (typeof v === "string" ? v.trim() : "");

// The problem with a typed text, or null. Whether the text is required is the caller's rule (or the
// move's guard); this checks only what can be stored.
function textProblem(label, value) {
  if (hasControlCharacter(value, { multiline: true })) return `${label} cannot contain control characters other than line breaks and tabs.`;
  const length = characters(value);
  if (length > TEXT_MAX) return `${label} must be at most ${TEXT_MAX} characters; it is ${length}.`;
  return null;
}

// A single id, as a string or a finite number. String() would turn ["5"] or an object with a toString
// into "5", so anything else is refused before it reaches a lookup or a write.
const isId = (v) => (typeof v === "string" && v.trim() !== "") || (typeof v === "number" && Number.isFinite(v));

// Whether the move nominates an assignee: a Coordinator assigning or reassigning (FR-015). Staff
// accepting an unassigned request become its assignee instead.
const nominatesAssignee = (request, to) => to === "Assigned" && (request.status === "New" || request.status === "Assigned");

// FR-015: a request is assigned to a Staff member, who must be active and authorised for its category.
async function findAssignee(assigneeId, request, users) {
  const user = await users.findById(assigneeId);
  const ok = user && user.active && user.role === "Staff" && (user.categoryIds ?? []).map(String).includes(String(request.categoryId));
  return ok ? user : null;
}

export async function changeStatus({ actor, reference, to, change = {} }, { requests, users, store }) {
  if (!actor) return NOT_SIGNED_IN;
  const request = await findInScope(actor, reference, requests);
  if (!request) return { ok: false, code: "not-found" };

  const decision = checkTransition({ actor, request, to, change, authorise: authoriseTransition });
  if (!decision.ok) return { ok: false, code: decision.code, message: decision.message };

  const errors = {};
  for (const [field, label] of [["reason", "The reason"], ["resolutionSummary", "The resolution summary"]]) {
    if (typeof change[field] === "string") {
      const problem = textProblem(label, change[field].trim());
      if (problem) errors[field] = problem;
    }
  }
  if (nominatesAssignee(request, to) && !isId(change.assigneeId)) errors.assigneeId = "Choose the Staff member to assign from the list.";
  if (Object.keys(errors).length > 0) return { ok: false, code: "invalid", errors };

  const before = { status: request.status, assigneeId: request.assigneeId ?? null };
  let assigneeId = before.assigneeId;
  if (nominatesAssignee(request, to)) {
    const user = await findAssignee(change.assigneeId, request, users);
    if (!user) return { ok: false, code: "guard-failed", message: "The assignee must be an active Staff member authorised for this request's category." };
    assigneeId = user.id; // the store's own id, never the value the client sent
  } else if (request.status === "New" && to === "In Progress") {
    assigneeId = actor.id; // FR-015: Staff accepting an unassigned request become its assignee
  }
  const after = { status: to, assigneeId };

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
    if (error instanceof ConflictError) return CONFLICT;
    throw error;
  }
  return { ok: true, request: { reference: request.reference, status: to, assigneeId: after.assigneeId } };
}

// FR-021: only a Coordinator sets or changes the priority, and the change is audited (FR-025). The
// urgency the Requester reported is never touched.
export async function setPriority({ actor, reference, priority }, { requests, store }) {
  if (!actor) return NOT_SIGNED_IN;
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
    if (error instanceof ConflictError) return CONFLICT;
    throw error;
  }
  return { ok: true, changed: true, request: { reference: request.reference, priority } };
}

// FR-017, DEC-003: an action entry is dated, attributed, and its visibility is chosen explicitly every
// time. There is no default, so a missing choice is refused rather than guessed.
//
// An entry can be recorded at any status, Closed and Rejected included: a note made after closure, such
// as a follow-up call, still belongs on the request's record. A requester-visible entry on a closed
// request therefore shows the Requester that the request was updated (FR-029). If the team decides that
// a closed request takes no further entries, the rule goes here.
export async function recordActionEntry({ actor, reference, body, visibility }, { requests, store }) {
  if (!actor) return NOT_SIGNED_IN;
  const request = await findInScope(actor, reference, requests);
  if (!request) return { ok: false, code: "not-found" };
  if (!permits(actor, "recordActionEntry")) return { ok: false, code: "not-authorised", message: "You are not authorised to do this." };

  const errors = {};
  const text = trimmed(body);
  if (!text) errors.body = "Entry text is required.";
  else {
    const problem = textProblem("Entry text", text);
    if (problem) errors.body = problem;
  }
  if (!VISIBILITIES.includes(visibility)) errors.visibility = "Choose who can see this entry: internal or requester-visible.";
  if (Object.keys(errors).length > 0) return { ok: false, code: "invalid", errors };

  const saved = await store.transaction((tx) =>
    tx.appendActionEntry({ requestId: request.id, authorId: actor.id, body: text, visibility }),
  );
  return { ok: true, entry: { reference: request.reference, visibility, createdAt: saved?.createdAt ?? null } };
}
