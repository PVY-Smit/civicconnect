import { permits } from "../authorisation-policy/policy.js";

function occurredAt(entry) {
  return entry.createdAt ?? entry.occurredAt;
}

function statusNotifications(request) {
  const notifications = [];
  let acceptedRecorded = false;

  const history = [...(request.statusHistory ?? [])].sort(
    (a, b) =>
      new Date(occurredAt(a)).getTime() -
      new Date(occurredAt(b)).getTime(),
  );

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
        entry.visibility === "requester-visible",
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
    if (request.requesterId !== actor.id) {
      continue;
    }

    notifications.push(
      ...statusNotifications(request),
      ...updateNotifications(request),
    );
  }

  notifications.sort(
    (a, b) =>
      new Date(b.at).getTime() -
      new Date(a.at).getTime(),
  );

  return {
    ok: true,
    notifications,
  };
}
