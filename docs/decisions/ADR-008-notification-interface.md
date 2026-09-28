# ADR-008: Request status notification interface

- **Status:** Proposed. Awaiting review under issue #63.
- **Date:** 28 September 2026
- **Decision:** Notification interface for M2
- **Drivers:** FR-029, DEC-005, SC-D-01, FEC-03, ADR-001 and the Assignment 2 Task 3 recommendation.

## Context

CivicConnect needs to notify the Requester inside the application when a request status changes. The notification path needs a clear boundary between the part of the system that completes a status change and the part responsible for making that change visible to the Requester.

The current requirement is an in-application notification under FR-029. Email and SMS remain outside the current scope under SC-D-01.

A separate HTTP API, message broker or notification microservice would introduce another network and operational boundary without a current requirement that needs one. CivicConnect is being implemented as a modular monolith, so an in-process interface is sufficient for the current notification path.

The design should still avoid coupling the request workflow directly to a specific user-interface implementation so that a later asynchronous notification mechanism can be introduced if future evidence requires it.

## Decision

Use an in-process notification interface inside the CivicConnect application.

The request/status workflow is the producer. After an authorised status change has been successfully persisted, it supplies notification information through the notification interface.

The notification component is the consumer. It creates the in-application notification information that can later be read by the Requester through the application.

The workflow depends on the interface rather than a concrete notification implementation.

No HTTP call, external message broker or separate notification service is introduced for the M2 path.

## Producer and consumer

### Producer

The producer is the request/status workflow that handles an authorised request status transition.

It is responsible for:

- validating that the requested transition is allowed under ADR-005;
- applying the authorisation decision from ADR-006;
- asking persistence to commit the request state and required history/audit evidence;
- invoking the notification boundary only for a successfully completed status change.

The producer does not decide how the notification is presented to the Requester.

### Consumer

The consumer is the in-application notification component.

It is responsible for receiving the notification information and making the resulting notification available to the intended Requester.

The consumer does not change request status and does not bypass the request workflow or authorisation policy.

## Information exchanged

The notification boundary needs enough information to identify the event and its intended recipient without exposing persistence details.

The initial notification information contains:

- `requestId` — identifies the affected request;
- `requestReference` — the Requester-facing reference;
- `requesterId` — identifies the intended recipient;
- `fromStatus` — the previous status;
- `toStatus` — the new status;
- `changedAt` — when the successful status change occurred;
- `actorId` — identifies who performed the change where required for audit or diagnostic purposes;
- `visibility` — controls whether the information is Requester-visible.

The notification interface does not expose database table names, ORM entities or internal SQL details.

A possible application-level contract is:

`notifyStatusChanged(notification)`

where `notification` contains the fields listed above.

The exact code signature may follow the implementation language conventions, but the producer/consumer responsibilities and information boundary remain the same.

## Interaction sequence

The intended M2 interaction is:

1. A status-change request reaches the application.
2. Authentication and authorisation are evaluated.
3. ADR-005 determines whether the requested transition is valid.
4. The request status and its required history/audit evidence are persisted according to DEC-011.
5. The transaction completes successfully.
6. The workflow invokes the in-process notification interface.
7. The notification component records or exposes the Requester-visible notification.
8. The Requester can retrieve the notification through the normal authorised application path.

A rejected or rolled-back status change must not create a successful status-change notification.

## Why an in-process interface

An in-process interface is proportionate to the current architecture and requirement.

CivicConnect currently needs in-application notification. The producer and consumer are modules inside the same application and there is no current requirement for independent deployment, independent scaling or external notification delivery.

Introducing REST between these modules would create a network boundary only because API technology is available, not because the problem requires one. It would add network failure handling, endpoint versioning, authentication between services and deployment complexity without improving the current FR-029 path.

A message broker would similarly add infrastructure and asynchronous delivery behaviour that is not currently required.

The interface still creates a deliberate application boundary. The workflow depends on the notification contract rather than a concrete implementation, so the implementation can later be replaced or adapted without changing the workflow decision itself.

## Validation

Validation occurs before the notification is accepted.

The producer must only create a notification after a valid and authorised status transition has succeeded.

At the notification boundary:

- `requestId` must identify the affected request;
- `requestReference` must be present;
- `requesterId` must identify the intended recipient;
- `toStatus` must be present;
- `changedAt` must be present;
- `visibility` must permit Requester visibility before the information is exposed to the Requester.

Invalid notification input is rejected rather than silently converted into a different event.

The notification component does not independently decide that a status transition was valid. That responsibility remains with the workflow and authorisation components.

## Error and failure behaviour

The status change is the authoritative business operation. Notification is a consequence of that successful change.

A validation, authorisation or transition failure before persistence means no status-change notification is produced.

A persistence failure means the status change is rolled back according to DEC-011 and no successful status-change notification is produced.

Because the M2 notification call is in-process, an unexpected notification-component failure is visible to the application and must be logged with enough context to diagnose the failed notification without exposing sensitive information.

The system must not report that the request status itself failed if the status transaction has already committed successfully only because a later notification action failed.

This creates a possible failure window between the committed status change and successful notification. For the current in-application M2 scope, that limitation is accepted and must be covered by testing and operational evidence.

If future requirements demand guaranteed asynchronous delivery or external channels, this failure window is one reason to revisit the interaction mechanism.

## Security boundary

The notification interface does not create a new trust boundary or bypass ADR-006.

The Requester must only be able to retrieve notifications that the authorisation policy permits that Requester to see.

`requesterId` identifies the intended recipient, while `visibility` prevents internal-only information from being exposed as Requester-visible information.

Internal implementation details, credentials, database information and unrelated user information must not be included in the notification contract.

The interface operates inside the application process. If the notification mechanism later crosses a process or network boundary, authentication, transport security and service-to-service authorisation must be reconsidered at that time.

## Versioning implications

The M2 interface is an internal application contract rather than a public network API.

Changes should therefore remain backward compatible with existing callers where practical. Adding optional notification information is less disruptive than renaming or removing fields already required by the producer or consumer.

Because no external notification API is being published in M2, independent HTTP API versioning is not required for this interface.

If the boundary later becomes an asynchronous event or external service contract, its event/schema compatibility and versioning policy must be decided explicitly before that change is implemented.

## Email and SMS remain deferred

This ADR does not select or implement email or SMS delivery.

SC-D-01 remains deferred.

No email provider, SMS provider, external notification platform or related production dependency is selected by this decision.

The current decision is only for the FR-029 in-application notification path.

## Reopening SC-D-01

SC-D-01 should be reconsidered when there is evidence that in-application notification is insufficient.

Evidence that could reopen the decision includes:

- an approved requirement for email or SMS;
- stakeholder evidence that users need notification while they are not using CivicConnect;
- a measurable delivery-time requirement that the in-process mechanism cannot satisfy;
- a requirement for notification delivery independent of the application request lifecycle;
- reliability evidence showing that notification work needs durable asynchronous processing;
- scale evidence showing that notification processing materially affects request handling;
- FEC-03 being resolved in favour of background processing.

Until one of those conditions exists, external notification channels remain deferred.

## Future asynchronous extension

The interface is intentionally kept separate from the concrete in-application implementation.

If future evidence requires durable asynchronous delivery, the producer-side contract can become an event publication boundary. An adapter could publish a status-change event to background processing or a message broker while the workflow continues to depend on the same conceptual notification boundary.

That change would require a new decision covering delivery guarantees, retries, idempotency, ordering, dead-letter handling, security, schema compatibility and operational monitoring.

Those mechanisms are not introduced prematurely in M2.

## Trade-offs accepted

- An in-process interface is simpler to build, test and operate than a network service, but it does not independently scale from the application.
- Avoiding a broker reduces infrastructure and failure modes, but does not provide durable asynchronous delivery.
- Keeping notification separate from the workflow reduces coupling, but introduces another internal contract that must be maintained.
- Triggering notification after the successful status transaction avoids notifying users about rolled-back changes, but leaves a failure window in which the status can be committed while notification later fails.
- Email and SMS are not provided in M2, but this avoids choosing external providers before there is an approved requirement and evidence for them.

## Risks and controls

1. **A Requester receives information belonging to another request or user.**  
   Control: recipient selection uses `requesterId`, retrieval remains subject to ADR-006, and `visibility` controls Requester-visible information.

2. **A notification is created for a status change that did not commit.**  
   Control: the notification boundary is invoked only after successful persistence.

3. **A status change commits but notification processing fails.**  
   Control: record the failure for diagnosis and test the failure path. Reconsider durable asynchronous processing if delivery reliability becomes a requirement.

4. **The notification interface becomes coupled to a specific UI or transport.**  
   Control: keep the contract application-level and do not expose UI, HTTP, database or provider-specific implementation details.

5. **External notification infrastructure is introduced without evidence.**  
   Control: keep SC-D-01 deferred and use the explicit reopening conditions in this ADR.

## Evidence

- Issue #63 requires the producer, consumer and information exchanged to be defined.
- Issue #63 requires a proportionate interaction mechanism and specifically warns against introducing a network boundary merely because APIs were taught.
- FR-029 requires in-application notification.
- DEC-005 defines the current notification scope.
- SC-D-01 keeps email and SMS deferred.
- FEC-03 records the unresolved background-processing question.
- Assignment 2 Task 3 recommends an in-process interface with an extension point for asynchronous events.
- ADR-001 establishes the modular-monolith direction.
- ADR-005 defines the request status-transition rules.
- ADR-006 defines authorisation and visibility.
- DEC-011 defines persistence and status/history consistency.

## Consequences

- The M2 implementation needs a notification interface in the application code where the end-to-end status-change path is built.
- The RTM interface column for FR-029 should reference this ADR.
- PED section 23 can describe the status-notification boundary as an in-process interface.
- Email and SMS remain deferred under SC-D-01.
- FEC-03 remains open until evidence establishes whether background processing is necessary.
- A later move to asynchronous or external notification delivery requires an explicit follow-up decision rather than silently changing this boundary.
