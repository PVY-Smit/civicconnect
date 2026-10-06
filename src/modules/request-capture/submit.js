// Request submission (FR-005 to FR-009, FR-021), for the request capture module (ADR-001).
//
// The store and the reference formatter are passed in. formatReference is built once at start-up from the
// configured key (reference.js). requests.create is the persistence module's operation (ADR-007): inside
// one transaction it takes the next value of the reference sequence, formats it with formatReference, and
// inserts the request with its first status history row (null to New), as ADR-007's request creation
// transaction lists, so the reference is never computed from the current maximum. It resolves to the
// saved reference and createdAt.

import { permits } from "../authorisation-policy/policy.js";
import { validateSubmission } from "./validation.js";

export async function submitRequest({ actor, input }, { categories, requests, formatReference }) {
  // Only reachable behind authenticate (#111); refuse rather than fail if a route is ever wired without it.
  if (!actor) return { ok: false, code: "not-signed-in" };
  if (!permits(actor, "submitRequest")) {
    return { ok: false, code: "not-authorised" };
  }
  const check = validateSubmission(input, { activeCategoryIds: await categories.activeIds() });
  if (!check.ok) {
    return { ok: false, code: "invalid", errors: check.errors };
  }
  const saved = await requests.create(
    {
      ...check.value,
      requesterId: actor.id,
      status: "New", // FR-005
      priority: null, // FR-021: absent until a Coordinator sets it
    },
    { formatReference },
  );
  // FR-009: the acknowledgement carries the reference and the time the store recorded.
  return { ok: true, acknowledgement: { reference: saved.reference, createdAt: saved.createdAt } };
}
