# ADR-007: Data and persistence design

- **Status:** Proposed. Awaiting two approvals under issue #58.
- **Date:** 28 September 2026
- **Decision Log entry:** DEC-011, recorded in M1 as deferred to M2.
- **Drivers:** FR-005 to FR-009, FR-012, FR-025, FEC-06, ADR-001 rules 2, 3 and 5.

## Context

CivicConnect needs to store requests, users, categories, status history and audit information. The data is structured and strongly related. Request creation also has consistency requirements that cannot safely depend only on the interface.

FR-008 requires a reference for a request. Assignment 2 Task 2 found that generating this by reading the current maximum value and adding one creates a race when two requests are submitted at the same time. The reference therefore needs database-level atomic generation and a uniqueness constraint.

ADR-001 already decides that CivicConnect uses one relational store. It also requires status changes and their audit entries to be written in the same transaction, and requires scoped queries to take their scope from the authorisation policy.

The authorisation design in ADR-006 uses `requesterId`, `categoryId` and `visibility`. Those names are therefore retained in this model so that persistence and authorisation do not need an unnecessary mapping layer.

## Entities and relationships

The initial model contains these core entities:

| Entity | Purpose | Important relationships |
|---|---|---|
| User | A CivicConnect user and their role | submits Requests; may be assigned Requests; creates history and audit entries |
| Category | Classifies requests and provides a scope boundary | has many Requests; users may be authorised for categories |
| Request | The main service-request record | belongs to a requester and category; may have an assignee; has status and history |
| RequestStatusHistory | Immutable history of request status changes | belongs to one Request and records actor, old status, new status and time |
| AuditEntry | Immutable record of auditable activity | belongs to a Request where applicable and records actor, action, visibility and time |
| UserCategory | Join between users and categories they are authorised to work with | belongs to one User and one Category |

A User may submit many Requests. Each Request has exactly one requester and one category. A Request may have an assignee depending on its current state.

A Request has many status-history entries and may have many audit entries. History and audit rows are append-only once created.

## Initial schema

The logical initial schema is:

### User

- `id` — primary key
- `name`
- `email` — unique
- `role`
- `active`
- `createdAt`
- `updatedAt`

### Category

- `id` — primary key
- `name` — unique
- `active`
- `createdAt`
- `updatedAt`

### UserCategory

- `userId` — foreign key to User
- `categoryId` — foreign key to Category
- unique (`userId`, `categoryId`)

### Request

- `id` — internal primary key
- `reference` — externally visible request reference, unique and not null
- `requesterId` — foreign key to User, not null
- `categoryId` — foreign key to Category, not null
- `assigneeId` — nullable foreign key to User
- `title`
- `description`
- `status`
- `priority`
- `createdAt`
- `updatedAt`

Indexes are required on the fields used by the queue and scope queries, initially `requesterId`, `categoryId`, `status`, `assigneeId` and `createdAt`. Composite indexes are added only from measured query evidence rather than guessed in advance.

### RequestStatusHistory

- `id` — primary key
- `requestId` — foreign key to Request, not null
- `fromStatus`
- `toStatus`
- `actorId` — foreign key to User, not null
- `reason` — nullable where the transition does not require one
- `createdAt`

### AuditEntry

- `id` — primary key
- `requestId` — nullable foreign key to Request where the event concerns a request
- `actorId` — foreign key to User, not null
- `action`
- `visibility` — including `requester-visible` where applicable
- `details`
- `createdAt`

Audit and status-history records are not updated or deleted through normal application operations.

## Lifecycle and ownership

The persistence module owns database access and transaction boundaries. Domain modules use it through declared interfaces under ADR-001 rather than issuing unrelated database operations throughout the application.

A Request is created in `New` state and remains the stable parent record throughout its lifecycle. Status changes update the current status on Request and append a RequestStatusHistory record. The history is not reconstructed by overwriting previous records.

Categories and users may become inactive instead of being deleted where deletion would break historical references. Existing requests therefore continue to refer to the user and category that existed when the activity occurred.

Audit entries are append-only. A correction is represented by a later auditable action rather than editing the historical entry.

## Persistence decision

Use the relational PostgreSQL database selected under DEC-008 as the transactional system of record.

The model is relational because the main data has stable relationships and integrity rules: every request has a requester and category, status history belongs to a request, category scope depends on user/category relationships, and audit records refer back to actors and requests.

The access pattern is also relational. The main operational reads filter and sort requests by requester, category, status, assignee and creation time. Management reporting reads the same transactional records for now, as already decided by ADR-001.

Foreign keys, unique constraints and transactions provide integrity that application validation alone cannot guarantee.

## Request reference generation

Request references are generated from a database-native atomic sequence.

The generated sequence value is formatted into the externally visible reference required by FR-008. The `reference` column also has a database unique constraint.

The application does not calculate the next reference by reading the current maximum reference. Two concurrent submissions can therefore never select the same next value.

A sequence value may be consumed by a transaction that later fails. This means references can contain gaps. That trade-off is accepted because uniqueness and concurrency safety are requirements; consecutive gap-free numbering is not.

The reference is an external business identifier and is not used as the database primary key. The internal `id` remains independent from the displayed reference.

## Request creation transaction

Creation of a request is one transaction:

1. Validate the authenticated requester and supplied input.
2. Confirm that referenced records such as the category exist and are valid for the operation.
3. Obtain the next atomic reference value.
4. Insert the Request.
5. Insert the initial status-history/audit evidence required for creation.
6. Commit.

If a required write fails, the transaction rolls back and no partial Request is exposed.

A consumed sequence value is not rolled back. The resulting numbering gap is the accepted trade-off described above.

## Status changes and audit consistency

A status change is also transactional.

The service first uses the workflow decision from ADR-005 and the authorisation decision from ADR-006. If permitted, the Request status update and its immutable history/audit entry are committed in the same database transaction.

This implements ADR-001 rule 3: the system cannot successfully change the current status while failing to record the evidence of that change.

## Validation

Validation is deliberately split across three layers.

**UI validation** gives early feedback for required fields and obvious formatting errors. It improves usability but is not trusted for integrity.

**Service validation** enforces business rules, workflow rules and authorisation because callers can bypass a user interface.

**Database constraints** protect facts that must remain true regardless of the caller, including primary keys, foreign keys, uniqueness, required relationships and the unique request reference.

The layers therefore complement rather than replace each other.

## Authorisation and sensitivity

Persistence does not invent its own access rules.

Every scoped request query receives the condition produced by ADR-006. The data model deliberately exposes `requesterId` and `categoryId` under those names because those are the fields the policy uses.

Requester-visible versus internal action information uses the `visibility` field expected by ADR-006.

Sensitive data is returned only through authorised application queries. Clients do not connect directly to the database under ADR-001.

## Growth, reporting and bottlenecks

The operational workload and management reporting share the transactional store initially. This keeps the M2 design proportionate while expected volume and retention remain unresolved under FEC-06.

The main expected bottleneck is the request queue and reporting competing for the same database resources as the number of requests grows.

The first control is appropriate indexing and query measurement, not premature replication.

ADR-001 already defines the trigger for revisiting this decision: if the NFR-001 measurement against 5,000 requests exceeds its target while reporting runs, or later volume and retention evidence projects materially beyond that baseline, reporting can move behind a separate read path or replica without changing the Request model.

## Availability, recovery and backup implications

The database is the system of record, so its availability and recoverability are part of production readiness.

Deployment under DEC-010 must therefore provide persistent storage independent of an application process restart and a defined backup and restore mechanism. A backup is not considered useful evidence until restoration can be demonstrated.

The exact hosting platform, backup schedule and recovery procedure belong to the deployment decision rather than this ADR.

## Trade-offs accepted

- Database-native sequence generation can leave gaps after failed or rolled-back transactions. This is accepted because uniqueness is required while gap-free numbering is not.
- Reporting shares the transactional database initially. This keeps the architecture small but may create contention as volume grows; FEC-06 and the NFR-001 measurement are the triggers to revisit it.
- Status is stored both as the current value on Request and as immutable history. This duplicates one fact intentionally: the Request supports efficient operational queries while history preserves the audit trail.
- Relational constraints make schema changes more controlled than a schemaless store, but that cost is accepted because the project depends heavily on relationships and integrity.
- Users and categories referenced by history are deactivated rather than physically deleted through normal operations, which preserves historical integrity at the cost of retaining those records.

## Risks created

1. **Reporting load degrades operational request queries.** Mitigation: indexes and NFR-001 measurement first; separate the reporting read path when the ADR-001 trigger is reached. Related to FEC-06.

2. **A query bypasses the authorisation scope and exposes another user's records.** Mitigation: all request queries take their scope from ADR-006 and M3 executes the negative authorisation matrix. Related to NFR-005 and FEC-01.

3. **Audit or history evidence becomes inconsistent with current request state if writes are performed outside the transaction boundary.** Mitigation: persistence exposes transactional operations for creation and status change, and service tests verify rollback behaviour. Related to FR-025 and NFR-011.

4. **A backup exists but cannot actually restore the service.** Mitigation: DEC-010 must define recoverability evidence, including a restore test, before production readiness is claimed.

## Evidence

- M1 baseline: FR-005 to FR-009, FR-012, FR-025 and FEC-06.
- ADR-001: modular monolith over one relational store, scoped queries through the policy module, status and audit written in one transaction, and reporting on the transactional store for now.
- ADR-005: the status-transition mechanism used before persistence applies a state change.
- ADR-006: authorisation and query scope, including the fields `requesterId`, `categoryId` and `visibility`.
- Assignment 2 Task 2: database-native atomic reference generation, uniqueness at the database, transactional creation and layered validation.
- Issue #58.

## Later consequences

- #65 implements the end-to-end path against this model.
- ADR-006 can use `requesterId`, `categoryId` and `visibility` without a field-name mapping.
- The RTM data column references this ADR for FR-005 to FR-009, FR-012 and FR-025.
- DEC-010 supplies the concrete persistent database hosting, backup and restore direction.
- If FEC-06 supplies materially different volume or retention evidence, or the NFR-001 measurement crosses the ADR-001 trigger, the reporting read path is reconsidered without replacing the transactional model.
