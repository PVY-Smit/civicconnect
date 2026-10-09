// The requester's views of requests (FR-009 to FR-012), for the request access module (ADR-001).
//
// Every lookup takes its condition from the authorisation policy (ADR-001 rule 2, ADR-006), so a request
// outside the actor's scope is never loaded. A request that does not exist and a request the actor may
// not see get the same answer, so nothing about another person's request is disclosed (FR-012).
//
// requests.findMany and requests.findOne are the persistence module's queries (ADR-007). findOne loads
// the request with its category, its status history and the action entries that match entryWhere. Both
// lists are put in time order here, and the entries are filtered again here, so an adapter that returned
// them in another order, or ignored entryWhere, would still give FR-011's ordered history and would not
// leak an internal entry.
//
// An actor whose role grants neither view is refused before any query (NFR-005, deny by default). The
// policy's scope for an unknown role also matches nothing, so the query would load nothing either.

import { actionEntryScope, ownRequests, permits, scopedWhere } from "../authorisation-policy/policy.js";
import { isReference } from "../request-capture/reference.js";

// Oldest first. Array sort is stable, so entries with the same time keep the store's order.
const inTimeOrder = (rows) => [...rows].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

// FR-010: the six fields of the requester's list.
const listItem = (r) => ({
  reference: r.reference,
  title: r.title,
  category: r.category.name,
  status: r.status,
  submittedAt: r.createdAt,
  updatedAt: r.updatedAt,
});

export async function listOwnRequests(actor, { requests }) {
  if (!actor) return { ok: false, code: "not-signed-in" };
  if (!permits(actor, "viewOwnRequests")) return { ok: false, code: "not-authorised" };
  const rows = await requests.findMany({ where: ownRequests(actor.id).where, orderBy: { createdAt: "desc" } });
  return { ok: true, requests: rows.map(listItem) };
}

export async function getRequestDetail(actor, reference, { requests }) {
  if (!actor) return { ok: false, code: "not-signed-in" };
  if (!permits(actor, "viewOwnRequests") && !permits(actor, "viewRequestsInScope")) return { ok: false, code: "not-found" };
  if (!isReference(reference)) return { ok: false, code: "not-found" };
  const entries = actionEntryScope(actor);
  const r = await requests.findOne({ where: scopedWhere(actor, { reference }), entryWhere: entries.where });
  if (!r) return { ok: false, code: "not-found" };

  const detail = {
    reference: r.reference,
    title: r.title,
    description: r.description,
    category: r.category.name,
    location: r.location,
    reportedUrgency: r.reportedUrgency,
    status: r.status,
    resolutionSummary: r.resolutionSummary ?? null,
    submittedAt: r.createdAt,
    updatedAt: r.updatedAt,
    statusHistory: inTimeOrder(r.statusHistory).map((h) => ({ from: h.fromStatus ?? null, to: h.toStatus, at: h.createdAt })),
    actionEntries: inTimeOrder(r.actionEntries)
      .filter((e) => entries.matches(e))
      .map((e) => ({ body: e.body, at: e.createdAt, ...(e.visibility === "internal" ? { visibility: "internal" } : {}) })),
  };
  // Staff, Coordinators and Managers also see the operational fields. FR-021 keeps priority separate from
  // the urgency the Requester reported, and the Requester's view shows only what they supplied.
  if (permits(actor, "viewRequestsInScope")) {
    detail.priority = r.priority ?? null;
    detail.assigneeId = r.assigneeId ?? null;
  }
  return { ok: true, request: detail };
}
