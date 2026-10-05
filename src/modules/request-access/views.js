// The requester's views of requests (FR-009 to FR-012), for the request access module (ADR-001).
//
// Every lookup takes its condition from the authorisation policy (ADR-001 rule 2, ADR-006), so a request
// outside the actor's scope is never loaded. A request that does not exist and a request the actor may
// not see get the same answer, so nothing about another person's request is disclosed (FR-012).
//
// requests.findMany and requests.findOne are the persistence module's queries (ADR-007). findOne loads
// the request with its category, its status history in time order and the action entries that match
// entryWhere; the entries are filtered again here, so an adapter that ignored entryWhere would still not
// leak an internal entry (FR-011).

import { actionEntryScope, ownRequests, permits, scopedWhere } from "../authorisation-policy/policy.js";
import { isReference } from "../request-capture/reference.js";

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
  if (!permits(actor, "viewOwnRequests")) return { ok: false, code: "not-authorised" };
  const rows = await requests.findMany({ where: ownRequests(actor.id).where, orderBy: { createdAt: "desc" } });
  return { ok: true, requests: rows.map(listItem) };
}

export async function getRequestDetail(actor, reference, { requests }) {
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
    statusHistory: r.statusHistory.map((h) => ({ from: h.fromStatus ?? null, to: h.toStatus, at: h.createdAt })),
    actionEntries: r.actionEntries
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
