// Calendar days as the client shows them (FR-014, FR-022). The client shows dates in South African time,
// UTC+02:00 all year with no daylight saving, so a day filter means that day there. A day starts at its
// local midnight, and a range ends before the next day's start (lt), so a time between .999 and the next
// second, which PostgreSQL's microseconds allow, is never missed.

export const ZONE_OFFSET = "+02:00";
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isCalendarDate(value) {
  if (!DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function startOfDay(day) {
  return new Date(`${day}T00:00:00.000${ZONE_OFFSET}`);
}

export function startOfNextDay(day) {
  return new Date(startOfDay(day).getTime() + DAY_MS);
}

// The createdAt condition for a from and to date, either of which may be empty.
export function dayRange(from, to) {
  const createdAt = {};
  if (from) createdAt.gte = startOfDay(from);
  if (to) createdAt.lt = startOfNextDay(to);
  return createdAt;
}

// Whole days between two instants, rounded down: a request 9 days and 23 hours old is 9 days old.
export function wholeDaysBetween(earlier, later) {
  return Math.floor((new Date(later).getTime() - new Date(earlier).getTime()) / DAY_MS);
}
