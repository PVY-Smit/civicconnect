// The authorisation policy (ADR-006). Every authorisation decision in CivicConnect is taken here
// (ADR-001 rule 2). It answers two different kinds of question:
//
// - may this actor perform this function, or make this transition on this request: a decision,
//   tested against the Access Matrix register (NFR-005);
// - which requests may this actor see: a scope, returned as a condition every query applies, so a
//   request outside it is never loaded (FR-012, FR-013, NFR-001).
//
// A scope is a Specification (Evans, 2003): the same rule yields the query condition and the check
// on a single request, so the two cannot drift apart. The condition uses the field names the data
// model is expected to carry (requesterId, categoryId, visibility), which DEC-011 (#58) confirms.

export const ROLES = Object.freeze(["Requester", "Staff", "Coordinator", "Manager"]);

// The Access Matrix register (PED s8.3), one key per function.
export const FUNCTIONS = Object.freeze({
  submitRequest: "Submit a request",
  viewOwnRequests: "View own requests",
  viewRequestsInScope: "View any request in authorised categories",
  viewInternalEntries: "View internal action entries",
  assignRequest: "Assign a request to another user",
  acceptRequest: "Accept an unassigned request in scope",
  recordActionEntry: "Record an action entry",
  changeStatus: "Change status (model-permitted transitions)",
  closeRequest: "Move Resolved to Closed",
  rejectRequest: "Reject a request",
  setPriority: "Set or change priority",
  viewManagementCounts: "View management counts and breakdowns",
  maintainCategories: "Maintain the category list",
  manageUsers: "Create or deactivate a user account",
  editAuditEntry: "Edit or delete an audit entry",
});

const allow = (...roles) => Object.freeze(new Set(roles));

const PERMISSIONS = Object.freeze({
  submitRequest: allow("Requester", "Staff", "Coordinator", "Manager"),
  viewOwnRequests: allow("Requester", "Staff", "Coordinator", "Manager"),
  viewRequestsInScope: allow("Staff", "Coordinator", "Manager"),
  viewInternalEntries: allow("Staff", "Coordinator", "Manager"),
  assignRequest: allow("Coordinator"),
  acceptRequest: allow("Staff"),
  recordActionEntry: allow("Staff", "Coordinator", "Manager"),
  changeStatus: allow("Staff", "Coordinator", "Manager"),
  closeRequest: allow("Coordinator", "Manager"),
  rejectRequest: allow("Coordinator"),
  setPriority: allow("Coordinator"),
  viewManagementCounts: allow("Coordinator", "Manager"),
  maintainCategories: allow("Manager"),
  manageUsers: allow("Manager"),
  editAuditEntry: allow(),
});

// Cells where the Access Matrix grants what the baselined requirements refuse. The policy follows the
// requirements and denies, and the conflict goes to change control (#92) rather than being settled here.
// The tests fail if this list and the register stop matching, so a corrected matrix is noticed.
export const MATRIX_CONFLICTS = Object.freeze([
  { fn: "assignRequest", role: "Manager", ruling: "FR-016: the Status Model authorises only the Coordinator to assign or reassign" },
  { fn: "acceptRequest", role: "Coordinator", ruling: "FR-016: the Status Model authorises only Staff to move New to In Progress" },
  { fn: "rejectRequest", role: "Manager", ruling: "FR-016: the Status Model authorises only the Coordinator to reject" },
  { fn: "setPriority", role: "Manager", ruling: "FR-021: only a Coordinator may set or change the priority" },
]);

export function permits(actor, fn) {
  const roles = PERMISSIONS[fn];
  if (!roles) throw new Error(`Unknown function: ${fn}`);
  return roles.has(actor.role);
}

// ---- scopes, as Specifications ----
const spec = (where, matches) => Object.freeze({ where, matches });

export const ownRequests = (userId) => spec({ requesterId: userId }, (r) => r.requesterId === userId);
export const inCategories = (ids) => spec({ categoryId: { in: [...ids] } }, (r) => ids.includes(r.categoryId));
export const everything = () => spec({}, () => true);
export const anyOf = (...specs) => spec({ OR: specs.map((s) => s.where) }, (r) => specs.some((s) => s.matches(r)));

// Which requests the actor may see. A Coordinator sees every category (FR-013). Whether Staff and
// Manager scope stays by category, by site or becomes global is FEC-01, and only this function
// changes if it does.
export function requestScope(actor) {
  switch (actor.role) {
    case "Requester":
      return ownRequests(actor.id);
    case "Coordinator":
      return everything();
    case "Staff":
    case "Manager":
      return anyOf(ownRequests(actor.id), inCategories(actor.categoryIds ?? []));
    default:
      return spec({ id: { in: [] } }, () => false);
  }
}

// The condition for a query, combined with whatever the caller is looking for.
export function scopedWhere(actor, where = {}) {
  return { AND: [where, requestScope(actor).where] };
}

// Which action entries the actor may see on a request in scope (FR-011, FR-017).
export function actionEntryScope(actor) {
  return permits(actor, "viewInternalEntries")
    ? everything()
    : spec({ visibility: "requester-visible" }, (e) => e.visibility === "requester-visible");
}

// Whether the actor may make this transition on this request. The roles come from the transition
// table (ADR-005), so the Status Model register stays the one source for who may move a request.
// Accepting an unassigned request needs the request in the actor's authorised categories, whoever
// submitted it (FR-015); every other move needs it in the actor's request scope.
export function authoriseTransition(actor, request, transition) {
  if (!transition.roles.includes(actor.role)) return false;
  const scope = transition.scope === "category" ? inCategories(actor.categoryIds ?? []) : requestScope(actor);
  return scope.matches(request);
}
