# ADR-007: Data and persistence design

- **Status:** Proposed. Awaiting two approvals under issue #58.
- **Date:** 28 September 2026
- **Decision Log entry:** DEC-011, recorded in M1 as deferred to M2.
- **Drivers:** FR-005 to FR-009, FR-011, FR-012, FR-017, FR-018, FR-020, FR-021, FR-025, FR-026, NFR-011, FEC-06, ADR-001 rules 2, 3 and 5.

## Context

CivicConnect needs to store requests, users, categories, action entries, status history, resolution information and audit information. The data is structured and strongly related. Request creation also has consistency requirements that cannot safely depend only on the interface.

FR-008 requires a reference for a request. Assignment 2 Task 2 found that generating this by reading the current maximum value and adding one creates a race when two requests are submitted at the same time. The reference therefore needs database-level atomic generation and a uniqueness constraint.

ADR-001 already decides that CivicConnect uses one relational store. It also requires state changes and their audit evidence to be written in the same transaction, and requires scoped queries to take their scope from the authorisation policy.

The authorisation design in ADR-006 uses the application-level field names `requesterId`, `categoryId` and `visibility`. Those names are retained in the Prisma model and application interfaces. Physical PostgreSQL columns may use snake_case through explicit Prisma `@map` mappings.

## Entities and relationships

The initial model contains these core entities:

| Entity | Purpose | Important relationships |
|---|---|---|
| User | A CivicConnect user and their role | submits Requests; may be assigned Requests; authors ActionEntries; creates auditable changes |
| Category | Classifies requests and provides a scope boundary | has many Requests; users may be authorised for categories |
| Request | The main service-request record | belongs to a requester and category; may have an assignee; has status, reported urgency, priority, location and resolution information |
| ActionEntry | A dated note written by Staff or a Coordinator | belongs to one Request; records author, body, explicit visibility and time |
| RequestStatusHistory | Immutable history of request status changes | belongs to one Request and records actor, old status, new status and time |
| AuditEntry | Immutable structured record of an auditable field change | belongs to a Request where applicable and records actor, field changed, previous value, new value and time |
| UserCategory | Join between users and categories they are authorised to work with | belongs to one User and one Category |

A User may submit many Requests. Each Request has exactly one requester and one category. A Request may have an assignee depending on its current state.

A Request has many action entries, status-history entries and audit entries. Action entries are separate from the audit trail: they are authored operational notes under FR-017, while audit entries are system evidence of changes under FR-025 and FR-026.

History and audit rows are append-only once created.

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
- `location`
- `reportedUrgency` — urgency supplied by the Requester under FR-005/FR-021; distinct from staff-controlled priority
- `status`
- `priority`
- `resolutionSummary` — nullable until resolution; stored when required by FR-018 and available through the Requester-visible authorised path
- `createdAt`
- `updatedAt`

`reportedUrgency` and `priority` are deliberately separate. Reported urgency records what the Requester supplied and is not edited by Staff. Priority is the operational prioritisation field governed separately by the application rules.

Indexes are required on the fields used by queue and scope queries, initially `requesterId`, `categoryId`, `status`, `assigneeId` and `createdAt`. Composite indexes are added from measured query evidence rather than guessed in advance.

### ActionEntry

- `id` — primary key
- `requestId` — foreign key to Request, not null
- `authorId` — foreign key to User, not null
- `body` — note content, not null
- `visibility` — not null and has no database or application default; the author must choose it explicitly
- `createdAt`

ActionEntry is the entity governed by the ADR-006 `actionEntryScope`. It is not an AuditEntry.

Requester-visible action entries are returned only through the authorised Requester path. Internal action entries remain subject to ADR-006.

### RequestStatusHistory

- `id` — primary key
- `requestId` — foreign key to Request, not null
- `fromStatus`
- `toStatus`
- `actorId` — foreign key to User, not null
- `reason` — nullable where the transition does not require one
- `createdAt`

RequestStatusHistory provides the status timeline required by FR-011. It is not a second FR-025 audit entry for the same status change.

### AuditEntry

- `id` — primary key
- `requestId` — nullable foreign key to Request where the event concerns a request
- `actorId` — foreign key to User, not null
- `fieldChanged` — identifies the changed audited field, including `status`, `assigneeId` or `priority`
- `previousValue` — structured previous value; nullable where no previous value exists
- `newValue` — structured new value; nullable only where the audited operation legitimately clears a value
- `createdAt`

For FR-025, each audited change produces exactly one AuditEntry. A status change also appends RequestStatusHistory for the requester-facing status timeline required by FR-011, but that history row is not counted as a second FR-025 audit entry.

The structured `fieldChanged`, `previousValue` and `newValue` fields allow the NFR-011 reconciliation check to compare current request state against recorded changes without parsing free-text audit details.

Audit and status-history records are not updated or deleted through normal application operations.

## Prisma and physical schema authority

The authoritative application data model is `prisma/schema.prisma`, consistent with ADR-002 and the server bootstrap in #90.

Prisma model fields use the application names required by the architecture, including `requesterId` and `categoryId`. Where PostgreSQL uses snake_case physical names such as `requester_id` and `category_id`, Prisma uses explicit `@map` or `@@map` mappings.

The SQL under this decision represents the initial physical migration/database shape. It must remain consistent with the authoritative Prisma schema and is not an independent competing model.

Future schema changes are made through the controlled Prisma schema and migration process rather than manually evolving two unrelated schema definitions.

## Lifecycle and ownership

The persistence module owns database access and transaction boundaries. Domain modules use it through declared interfaces under ADR-001 rather than issuing unrelated database operations throughout the application.

A Request is created in `New` state and remains the stable parent record throughout its lifecycle. Status changes update the current status on Request, append the RequestStatusHistory timeline row, and create exactly one structured AuditEntry for the status field change.

Assignee and priority changes similarly create exactly one AuditEntry containing the previous and new values.

Categories and users may become inactive instead of being deleted where deletion would break historical references. Existing requests therefore continue to refer to the user and category that existed when the activity occurred.

Action entries are operational notes and remain separate from system-generated audit evidence.

Audit entries are append-only. A correction is represented by a later auditable action rather than editing the historical entry.

## Persistence decision

Use the relational PostgreSQL database selected under DEC-008 as the transactional system of record, with Prisma as the authoritative application schema and persistence mapping.

The model is relational because the main data has stable relationships and integrity rules: every request has a requester and category, action entries and status history belong to requests, category scope depends on user/category relationships, and audit records refer back to actors and requests.

The access pattern is also relational. The main operational reads filter and sort requests by requester, category, status, assignee and creation time. Management reporting reads the same transactional records for now, as already decided by ADR-001.

Foreign keys, unique constraints and transactions provide integrity that application validation alone cannot guarantee.

## Request reference generation

Request references are generated from a database-native atomic sequence.

The application obtains the next sequence value atomically and formats it into the externally visible reference required by FR-008. The `reference` column also has a database unique constraint.

The sequence is therefore intentionally consumed application-side inside the request-creation operation rather than being inferred from `MAX(reference)`.

The application does not calculate the next reference by reading the current maximum reference. Two concurrent submissions therefore cannot select the same next value.

A sequence value may be consumed by a transaction that later fails. This means references can contain gaps. That trade-off is accepted because uniqueness and concurrency safety are requirements; consecutive gap-free numbering is not.

The reference is an external business identifier and is not used as the database primary key. The internal `id` remains independent from the displayed reference.

## Request creation transaction

Creation of a request is one transaction:

1. Validate the authenticated requester and supplied input, including title, description, category, location and reported urgency.
2. Confirm that referenced records such as the category exist and are valid for the operation.
3. Obtain the next atomic reference value.
4. Insert the Request in `New` state.
5. Insert the initial RequestStatusHistory row with `fromStatus = null` and `toStatus = New` so the FR-011 timeline starts at submission. Request creation does not create an FR-025 AuditEntry because FR-025 audits changes to an existing value and creation has no previous value.
6. Commit.

If a required write fails, the transaction rolls back and no partial Request is exposed.

A consumed sequence value is not rolled back. The resulting numbering gap is the accepted trade-off described above.

## Status, assignee and priority audit consistency

A controlled state change is transactional.

The service first uses the workflow decision from ADR-005 and the authorisation decision from ADR-006 where applicable.

For a status change, the same transaction:

1. updates the current Request status;
2. appends the RequestStatusHistory timeline row; and
3. writes exactly one FR-025 AuditEntry with `fieldChanged = status`, the previous value, new value, actor and timestamp.

For an assignee or priority change, the same transaction updates the Request and writes exactly one corresponding FR-025 AuditEntry with the previous and new values.

This implements ADR-001 rule 3: current request state cannot successfully change while the required audit evidence for that change fails to persist.

The separate RequestStatusHistory row exists to satisfy the status-history requirement and requester-facing timeline; it does not represent a duplicate FR-025 audit entry.

## Resolution summary

FR-018 resolution information is stored on the Request as `resolutionSummary`.

It remains nullable before the request reaches the point at which a resolution summary is required. When recorded, it is persisted with the request and exposed to the Requester only through the authorised Requester-visible path.

If later requirements show that multiple resolution records or revisions are required, that would justify a separate entity and follow-up decision. M2 does not introduce that complexity without evidence.

## Validation

Validation is deliberately split across three layers.

**UI validation** gives early feedback for required fields and obvious formatting errors. It improves usability but is not trusted for integrity.

**Service validation** enforces business rules, workflow rules and authorisation because callers can bypass a user interface. This includes preventing Staff from changing `reportedUrgency` and requiring an explicit ActionEntry visibility choice.

**Database constraints** protect facts that must remain true regardless of the caller, including primary keys, foreign keys, uniqueness, required relationships, the unique request reference and non-null ActionEntry visibility.

The database schema should also constrain `status` to the seven states defined by ADR-005 so an invalid status cannot be stored by bypassing service validation.

The layers therefore complement rather than replace each other.

## Authorisation and sensitivity

Persistence does not invent its own access rules.

Every scoped request query receives the condition produced by ADR-006. The Prisma/application model deliberately exposes `requesterId` and `categoryId` under those names because those are the fields the policy uses.

ActionEntry uses the explicit `visibility` field expected by ADR-006. AuditEntry does not reuse that field because the audit trail and authored action entries have different purposes and access rules.

Sensitive data is returned only through authorised application queries. Clients do not connect directly to the database under ADR-001.

## Audit immutability

FR-026 requires audit history to remain immutable through normal operations.

The application persistence interface therefore exposes append/read operations for audit evidence and does not expose normal update or delete operations for AuditEntry.

Production database privileges should additionally deny application-level UPDATE and DELETE access to the audit table where the selected deployment model permits separate privileges. This provides database-level enforcement in addition to the application contract.

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
- Status is stored both as the current value on Request and in RequestStatusHistory. This duplicates one fact intentionally: Request supports efficient operational queries while history preserves the requester-facing timeline.
- FR-025 audit evidence is stored separately from RequestStatusHistory so all audited fields use one structured reconciliation model.
- ActionEntry is separate from AuditEntry because authored operational notes and immutable system audit evidence have different requirements.
- Relational constraints make schema changes more controlled than a schemaless store, but that cost is accepted because the project depends heavily on relationships and integrity.
- Users and categories referenced by history are deactivated rather than physically deleted through normal operations, which preserves historical integrity at the cost of retaining those records.

## Risks created

1. **Reporting load degrades operational request queries.**  
   Mitigation: indexes and NFR-001 measurement first; separate the reporting read path when the ADR-001 trigger is reached. Related to FEC-06.

2. **A query bypasses the authorisation scope and exposes another user's records.**  
   Mitigation: all scoped request and action-entry queries take their scope from ADR-006 and M3 executes the negative authorisation matrix. Related to NFR-005 and FEC-01.

3. **Audit evidence becomes inconsistent with current request state if writes are performed outside the transaction boundary.**  
   Mitigation: persistence exposes transactional operations for controlled state changes, structured audit rows record previous/new values, and service tests verify rollback and NFR-011 reconciliation behaviour. Related to FR-025 and NFR-011.

4. **A backup exists but cannot actually restore the service.**  
   Mitigation: DEC-010 must define recoverability evidence, including a restore test, before production readiness is claimed.

5. **The Prisma model and physical database migration drift apart.**  
   Mitigation: `prisma/schema.prisma` is authoritative, physical names use explicit mappings, and migrations are generated/reviewed against that model rather than maintaining an independent schema definition.

6. **Reported urgency is accidentally treated as staff-controlled priority.**  
   Mitigation: persist them as separate fields and enforce that staff operations cannot modify `reportedUrgency`.

7. **Action-entry visibility is accidentally defaulted and exposes an internal note.**  
   Mitigation: `visibility` is mandatory with no default and must be explicitly selected for every ActionEntry.

## Evidence

- M1 baseline: FR-005 to FR-009, FR-011, FR-012, FR-017, FR-018, FR-020, FR-021, FR-025, FR-026, NFR-011 and FEC-06.
- ADR-001: modular monolith over one relational store, scoped queries through the policy module, state and audit written in one transaction, and reporting on the transactional store for now.
- ADR-002: Prisma is the selected persistence tooling and `prisma/schema.prisma` is the application schema source.
- ADR-005: the status-transition mechanism used before persistence applies a state change.
- ADR-006: authorisation and query scope, including `requesterId`, `categoryId` and ActionEntry `visibility`.
- Assignment 2 Task 2: database-native atomic reference generation, uniqueness at the database, transactional creation and layered validation.
- Issue #58.
- Review feedback on PR #97 identifying missing FR-005/FR-021 fields, ActionEntry separation, structured FR-025 audit evidence and schema-source ambiguity.

## Later consequences

- #65 implements the end-to-end path against this model.
- ADR-006 can use `requesterId`, `categoryId` and ActionEntry `visibility` without an application-field mapping layer.
- The RTM data column references this ADR for the requirements implemented by the persistence model.
- The Prisma schema and initial migration must implement this model before #58 is considered complete.
- ADR-008 must choose a notification-persistence approach consistent with this model before the notification path is implemented.
- DEC-010 supplies the concrete persistent database hosting, backup and restore direction.
- If FEC-06 supplies materially different volume or retention evidence, or the NFR-001 measurement crosses the ADR-001 trigger, the reporting read path is reconsidered without replacing the transactional model.
