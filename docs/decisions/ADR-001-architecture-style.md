# ADR-001: Software architecture style

- **Status:** Proposed. Awaiting two approvals under issue #57.
- **Date:** 16 September 2026, revised 17 September 2026 after review on #72
- **Decision Log entry:** DEC-009, recorded in M1 as deferred to M2.
- **Drivers:** ASR-01 to ASR-06 in `docs/architecture/asr-quality-drivers.md` (#56).

## Context

CivicConnect replaces telephone, email and spreadsheet handling of community service requests for one
organisation. The M1 baseline commits 29 functional requirements across eight capability areas, a
status model of twelve transitions, an access matrix of fifteen functions across four roles, and
thirteen non-functional requirements with measured targets.

DEC-009 was deferred to M2 with three stated evidence conditions. Each is answered here:

| Evidence M1 required | Position now |
|---|---|
| Which NFRs prove architecturally significant | Answered in the ASR list: NFR-005, NFR-001, NFR-002, NFR-011, NFR-012, NFR-013 and NFR-003, with CON-06 carried as a bound on complexity. |
| The record-level authorisation shape from FEC-01 | Partly answered. The baseline commits to per-requester isolation (FR-012) and category-scoped staff queues (FR-013), so scope reaches individual records. Whether staff scope later becomes site-based or global is still open, and the decision below is built so that answer changes only the policy module, under rule 2. |
| The reporting load position from FEC-06 | Answered for now. Reporting reads the transactional store, because expected volume and retention have not been supplied by the organisation. The trade-off is recorded below, and the conditions for revisiting it are set out under Later consequences. |

The workload is one organisation's transactional request handling, with management reporting over the
same records. There is no second consumer, no external integration in the baseline (SC-O-02), and no
requirement that any capability scale or deploy independently.

## Constraints

- **CON-02** bounded and uneven engineering time across four milestones.
- **CON-03** free or low-cost services only, with no budget for paid tiers.
- **CON-06** three students with limited exposure to controlled team engineering at this scale.
- **CON-07** the campus cannot guarantee a platform is installed, available or supported.
- **CON-08** protected main with two approvals from members other than the author.

## Alternatives considered

**A. Modular monolith.** One deployable application, divided into named modules with explicit
interfaces, over one relational store.

**B. Service per capability.** Separate deployable services for request handling, notification and
reporting, communicating over HTTP.

**C. Function per operation.** Serverless functions for each operation, with a managed store.

**D. Client application over a hosted data service.** A browser application talking to a hosted
database with its own access rules, and little or no application server of the team's own.

The comparison below is qualitative. ASR-06 appears as a bound on complexity and has no measurable
target, so it is weighed against the alternatives and never scored.

| Driver | A. Modular monolith | B. Service per capability | C. Function per operation | D. Client over hosted data service |
|---|---|---|---|---|
| ASR-01 authorisation | One server-side enforcement point that every call passes through | Achievable, and it has to be repeated or centralised across services | Achievable, and it has to be repeated per function | Weak. Enforcement moves into store rules and a client the team does not control, against FR-002 |
| ASR-02 queue and reporting | One query path, one store, indexing decided in one place | A queue page can require calls across services | Cold starts land directly on NFR-001 | Query shaping sits in the client, and scope rules must hold at the store |
| ASR-03 audit atomicity | Change and audit entry commit in one transaction | Needs a distributed transaction or a compensation design | Same, and per function | Hard to guarantee from a client |
| ASR-04 changeability | Tested in process; one pipeline; one review surface | Several pipelines and contracts for three people to keep consistent | Many small units and contract tests | Little of the logic is testable in the repository |
| ASR-05 free tier and availability | One always-on unit, which is the cheapest shape to keep inside a free tier | Several units, each with its own idle behaviour and quota | Suits idle workloads, at the cost of cold-start latency | Cheap, and it ties the project to one vendor's rules |
| ASR-06 capability and schedule (bound) | Fewest moving parts to learn and operate | Distributed failure handling on top of the domain work | New operational model to learn | Fastest to start, weakest to defend under FR-002 |

## Decision

**A modular monolith: one deployable application, divided into modules with explicit interfaces, over
one relational database. Reporting reads the transactional store for now.**

Modules, each owning its requirements:

| Module | Requirements |
|---|---|
| Identity and access | FR-001 to FR-004 |
| Request capture | FR-005 to FR-009 |
| Request access and queue | FR-010 to FR-014 |
| Workflow and status | FR-015 to FR-021 |
| Audit | FR-025, FR-026 |
| Notification | FR-029 |
| Reporting | FR-022 to FR-024 |
| Administration | FR-027, FR-028 |
| Authorisation policy | cross-cutting, used by every module (NFR-005, FR-002) |
| Persistence | cross-cutting, owns transactions and queries (DEC-011) |

The rules that make those boundaries real, rather than folder names:

1. Every call enters through the application's own server-side entry point. No client reaches the
   store directly (ASR-01).
2. Authorisation decisions are taken in the policy module, and so is read scope. Every scoped query
   takes its scope condition from the policy module, and no other module encodes who may see what,
   whether by requester, by category or by any scope added later. The condition is applied inside the
   query, so records outside it are never loaded (ASR-01, ASR-02).
3. A status change passes through the workflow module, and its audit entry is written in the same
   transaction (ASR-03).
4. Notification is called through an in-process interface, with an extension point for asynchronous
   delivery if SC-D-01 is reinstated (ASR-05).
5. Modules depend on one another through declared interfaces only, and shared data access lives
   behind the persistence module (ASR-04).

The rules differ in how far they can be enforced today.
Rules 1, 3 and 4 can be checked by inspection in review now. Rule 2 can be checked in review once the
policy module exists, by confirming that no query builds its own scope condition. Rule 5 has no
automated enforcement until a dependency check is added under #67, and until then it rests on review
discipline alone.

Logical modules are not deployment tiers. The module view and the deployment view are held separately
in `docs/architecture/diagrams/`.

## Rationale

The decision follows the drivers rather than the fashion. Three of the six drivers (ASR-01, ASR-03,
ASR-04) are about keeping one enforcement point, one write path and one testable surface, and all
three are cheaper to hold inside a process boundary than across a network boundary. Two more (ASR-05,
ASR-06) penalise every additional deployable unit directly, in free-tier quota and in learning time.
ASR-02 is neutral between A and B in principle, and favours A in practice because a queue page stays
one query.

The M2 brief states that a more distributed architecture is not automatically more advanced and that
complexity must be justified by project evidence. No baselined requirement asks for independent
deployment, independent scaling or a second consumer of this data, so the evidence for B, C or D is
absent rather than merely weak.

This matches the direction of the A2 research without being dictated by it. A2 Task 3 recommended an
in-process notification interface over a REST service or a broker for this baseline, and A2 Task 1
recommended mechanisms that assume one shared rule set for transitions and one policy component for
authorisation.

## Trade-offs accepted

- **Module boundaries inside one process can erode.** Explicit interfaces and review are the control
  now, and a dependency check can be added to CI under #67 when the structure exists to check.
- **One deployable unit is a single point of failure.** Accepted against NFR-003, which is 98 percent
  within published service hours rather than continuous availability. The restart and redeploy path
  is recorded under DEC-010.
- **Reporting queries share the transactional store.** Accepted while volume and retention are
  unknown. FEC-06 already records the failure mode, which is that oversight queries degrade the queue
  that does the work. The conditions for revisiting it are set out under Later consequences.
- **Scaling is whole-application scaling.** No current requirement asks for one capability to scale on
  its own.

## Risks created

Two risks follow from this decision and are proposed to the Risk Register under #68, where the owner
assigns the identifiers:

1. Module boundaries erode under schedule pressure until the application is a single tangled unit,
   after which NFR-012 and every later change cost more. Related to RSK-01 and CON-02.
2. Reporting growth degrades the staff queue before anyone measures it, which is FEC-06 realised.
   Related to NFR-001 and RSK-09.

## Evidence

- M1 registers: FR-001 to FR-029, NFR-001 to NFR-013, CON-02 to CON-08, RSK-01, RSK-04, RSK-05,
  RSK-09, RSK-13, FEC-01, FEC-02, FEC-03, FEC-05, FEC-06, the status model and the access matrix.
- `docs/architecture/asr-quality-drivers.md` for the drivers and their evidence (#56).
- Assignment 2 research, referenced rather than copied: Task 1 on design quality and pattern
  selection, Task 2 on transactions and reference generation, Task 3 on interface and integration
  choice, Task 4 on repository and integration controls.
- M2 brief s5.3 on proportionate architecture and on separating architecture from technology.

## Later consequences

- If FEC-01 resolves to site-based or global staff scope, only the policy module changes, because
  every scoped query takes its condition from it under rule 2. The module boundaries do not change.
- Reporting's use of the transactional store is revisited when either of two things happens. The
  first is the NFR-001 measurement, 20 timed retrievals of the first queue page against a seeded
  5 000-request dataset, showing the 95th percentile above 2.0 seconds while reporting queries run
  against the same store. The second is the organisation supplying expected volume and retention
  (FEC-06, #2) with a projection above the 5 000 requests NFR-001 was baselined at. Either one leads
  to a separate read path or a reporting replica behind the reporting module, without moving the
  other modules.
- If SC-D-01 is reinstated, the notification extension point becomes an asynchronous consumer, and
  DEC-010 must then supply background processing capability (FEC-03).
- If DEC-008 selects a stack whose idiom conflicts with these boundaries, this record is revisited
  through controlled change under Master Project Brief s14 rather than quietly relaxed.
- This decision is the input to DEC-011 (#58), DEC-008 (#59), DEC-010 (#60) and both design decisions
  (#61, #62).
