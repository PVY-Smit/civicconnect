// The management view's arithmetic (FR-022 to FR-024). The server counts; this file only arranges its
// answer for the screen and checks the period before it is sent.

export const STATUS_ORDER = Object.freeze(["New", "Assigned", "In Progress", "On Hold", "Resolved", "Closed", "Rejected"]);

const SAST = "Africa/Johannesburg";
const isoDate = (date) => new Intl.DateTimeFormat("en-CA", { timeZone: SAST }).format(date); // YYYY-MM-DD

// The default period: the 30 days ending today, as dates in South African time.
export function defaultPeriod(now = new Date()) {
  const to = isoDate(now);
  const from = isoDate(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
  return { from, to };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export function periodProblem({ from, to }) {
  if (!DATE.test(from ?? "") || !DATE.test(to ?? "")) return "Enter both a start and an end date.";
  if (to < from) return "The end date must be on or after the start date.";
  return null;
}

// FR-023: the server's breakdown, one row per category and status with a count, becomes a table of
// categories down and statuses across, with totals both ways. A pair the server did not send counts as
// zero, and only statuses that appear anywhere get a column, in the status model's order.
export function pivot(rows) {
  const categories = [...new Set(rows.map((r) => r.category))].sort((a, b) => a.localeCompare(b));
  const present = new Set(rows.map((r) => r.status));
  const statuses = STATUS_ORDER.filter((s) => present.has(s)).concat([...present].filter((s) => !STATUS_ORDER.includes(s)));
  const cell = new Map();
  for (const r of rows) {
    const key = `${r.category}\u0000${r.status}`;
    cell.set(key, (cell.get(key) ?? 0) + cellValue(r));
  }
  const value = (c, s) => cell.get(`${c}\u0000${s}`) ?? 0;
  const table = categories.map((c) => ({ category: c, counts: statuses.map((s) => value(c, s)), total: statuses.reduce((n, s) => n + value(c, s), 0) }));
  const columnTotals = statuses.map((s) => categories.reduce((n, c) => n + value(c, s), 0));
  return { statuses, rows: table, columnTotals, total: columnTotals.reduce((a, b) => a + b, 0) };
}

function cellValue(r) {
  const n = Number(r.count);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

// FR-024 shows each overdue request's age. Whole days, with the word, so it reads aloud correctly.
export const ageText = (days) => `${days} day${days === 1 ? "" : "s"}`;

// FR-022: the screen states the response target exactly as the server sends it, never rounded or assumed,
// because the server compares against that same value (SC-D-03, one organisation-wide target).
export const overdueHint = (targetDays) => `Overdue means still open more than ${ageText(targetDays)} after it was submitted.`;

// FR-023: what the breakdown says when the period holds no requests, instead of a table of zeros. A
// breakdown whose rows all count zero holds no requests either.
export const EMPTY_BREAKDOWN = "No requests were submitted in this period.";
export const breakdownNote = (table) => (table.total === 0 ? EMPTY_BREAKDOWN : null);
