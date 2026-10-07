// How the staff screens present the moves the server offers (ADR-005).
//
// The server decides which moves an actor may make on a request and what each one needs: the request
// detail for staff carries `moves: [{ to, requires }]`, produced by allowedMoves in the workflow module.
// This file only turns that into words and form inputs. It never works out a move itself, so the client
// cannot offer something the server would refuse, and a change to the status model needs no change here
// beyond a label.

// What each move is called on its button, by from and to status.
const LABELS = {
  "New->Assigned": "Assign",
  "New->In Progress": "Accept",
  "New->Rejected": "Reject",
  "Assigned->In Progress": "Start work",
  "Assigned->Assigned": "Reassign",
  "Assigned->Rejected": "Reject",
  "In Progress->On Hold": "Put on hold",
  "In Progress->Resolved": "Resolve",
  "On Hold->In Progress": "Resume work",
  "On Hold->Rejected": "Reject",
  "Resolved->Closed": "Close",
  "Resolved->In Progress": "Reopen",
};

export function moveLabel(from, to) {
  return LABELS[`${from}->${to}`] ?? `Move to ${to}`;
}

// The input each guard requirement needs, with the words the user sees. The reason's wording depends on
// the move, because a rejection reason is shown to the Requester (FR-020) and a hold reason is not.
export function inputsFor(move, from) {
  return move.requires.map((field) => {
    switch (field) {
      case "assigneeId":
        return { field, kind: "staff", label: "Assign to" };
      case "resolutionSummary":
        return { field, kind: "text", label: "Resolution summary", hint: "What was done. The requester will see this (FR-018)." };
      case "confirmed":
        return { field, kind: "confirm", label: "I confirm the work is complete and the request can be closed" };
      case "reason":
        if (move.to === "Rejected") return { field, kind: "text", label: "Reason for rejecting", hint: "The requester will see this reason (FR-020)." };
        if (move.to === "On Hold") return { field, kind: "text", label: "Why is it on hold?", hint: "Recorded in the status history." };
        if (from === "Resolved") return { field, kind: "text", label: "Why is it being reopened?", hint: "Recorded in the status history." };
        return { field, kind: "text", label: "How was the blocking condition cleared?", hint: "Recorded in the status history." };
      default:
        return { field, kind: "text", label: field };
    }
  });
}

// A form id for one input of one move, unique across the whole transition table: built from the from and to
// statuses, so two moves that need the same field never share an id.
const slug = (status) => status.toLowerCase().replace(/[^a-z0-9]+/g, "-");
export function moveFieldId(from, to, field) {
  return `move-${slug(from)}-to-${slug(to)}-${field}`;
}

// Whether a move's form can be sent: every choice it needs has been made. A staff member must be chosen
// before Assign, and the closing confirmation ticked before Close. Text the server must check (a reason, a
// summary) is left to the server, which names what is missing.
export function readyToSend(move, values) {
  return move.requires.every((field) => {
    if (field === "assigneeId") return values.assigneeId != null && values.assigneeId !== "";
    if (field === "confirmed") return values.confirmed === true;
    return true;
  });
}

// Which controls the staff detail screen shows, from what the server sent with the request: the moves the
// actor may make now, and whether they may set the priority or record an entry. Nothing here is worked out
// from the role.
export function detailControls(request) {
  return {
    moves: request?.moves ?? [],
    priority: Boolean(request?.capabilities?.setPriority),
    entry: Boolean(request?.capabilities?.recordActionEntry),
  };
}

// The body for POST /status: the target status plus only the inputs this move asked for.
export function moveBody(move, values) {
  const body = { to: move.to };
  for (const field of move.requires) {
    if (field === "confirmed") body.confirmed = values.confirmed === true;
    else if (field === "assigneeId") body.assigneeId = values.assigneeId === "" || values.assigneeId == null ? null : Number(values.assigneeId);
    else body[field] = values[field] ?? "";
  }
  return body;
}
