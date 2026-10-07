const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

export function validateReportPeriod(raw = {}) {
  const errors = {};

  const from = clean(raw.from);
  const to = clean(raw.to);

  if (from && !validDate(from)) {
    errors.from =
      "From must be a valid date in YYYY-MM-DD format.";
  }

  if (to && !validDate(to)) {
    errors.to =
      "To must be a valid date in YYYY-MM-DD format.";
  }

  if (!errors.from && !errors.to && from && to && to < from) {
    errors.to = "To must be on or after From.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      errors,
    };
  }

  return {
    ok: true,
    value: {
      from: from || null,
      to: to || null,
    },
  };
}
