// The reporting period (FR-022, FR-023): two optional calendar dates, from and to, in South African days.
// A value that is not one date is refused with a 400, never dropped: a dropped date would report all time
// as if it were the period asked for.

import { isCalendarDate } from "../../shared/days.js";

export function validateReportPeriod(raw = {}) {
  const errors = {};
  const value = {};
  for (const key of ["from", "to"]) {
    const given = raw[key];
    if (given !== undefined && typeof given !== "string") {
      errors[key] = "Give this date once, as a single value.";
      continue;
    }
    value[key] = typeof given === "string" ? given.trim() : "";
    if (value[key] && !isCalendarDate(value[key])) errors[key] = `${key === "from" ? "From" : "To"} must be a valid date in YYYY-MM-DD format.`;
  }
  if (!errors.from && !errors.to && value.from && value.to && value.to < value.from) errors.to = "To must be on or after From.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { from: value.from || null, to: value.to || null } };
}
