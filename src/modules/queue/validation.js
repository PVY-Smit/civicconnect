// The staff queue's query parameters (FR-014), checked before any lookup. The names match the client's
// filters (client/src/queue-filters.js). A value that cannot be one of the allowed ones is refused with a
// 400 and its own message, so a filter is never silently dropped: a dropped filter would show the whole
// scope as if it were the filtered result.

import { isCalendarDate as validDate } from "../../shared/days.js";
import { STATUSES } from "../workflow-status/transition-table.js";

export const QUEUE_SORTS = Object.freeze([
  "submitted_desc",
  "submitted_asc",
  "updated_desc",
  "updated_asc",
  "priority_desc",
  "priority_asc",
]);

export const DEFAULT_QUEUE_SORT = "submitted_desc";
export const DEFAULT_PAGE = 1;
export const PAGE_SIZE = 25;
// 25 a page over 100,000 pages is 2.5 million requests, far past NFR-001's volume; a larger page number
// is refused, so skip always stays a safe integer.
export const MAX_PAGE = 100_000;
// The search is matched with contains across four fields, so its length is capped.
export const Q_MAX = 200;

const POSITIVE_INT_RE = /^[1-9]\d{0,18}$/;

export function validateQueueQuery(raw = {}) {
  const errors = {};
  const value = {};

  // Under Express 5, ?status=New&status=Closed arrives as an array. Only one value is allowed per filter.
  for (const key of ["q", "status", "categoryId", "assigneeId", "from", "to", "sort", "page"]) {
    const given = raw[key];
    if (given !== undefined && typeof given !== "string") {
      errors[key] = "Give this filter once, as a single value.";
      value[key] = "";
    } else {
      value[key] = typeof given === "string" ? given.trim() : "";
    }
  }
  const { q, status, categoryId, assigneeId, from, to } = value;
  const sort = value.sort || DEFAULT_QUEUE_SORT;
  const pageText = value.page || String(DEFAULT_PAGE);

  if (!errors.q && [...q].length > Q_MAX) errors.q = `Search must be at most ${Q_MAX} characters.`;
  if (!errors.status && status && !STATUSES.includes(status)) errors.status = "Status is not recognised.";
  if (!errors.categoryId && categoryId && !POSITIVE_INT_RE.test(categoryId)) errors.categoryId = "Category must be a positive integer id.";
  if (!errors.assigneeId && assigneeId && assigneeId !== "none" && assigneeId !== "me" && !POSITIVE_INT_RE.test(assigneeId)) {
    errors.assigneeId = 'Assignee must be a positive integer id, "none", or "me".';
  }
  if (!errors.from && from && !validDate(from)) errors.from = "From must be a valid date in YYYY-MM-DD format.";
  if (!errors.to && to && !validDate(to)) errors.to = "To must be a valid date in YYYY-MM-DD format.";
  if (!errors.from && !errors.to && from && to && to < from) errors.to = "To must be on or after From.";
  if (!errors.sort && !QUEUE_SORTS.includes(sort)) errors.sort = `Sort must be one of ${QUEUE_SORTS.join(", ")}.`;
  if (!errors.page && !(POSITIVE_INT_RE.test(pageText) && Number(pageText) <= MAX_PAGE)) {
    errors.page = `Page must be a whole number from 1 to ${MAX_PAGE}.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      q,
      status,
      // Ids stay text, as every id the services see does (the persistence module turns them into bigint).
      categoryId: categoryId || null,
      assigneeId,
      from,
      to,
      sort,
      page: Number(pageText),
      pageSize: PAGE_SIZE,
    },
  };
}
