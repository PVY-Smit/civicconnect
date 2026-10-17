// The requester's notifications (FR-029, ADR-008): derived from the saved status history and the
// requester-visible action entries, so there is no separate store to fall out of step (DEC-015).
//
// notificationSources.forRequester(requesterId) is the persistence module's query: the requester's own
// requests, each with its status history and its requester-visible entries. The requester id comes only
// from the session.
//
// Order. Times can tie, so the history is ordered by time and then by row id, which is the order the rows
// were written, and the list by time, newest first, then by reference and event, so it is the same on
// every refresh.

import { permits } from "../authorisation-policy/policy.js";
import { VISIBILITIES } from "../workflow-status/service.js";

// The one visibility a requester may see (DEC-003), taken from the workflow's own list, not retyped.
const REQUESTER_VISIBLE = VISIBILITIES.find((v) => v === "requester-visible");
const byTimeThenId = (a, b) => new Date(occurredAt(a)) - new Date(occurredAt(b)) || compareIds(a.id, b.id);
const compareIds = (a, b) => {
  if (a === undefined || b === undefined) return 0;
  const [x, y] = [String(a), String(b)];
  return /^\d+$/.test(x) && /^\d+$/.test(y) ? (BigInt(x) < BigInt(y) ? -1 : BigInt(x) > BigInt(y) ? 1 : 0) : x.localeCompare(y);
};

function occurredAt(entry) {
  return entry.createdAt ?? entry.occurredAt;
}

function statusNotifications(request) {
  const notifications = [];
  let acceptedRecorded = false;

  const history = [...(request.statusHistory ?? [])].sort(byTimeThenId);

  for (const entry of history) {
    const at = occurredAt(entry);

    if (
      !acceptedRecorded &&
      entry.fromStatus === "New" &&
      (entry.toStatus === "Assigned" ||
        entry.toStatus === "In Progress")
    ) {
      notifications.push({
        reference: request.reference,
        event: "accepted",
        at,
      });

      acceptedRecorded = true;
    }

    if (entry.toStatus === "Rejected") {
      notifications.push({
        reference: request.reference,
        event: "rejected",
        at,
      });
    }

    if (entry.toStatus === "Resolved") {
      notifications.push({
        reference: request.reference,
        event: "completed",
        at,
      });
    }
  }

  return notifications;
}

function updateNotifications(request) {
  return (request.actionEntries ?? [])
    .filter(
      (entry) =>
        entry.visibility === REQUESTER_VISIBLE,
    )
    .map((entry) => ({
      reference: request.reference,
      event: "updated",
      at: occurredAt(entry),
    }));
}

export async function getRequesterNotifications(
  { actor },
  { notificationSources },
) {
  if (!actor) {
    return {
      ok: false,
      code: "not-signed-in",
    };
  }

  if (!permits(actor, "viewOwnRequests")) {
    return {
      ok: false,
      code: "not-authorised",
    };
  }

  const requests =
    await notificationSources.forRequester(actor.id);

  const notifications = [];

  for (const request of requests) {
    // Defence in depth: even if the persistence adapter accidentally
    // returns another requester's record, never expose it.
    // Compared as text, since the session and the store may give the same id as a string and a number.
    if (String(request.requesterId) !== String(actor.id)) {
      continue;
    }

    notifications.push(
      ...statusNotifications(request),
      ...updateNotifications(request),
    );
  }

  notifications.sort(
    (a, b) =>
      new Date(b.at) - new Date(a.at) ||
      a.reference.localeCompare(b.reference) ||
      a.event.localeCompare(b.event),
  );

  return {
    ok: true,
    notifications,
  };
}
