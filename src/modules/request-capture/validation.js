// Submission validation (FR-005, FR-006, FR-007, FR-021).
//
// Every failing field is reported at once, each with a message naming the field and the correction
// (FR-007). Only the five fields a Requester supplies are read; status, priority, requester, reference
// and dates are set by the service, so a client cannot set them by adding them to the body.
//
// Limits. The title limit is the schema's VARCHAR(200) (docs/data/initial-schema.sql). The M1 baseline
// gives no limit for description or location and no urgency scale, so the values below are proposed in
// #112 for the team to agree and are held here, in one place, so the tests and the interface follow them.

export const LIMITS = Object.freeze({
  title: { min: 1, max: 200 },
  description: { min: 1, max: 4000 },
  location: { min: 1, max: 300 },
});

export const URGENCY_LEVELS = Object.freeze(["Low", "Medium", "High"]);

const LABELS = { title: "Title", description: "Description", location: "Location" };

function text(field, raw, errors) {
  const { min, max } = LIMITS[field];
  if (raw === undefined || raw === null || (typeof raw === "string" && raw.trim() === "")) {
    errors[field] = `${LABELS[field]} is required.`;
    return undefined;
  }
  if (typeof raw !== "string") {
    errors[field] = `${LABELS[field]} must be text.`;
    return undefined;
  }
  const value = raw.trim();
  if (value.length < min) errors[field] = `${LABELS[field]} must be at least ${min} characters.`;
  else if (value.length > max) errors[field] = `${LABELS[field]} must be at most ${max} characters; it is ${value.length}.`;
  return value;
}

// activeCategoryIds: the ids of active categories in the controlled list (FR-006), read by the caller.
export function validateSubmission(input, { activeCategoryIds }) {
  const body = input && typeof input === "object" ? input : {};
  const errors = {};

  const title = text("title", body.title, errors);
  const description = text("description", body.description, errors);
  const location = text("location", body.location, errors);

  let categoryId;
  if (body.categoryId === undefined || body.categoryId === null || body.categoryId === "") {
    errors.categoryId = "Category is required. Choose one from the list.";
  } else {
    categoryId = String(body.categoryId);
    if (!activeCategoryIds.map(String).includes(categoryId)) {
      errors.categoryId = "Category must be one of the categories in the list.";
    }
  }

  const reportedUrgency = body.reportedUrgency;
  if (reportedUrgency === undefined || reportedUrgency === null || reportedUrgency === "") {
    errors.reportedUrgency = `Urgency is required. Choose ${URGENCY_LEVELS.join(", ")}.`;
  } else if (!URGENCY_LEVELS.includes(reportedUrgency)) {
    errors.reportedUrgency = `Urgency must be one of ${URGENCY_LEVELS.join(", ")}.`;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { title, description, categoryId, location, reportedUrgency } };
}
