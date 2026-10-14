// The transition policy (ADR-005): looks up a requested move in the transition table, asks the
// authorisation policy whether this actor may make it, and evaluates the move's guard.
//
// authorise is passed in rather than imported, so this module never decides who may act
// (ADR-001 rule 2). The service supplies the authorisation policy's function (ADR-006).

import { STATUSES, TRANSITIONS } from "./transition-table.js";

const byMove = new Map(TRANSITIONS.map((t) => [`${t.from}->${t.to}`, t]));

export function findTransition(from, to) {
  return byMove.get(`${from}->${to}`) ?? null;
}

// The order of the checks is deliberate. A move outside the model is refused before anything else
// (FR-016). Authorisation comes before the guard, so an actor who may not make a move learns
// nothing about what the move would have required (NFR-005).
export function checkTransition({ actor, request, to, change = {}, authorise }) {
  if (!STATUSES.includes(request.status) || !STATUSES.includes(to)) {
    return { ok: false, code: "unknown-status", message: `Unknown status: ${request.status} or ${to}.` };
  }
  const transition = findTransition(request.status, to);
  if (!transition) {
    return { ok: false, code: "not-in-model", message: `${request.status} to ${to} is not a permitted transition.` };
  }
  if (!authorise(actor, request, transition)) {
    return { ok: false, code: "not-authorised", message: "You are not authorised to make this change." };
  }
  const failure = transition.guard.check(request, change, actor);
  if (failure) {
    return { ok: false, code: "guard-failed", message: failure };
  }
  return { ok: true, transition };
}

// The moves the interface should offer this actor on this request, with the inputs each one needs.
// Guards that need input are not evaluated here, because the input does not exist yet.
export function allowedMoves({ actor, request, authorise }) {
  return TRANSITIONS.filter((t) => t.from === request.status && authorise(actor, request, t)).map((t) => ({
    to: t.to,
    requires: t.guard.requires,
  }));
}
