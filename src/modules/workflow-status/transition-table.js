// The request status model as data (ADR-005).
//
// One entry per permitted transition in the baselined Status Model register (PED s8.4, Figure 2).
// Any move not listed here is refused (FR-016). The service enforces transitions through this table,
// the interface asks it which actions to offer, and the tests iterate it, so all three read one set
// of rules. A change to the status model is a change to this table, made through controlled change
// (RSK-09, FEC-02).
//
// Each guard is a small interchangeable object (the Strategy pattern): it names the input it needs
// and returns a refusal message, or null when the condition holds. Which roles may perform a move is
// data here and is decided by the authorisation policy, never by this module (ADR-001 rule 2).

export const STATUSES = Object.freeze([
  "New",
  "Assigned",
  "In Progress",
  "On Hold",
  "Resolved",
  "Closed",
  "Rejected",
]);

const filled = (value) => typeof value === "string" && value.trim().length > 0;

function requiresText(field, message) {
  return Object.freeze({
    requires: Object.freeze([field]),
    check: (request, change) => (filled(change[field]) ? null : message),
  });
}

export const guards = Object.freeze({
  assigneeNominated: Object.freeze({
    requires: Object.freeze(["assigneeId"]),
    check: (request, change) => (change.assigneeId ? null : "An assignee must be nominated."),
  }),
  unassigned: Object.freeze({
    requires: Object.freeze([]),
    check: (request) => (request.assigneeId ? "Only an unassigned request can be accepted." : null),
  }),
  assigneeBeginsWork: Object.freeze({
    requires: Object.freeze([]),
    check: (request, change, actor) =>
      actor.role === "Coordinator" || request.assigneeId === actor.id
        ? null
        : "Only the assignee or a Coordinator can begin work on an assigned request.",
  }),
  differentAssignee: Object.freeze({
    requires: Object.freeze(["assigneeId"]),
    check: (request, change) =>
      change.assigneeId && change.assigneeId !== request.assigneeId
        ? null
        : "Reassignment needs a different assignee.",
  }),
  rejectionReason: requiresText("reason", "A rejection reason is required (FR-020)."),
  holdReason: requiresText("reason", "A hold reason is required."),
  blockerCleared: requiresText("reason", "Record how the blocking condition was cleared."),
  reopenReason: requiresText("reason", "A reason for reopening is required."),
  resolutionSummary: requiresText("resolutionSummary", "A resolution summary is required (FR-018)."),
  // A prompt the interface asks for, not a safeguard: any caller can send confirmed: true. The control on
  // closing is the role check, Coordinator or Manager only (FR-019), made by the authorisation policy.
  closureConfirmed: Object.freeze({
    requires: Object.freeze(["confirmed"]),
    check: (request, change) => (change.confirmed === true ? null : "Closure must be confirmed (FR-019)."),
  }),
});

// scope "category" marks the one move whose authorisation needs the request to be in the actor's
// authorised categories, whoever submitted it: accepting an unassigned request (FR-015).
export const TRANSITIONS = Object.freeze(
  [
    { from: "New", to: "Assigned", roles: ["Coordinator"], guard: guards.assigneeNominated, trace: "FR-015" },
    { from: "New", to: "In Progress", roles: ["Staff"], guard: guards.unassigned, scope: "category", trace: "FR-015" },
    { from: "New", to: "Rejected", roles: ["Coordinator"], guard: guards.rejectionReason, trace: "FR-020" },
    { from: "Assigned", to: "In Progress", roles: ["Staff", "Coordinator"], guard: guards.assigneeBeginsWork, trace: "FR-016" },
    { from: "Assigned", to: "Assigned", roles: ["Coordinator"], guard: guards.differentAssignee, trace: "FR-015, FR-025" },
    { from: "Assigned", to: "Rejected", roles: ["Coordinator"], guard: guards.rejectionReason, trace: "FR-020" },
    { from: "In Progress", to: "On Hold", roles: ["Staff", "Coordinator"], guard: guards.holdReason, trace: "FR-016, FR-017" },
    { from: "In Progress", to: "Resolved", roles: ["Staff", "Coordinator"], guard: guards.resolutionSummary, trace: "FR-018" },
    { from: "On Hold", to: "In Progress", roles: ["Staff", "Coordinator"], guard: guards.blockerCleared, trace: "FR-016" },
    { from: "On Hold", to: "Rejected", roles: ["Coordinator"], guard: guards.rejectionReason, trace: "FR-020" },
    { from: "Resolved", to: "Closed", roles: ["Coordinator", "Manager"], guard: guards.closureConfirmed, trace: "FR-019" },
    { from: "Resolved", to: "In Progress", roles: ["Coordinator"], guard: guards.reopenReason, trace: "FR-016" },
  ].map((t) => Object.freeze({ ...t, roles: Object.freeze([...t.roles]) })),
);
