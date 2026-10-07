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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const POSITIVE_INT_RE = /^[1-9]\d*$/;

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function validDate(value) {
  if (!DATE_RE.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export function validateQueueQuery(raw = {}) {
  const errors = {};

  const q = clean(raw.q);
  const status = clean(raw.status);
  const categoryId = clean(raw.categoryId);
  const assigneeId = clean(raw.assigneeId);
  const from = clean(raw.from);
  const to = clean(raw.to);
  const sort = clean(raw.sort) || DEFAULT_QUEUE_SORT;
  const pageText = clean(raw.page) || String(DEFAULT_PAGE);

  if (status && !STATUSES.includes(status)) {
    errors.status = "Status is not recognised.";
  }

  if (categoryId && !POSITIVE_INT_RE.test(categoryId)) {
    errors.categoryId = "Category must be a positive integer id.";
  }

  if (
    assigneeId &&
    assigneeId !== "none" &&
    assigneeId !== "me" &&
    !POSITIVE_INT_RE.test(assigneeId)
  ) {
    errors.assigneeId =
      'Assignee must be a positive integer id, "none", or "me".';
  }

  if (from && !validDate(from)) {
    errors.from = "From must be a valid date in YYYY-MM-DD format.";
  }

  if (to && !validDate(to)) {
    errors.to = "To must be a valid date in YYYY-MM-DD format.";
  }

  if (!errors.from && !errors.to && from && to && to < from) {
    errors.to = "To must be on or after From.";
  }

  if (!QUEUE_SORTS.includes(sort)) {
    errors.sort = `Sort must be one of ${QUEUE_SORTS.join(", ")}.`;
  }

  if (!POSITIVE_INT_RE.test(pageText)) {
    errors.page = "Page must be a positive integer.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      q,
      status,
      categoryId: categoryId ? Number(categoryId) : null,
      assigneeId,
      from,
      to,
      sort,
      page: Number(pageText),
      pageSize: PAGE_SIZE,
    },
  };
}
