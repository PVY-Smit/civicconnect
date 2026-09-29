# ADR-008: Request status notification interface

- **Status:** Proposed. Awaiting review under issue #63.
- **Date:** 28 September 2026
- **Decision:** Notification interface for M2
- **Drivers:** FR-017, FR-029, DEC-005, SC-D-01, FEC-03, ADR-001 rule 4, ADR-005, ADR-006, ADR-007 and the Assignment 2 Task 3 recommendation.

## Context

CivicConnect needs to give the Requester an in-application indication when a request is accepted, updated, rejected or completed under FR-029. The indication must remain available for the Requester's next sign-in.

The notification path therefore needs a clear boundary between the part of the system that completes a request change and the part responsible for making that change visible to the Requester.

Email and SMS remain outside the current scope under SC-D-01.

A separate HTTP API, message broker or notification microservice would introduce another network and operational boundary without a current requirement that needs one. CivicConnect is being implemented as a modular monolith, so an in-process interface is sufficient for the current notification path.

The design should still avoid coupling the request workflow directly to a specific user-interface implementation so that a later asynchronous notification mechanism can be introduced if future evidence requires it.

## Decision

Use an in-process notification interface inside the CivicConnect application.

For M2, FR-029 indications are derived from already persisted requester-visible request evidence rather than stored in a separate Notification table.

Status-based indications are derived from RequestStatusHistory. An `updated` indication may also be derived from a new requester-visible ActionEntry under FR-017.

This means an indication remains available on the Requester's next sign-in because its source evidence is persisted under ADR-007. It also avoids creating a second persisted record representing the same event during M2.

The request/status workflow and requester-visible action-entry workflow are producers of the persisted evidence. The notification component is the consumer of that evidence and maps it to the four FR-029 indication types.

No HTTP call, external message broker, separate notification service or separate Notification table is introduced for the M2 path.

## FR-029 event mapping

FR-029's four requester indications map to controlled CivicConnect events as follows:

| FR-029 indication | Persisted event used | Decision |
|---|---|---|
| `accepted` | RequestStatusHistory transition from `New` to `Assigned` or from `New` to `In Progress` | The first transition showing that staff have taken responsibility for the request is treated as acceptance. Either path is valid because ADR-005 permits the request to enter active handling with or without a separate assignment step. Only the first qualifying transition produces the accepted indication. |
| `updated` | A new requester-visible ActionEntry under FR-017 | An authored update intended for the Requester produces the updated indication. Internal ActionEntries do not. Routine internal status transitions are not labelled `updated` merely because the status changed. |
| `rejected` | Any RequestStatusHistory transition whose `toStatus` is `Rejected` | Moving the request into `Rejected` produces the rejected indication. |
| `completed` | The first RequestStatusHistory transition whose `toStatus` is `Resolved` | `Resolved` is treated as completion for FR-029. A later move to `Closed` does not create a second completed indication for the same completion event. |

This mapping makes FR-029 deterministic rather than leaving the notification component to infer meanings independently.

## Producer and consumer

### Producers

There are two sources of requester indications.

The request/status workflow produces the persisted status-history evidence used for `accepted`, `rejected` and `completed`.

It is responsible for:

- validating that the requested transition is allowed under ADR-005;
- applying the authorisation decision from ADR-006;
- asking persistence to commit the request state and required history/audit evidence under ADR-007;
- exposing only successfully committed history as notification source evidence.

The requester-visible action-entry workflow produces the evidence used for `updated`.

It is responsible for:

- applying ADR-006 before an ActionEntry is created;
- requiring an explicit ActionEntry visibility choice;
- persisting the ActionEntry under ADR-007;
- allowing only requester-visible ActionEntries to qualify as FR-029 updates.

Neither producer decides how the resulting indication is presented in the user interface.

### Consumer

The consumer is the in-application notification component.

It is responsible for reading authorised persisted evidence for the authenticated Requester, mapping qualifying evidence to the four FR-029 indication types, and making the resulting indications available through the application.

The consumer does not change request state, create action entries, or bypass the workflow, persistence or authorisation decisions.

## Information exchanged

The notification boundary needs enough information to identify the persisted event and intended recipient without exposing database implementation details.

For a status-derived indication, the logical information is:

- `requestId`
- `requestReference`
- `requesterId`
- `fromStatus`
- `toStatus`
- `occurredAt`

For an update-derived indication, the logical information is:

- `requestId`
- `requestReference`
- `requesterId`
- `actionEntryId`
- `occurredAt`

The indication type is derived from the FR-029 mapping in this ADR rather than supplied by an arbitrary caller.

`visibility` is not part of the status-notification contract. RequestStatusHistory is requester-visible under FR-011.

For ActionEntry-derived `updated` indications, visibility is evaluated before the entry qualifies: only an ActionEntry whose explicit ADR-006 visibility is requester-visible can enter this notification path.

The boundary does not need database connection information, internal audit details, credentials or unrelated personal information.

## Persistence and next-sign-in behaviour

FR-029 requires the indication to be available on the Requester's next sign-in.

M2 satisfies this by deriving indications from persisted evidence:

- RequestStatusHistory persists the status transitions used for `accepted`, `rejected` and `completed`.
- ActionEntry persists the requester-visible authored updates used for `updated`.

ADR-007 owns those records and their transaction boundaries.

A separate notification row is therefore not required for M2.

When the Requester signs in and requests their notifications, the application obtains only the requests and qualifying history/action entries authorised for that Requester under ADR-006 and maps them through this ADR.

The exact user-interface treatment of previously viewed indications is an implementation concern. If M3 requires durable read/unread state, acknowledgement, retries or external delivery, a persisted Notification/Outbox entity can be introduced through a follow-up decision.

## Validation and authorisation

The notification component does not accept a caller-supplied requester identity as proof that the caller may see an indication.

The authenticated Requester identity is evaluated through ADR-006. Persistence queries are scoped to records that the Requester is authorised to see.

For status indications, the underlying history is requester-visible under FR-011.

For update indications, the underlying ActionEntry must additionally be requester-visible.

The notification component does not weaken or recreate the authorisation rules owned by ADR-006.

## Error and failure behaviour

Because M2 indications are derived from committed persistence evidence, there is no separate notification-write failure window.

If the request/status transaction fails, no successful status change/history evidence exists from which to produce an `accepted`, `rejected` or `completed` indication.

If creation of an ActionEntry fails, no `updated` indication exists.

If presentation of notifications temporarily fails, the underlying persisted history or ActionEntry remains available and can be read again on a later request or sign-in.

This is preferable for the current in-process requirement to committing a request change and then depending on an unrelated second notification write.

## Interface shape

The M2 boundary is an internal application contract rather than a network API.

A logical interface is:

```text
getRequesterNotifications(authenticatedRequesterId, since?)
    -> RequesterNotification[]
