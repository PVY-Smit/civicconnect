# Architecturally significant requirements and quality drivers

**Status:** drafted for M2 under issue #56, revised on 17 September 2026 after review on #71. Feeds
DEC-009 (ADR-001), DEC-008, DEC-010, DEC-011 and the ASR column of the RTM.

## How these were selected

A baselined requirement is treated as architecturally significant here when a plausible change to it
would change the structure of the system, and not only the content of a screen, a query or a
configuration value. Each driver below names the requirements it comes from, the stakeholder,
constraint, risk or forward consideration that is the evidence for it, the measurable expectation
already committed in the M1 baseline, and the decisions it constrains.

Quality attributes that are committed and measurable but do not shape structure are listed at the end
with the reason they are excluded. The M2 brief asks for project-specific drivers rather than a list
of every attribute taught, so the exclusions are part of the evidence.

| Driver | One-line statement |
|---|---|
| ASR-01 | Authorisation is decided on the server for every protected function, and scope reaches individual records |
| ASR-02 | The staff queue stays responsive at the baselined volume while management reporting reads the same data, and a submission is acknowledged quickly |
| ASR-03 | Every status, assignee and priority change produces exactly one audit entry that nothing can edit |
| ASR-04 | The team can change the system safely under two-approval review with three people |
| ASR-05 | The service runs inside a free tier at the committed availability |
| ASR-06 | Three students can build and support the result inside the milestone schedule. A bound on complexity, with no measurable target |

ASR-01 to ASR-05 each carry a measurable target from the M1 baseline. ASR-06 does not, so wherever
the drivers are compared in a later decision, ASR-06 is treated as a bound on complexity and is not
scored alongside the other five.

## ASR-01 Server-side authorisation with record-level scope

- **Requirements:** NFR-005 authorisation enforced on the server for every protected function; FR-002
  role-based access with every permission decision server-side; FR-012 a Requester cannot retrieve a
  request they did not submit; FR-013 the queue is limited to authorised categories; FR-011 only
  requester-visible entries are shown to the Requester.
- **Evidence:** STK-06 sponsor and STK-07 information officer interest; CON-05 security is a
  lifecycle-wide responsibility and POPIA s19 applies; RSK-05 (15, High) personal information
  disclosed to a user not entitled to see it; FEC-01 records that record-level authorisation added
  after the data model is fixed touches every query and tends to be implemented in the interface
  layer where it can be bypassed.
- **Measurable expectation:** NFR-005 as baselined, zero successful accesses across the negative-test
  matrix derived from the access matrix, executed directly against endpoints rather than through the
  interface.
- **What it drives:** a single server-side enforcement point that no client can bypass; authorisation
  expressed both in the query path, which decides which records are returned, and in the action path,
  which decides whether an action is allowed; a data model that carries requester and category so
  that scope is expressible in the query (DEC-011). This is the first constraint on DEC-009 and on
  design decision 2 (#62).

## ASR-02 Responsiveness at the baselined volume: the queue, reporting and submission

- **Requirements:** NFR-001 95th percentile under 2.0 seconds for the first page of a 5 000-request
  queue; FR-013 and FR-014 queue retrieval with search, filter and sort; FR-022 to FR-024 management
  counts, breakdowns and the overdue list; NFR-002 95th percentile under 3.0 seconds from submission
  to acknowledgement.
- **Evidence:** STK-02 staff and STK-04 management; STK-01, since NFR-002 exists so that a slow
  acknowledgement does not lead a Requester to submit the same request again; FEC-06 records that
  aggregate reporting against the transactional store can degrade the staff queue, and that expected
  volume and retention have not been supplied by the organisation.
- **Measurable expectation:** NFR-001 as baselined, 20 timed retrievals against a seeded
  5 000-request dataset, recording the distribution rather than the mean; and NFR-002 as baselined,
  20 timed submissions on the target environment under normal conditions.
- **What it drives:** data access and indexing (DEC-011); whether reporting reads the transactional
  store directly or through a separate read path; and it counts against any structure that answers a
  single queue page through several network calls. On the write side, request creation is a
  different path from a status change, and NFR-002 keeps it to one transaction inside the
  application, with no synchronous call to anything outside it, so the target does not depend on an
  external service.

## ASR-03 Auditability of every status, assignee and priority change

- **Requirements:** NFR-011 every such change produces exactly one complete audit entry; FR-025 the
  entry captures actor, timestamp, previous value and new value; FR-026 no application function edits
  or deletes an audit entry; FR-016 a status change is permitted only where the status model allows
  it and only for an authorised role; FR-018 to FR-021 the guards on individual transitions.
- **Evidence:** STK-04 accountability for service performance and reporting; STK-07; RSK-09 the
  status model proves ambiguous or incomplete after data exists; FEC-02 records that every management
  figure is derived from status and timestamps, and that a state redefined after go-live cannot be
  applied to historical records.
- **Measurable expectation:** NFR-011 as baselined, a reconciliation query comparing change counts to
  audit counts, with no orphaned or partial entries.
- **What it drives:** one write path for a status change, so that no component can change status
  without producing its audit entry; a transaction boundary that makes the change and its audit entry
  atomic; an append-only audit store with no delete path (DEC-011); and the transition mechanism
  decided in #61.

## ASR-04 Changeability under two-approval review with three people

- **Requirements:** NFR-012 automated tests covering every Must-priority functional requirement pass
  on every pull request before merge is permitted.
- **Evidence:** CON-08 two approvals from members other than the author; CON-02 engineering time is
  bounded and uneven; STK-09 the development team; RSK-04 (12, High) controlled change stalls when
  one member is unavailable; FEC-07 review capacity; A2 Task 4 measured what unmergeable artefacts
  cost this team during M1.
- **Measurable expectation:** NFR-012 as baselined, on every pull request.
- **What it drives:** module seams that can be tested in process without standing up infrastructure;
  the number of deployable units three people have to run, review and keep consistent; and the checks
  introduced in #67.

## ASR-05 Operating inside the free tier at the committed availability

- **Requirements:** NFR-013 running cost of zero within free-tier limits, with the limits documented;
  NFR-003 98 percent availability across published service hours, assessed monthly.
- **Evidence:** CON-03 no budget for paid tiers; CON-07 the campus cannot guarantee that a platform
  is available or supported; RSK-02 (12, High) the free tier proves unable to meet availability or
  background-processing needs; RSK-13 (12, High) behaviour differs between environments; FEC-03
  background processing capability; FEC-05 environment parity and rollback.
- **Measurable expectation:** NFR-003 and NFR-013 as baselined, including the requirement that a
  claim that a platform is free is supported by its published limits.
- **What it drives:** how many always-on processes the design assumes; whether a broker or background
  worker is required, which is why SC-D-01 remains deferred; and DEC-010.

## ASR-06 Buildable and supportable by three students inside the schedule

- **Source:** this is not a requirement. It is CON-06 team capability, carried here as a driver
  because it is the cause of RSK-01 (20, Critical), the highest-scored risk on the register.
- **Evidence:** CON-06 limited exposure to controlled team engineering at this scale; CON-02 four
  assessed milestones alongside other modules; RSK-01 the team does not reach working competence
  early enough; RSK-07 a member becomes unavailable. Master Project Brief s18.1 warns against
  choosing on familiarity rather than evidence, so this driver bounds complexity and does not select
  a technology.
- **Measurable expectation:** none that would be meaningful. It is recorded so that the architecture
  decision has to answer it explicitly rather than absorb it silently.
- **What it drives:** proportionality. The M2 brief states that a more distributed architecture is not
  automatically more advanced, and that complexity must be justified by project evidence.

## Committed quality attributes that are not architecturally significant

| Attribute | Why it does not drive structure |
|---|---|
| NFR-004 credential storage | A library and configuration choice inside authentication, settled under DEC-008. |
| NFR-006 encryption in transit | A deployment and configuration concern, settled under DEC-010. |
| NFR-007 no credential in the repository | A process and pipeline control, carried by #67 and RSK-11. |
| NFR-008 personal information limited and access-controlled | Shapes the data model under DEC-011, and is enforced through ASR-01 rather than through structure. |
| NFR-009 first-time usability, NFR-010 keyboard operation and contrast | Interface design. Both are measurable and committed, and neither changes the structure of the system. |

## Where these are used next

| Decision | Drivers it must answer | Issue |
|---|---|---|
| DEC-009 architecture style | ASR-01 to ASR-05, with ASR-06 as a bound on complexity | #57, ADR-001 |
| DEC-011 persistence and data model | ASR-01, ASR-02, ASR-03 | #58 |
| DEC-008 technology stack | ASR-04 and ASR-05, with ASR-06 as a bound on complexity | #59 |
| DEC-010 deployment platform | ASR-05 | #60 |
| Design decisions 1 and 2 | ASR-03, ASR-01 | #61, #62 |
| RTM ASR column | all | #54 |

Where the evidence behind a driver is still incomplete, it is named in FEC-01, FEC-02, FEC-03 or
FEC-06 rather than assumed. Those gaps are what the architecture decision has to remain safe against.
