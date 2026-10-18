// The staff queue (FR-013, FR-014, NFR-001), for Staff, Coordinators and Managers.
//
// The filters only narrow: they are combined with the authorisation policy's scope by scopedWhere, so no
// filter can widen what the actor may see (FR-013, ADR-006). requests.findQueue is the persistence
// module's query: it returns the page of rows and the total that match, both read in one transaction, so
// the count and the page cannot disagree.
//
// Dates are South African days (src/shared/days.js).

import { permits, scopedWhere } from "../authorisation-policy/policy.js";
import { dayRange } from "../../shared/days.js";
import { validateQueueQuery } from "./validation.js";

export { startOfDay, startOfNextDay } from "../../shared/days.js";

function searchCondition(q) {
  if (!q) return null;
  return {
    OR: ["reference", "title", "description", "location"].map((field) => ({ [field]: { contains: q, mode: "insensitive" } })),
  };
}

export function buildFilterWhere(actor, filters) {
  const parts = [];
  const search = searchCondition(filters.q);
  if (search) parts.push(search);
  if (filters.status) parts.push({ status: filters.status });
  if (filters.categoryId) parts.push({ categoryId: filters.categoryId });
  if (filters.assigneeId === "none") parts.push({ assigneeId: null });
  else if (filters.assigneeId === "me") parts.push({ assigneeId: actor.id });
  else if (filters.assigneeId) parts.push({ assigneeId: filters.assigneeId });
  if (filters.from || filters.to) parts.push({ createdAt: dayRange(filters.from, filters.to) });
  return parts.length > 0 ? { AND: parts } : {};
}

// FR-014's columns. A row without its category or its submission time is a data fault, and is shown as
// one rather than hidden behind a fallback.
function queueItem(row) {
  if (!row.category?.name || !row.createdAt) throw new Error(`Queue row ${row.reference} is missing its category or submission time.`);
  return {
    reference: row.reference,
    title: row.title,
    category: row.category.name,
    status: row.status,
    priority: row.priority ?? null,
    reportedUrgency: row.reportedUrgency,
    assignee: row.assignee ? { id: row.assignee.id, name: row.assignee.name } : null,
    submittedAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getQueue({ actor, query = {} }, { requests }) {
  if (!actor) return { ok: false, code: "not-signed-in" };
  if (!permits(actor, "viewRequestsInScope")) return { ok: false, code: "not-authorised" };

  const parsed = validateQueueQuery(query);
  if (!parsed.ok) return { ok: false, code: "invalid", errors: parsed.errors };
  const filters = parsed.value;

  const where = scopedWhere(actor, buildFilterWhere(actor, filters));
  const skip = (filters.page - 1) * filters.pageSize;
  const { rows, total } = await requests.findQueue({ where, sort: filters.sort, skip, take: filters.pageSize });

  return { ok: true, queue: { requests: rows.map(queueItem), total, page: filters.page, pageSize: filters.pageSize } };
}
