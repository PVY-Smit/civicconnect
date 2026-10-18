// Management reporting (FR-022 to FR-024), for Coordinators and Managers (the Access Matrix row "View
// management counts and breakdowns", checked through the policy).
//
// What the counts mean, so FR-022's "independently calculated" values can be built from it: the requests
// submitted in the period (South African days, src/shared/days.js), counted by their status now. Open is
// New, Assigned, In Progress or On Hold; overdue is open and older than the target in whole days; resolved
// and closed are those statuses. The breakdown (FR-023) counts the same requests by category and status,
// so its total equals the period's total. The overdue list (FR-024) is every open request in scope older
// than the target, whatever its submission date, oldest first.
//
// Scope. A report covers only the requests the actor may see, through the same scopedWhere as the queue
// (ADR-006): everything for a Coordinator, their own and their categories' for a Manager. Whether a
// Manager's oversight should be global is FEC-01, still open; until it is decided, a report never lists a
// request the actor could not open.
//
// The target is the single organisation-wide response target in whole days (FR-022, FEC-02), from
// configuration. Its value is the organisation's to set (FEC-02), so it is checked when the handlers are
// made: a missing target would otherwise report nothing overdue.

import { permits, scopedWhere } from "../authorisation-policy/policy.js";
import { dayRange, wholeDaysBetween } from "../../shared/days.js";
import { validateReportPeriod } from "./validation.js";

export const OPEN_STATUSES = Object.freeze(["New", "Assigned", "In Progress", "On Hold"]);

export function assertTargetDays(value) {
  if (!(Number.isSafeInteger(value) && value >= 1)) {
    throw new Error("The overdue target must be a whole number of days, at least 1 (OVERDUE_TARGET_DAYS).");
  }
  return value;
}

const isOpen = (request) => OPEN_STATUSES.includes(request.status);
const isOverdue = (request, targetDays, now) => isOpen(request) && wholeDaysBetween(request.createdAt, now) > targetDays;

// A request without its category is a data fault, reported as one rather than counted as "Unknown".
function categoryName(request) {
  const name = request.category?.name;
  if (!name) throw new Error(`Request ${request.reference} has no category.`);
  return name;
}

function breakdownRows(requests) {
  const counts = new Map();
  for (const request of requests) {
    const category = categoryName(request);
    const key = `${category}\u0000${request.status}`;
    const row = counts.get(key) ?? { category, status: request.status, count: 0 };
    row.count += 1;
    counts.set(key, row);
  }
  return [...counts.values()].sort((a, b) => a.category.localeCompare(b.category) || a.status.localeCompare(b.status));
}

function access(actor) {
  if (!actor) return { ok: false, code: "not-signed-in" };
  if (!permits(actor, "viewManagementCounts")) return { ok: false, code: "not-authorised" };
  return null;
}

export async function getReportSummary({ actor, query = {}, now, targetDays }, { reports }) {
  const refused = access(actor);
  if (refused) return refused;
  const period = validateReportPeriod(query);
  if (!period.ok) return { ok: false, code: "invalid", errors: period.errors };
  const { from, to } = period.value;

  const where = scopedWhere(actor, from || to ? { createdAt: dayRange(from, to) } : {});
  const requests = await reports.forSummary({ where });
  return {
    ok: true,
    summary: {
      from,
      to,
      counts: {
        open: requests.filter(isOpen).length,
        overdue: requests.filter((r) => isOverdue(r, targetDays, now)).length,
        resolved: requests.filter((r) => r.status === "Resolved").length,
        closed: requests.filter((r) => r.status === "Closed").length,
      },
      overdueTargetDays: targetDays,
      breakdown: breakdownRows(requests),
    },
  };
}

export async function getOverdueReport({ actor, now, targetDays }, { reports }) {
  const refused = access(actor);
  if (refused) return refused;
  const requests = await reports.openRequests({ where: scopedWhere(actor, { status: { in: [...OPEN_STATUSES] } }) });
  const overdue = requests
    .filter((r) => isOverdue(r, targetDays, now))
    .map((r) => ({ request: r, ageDays: wholeDaysBetween(r.createdAt, now) }))
    .sort((a, b) => b.ageDays - a.ageDays || a.request.reference.localeCompare(b.request.reference))
    .map(({ request, ageDays }) => ({
      reference: request.reference,
      category: categoryName(request),
      ageDays,
      assignee: request.assignee ? { id: request.assignee.id, name: request.assignee.name } : null,
    }));
  return { ok: true, overdue: { targetDays, requests: overdue } };
}
