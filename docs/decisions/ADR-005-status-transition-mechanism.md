# ADR-005: Status transition mechanism

- **Status:** Accepted. Approved by Darius Mushi and Tristan Roets on #93, merged 29 September 2026.
- **Date:** 28 September 2026
- **Decision Log entry:** DEC-013, added with the M2 register changes (#101).
- **Drivers:** ASR-03 and ASR-04 in `docs/architecture/asr-quality-drivers.md` (#56), and ADR-001 rule 3.
  This is the first of the two final design decisions the M2 brief requires (s5.6, team criterion E).

## Context

A request moves between seven statuses. The baselined Status Model register (PED s8.4, Figure 2)
permits twelve transitions, and FR-016 requires every other one to be refused, including when it is
issued directly to an endpoint. Each permitted transition names the roles that may make it and a
guard condition, and the guards differ in kind: some need input, such as a rejection reason (FR-020)
or a resolution summary (FR-018); some need a prior condition, such as the request being unassigned;
one needs the request to be in the actor's authorised categories (FR-015).

The same rules are needed in three places. The service must enforce them, the interface must know
which actions to offer, and the tests must exercise every permitted and forbidden combination. If
each place holds its own copy, they drift, and FR-016 fails wherever the copy was not updated. RSK-09
expects the status model to prove incomplete in use, and FEC-02 records that a status changed after
requests exist cannot be applied to history. So the rules have to live in one place that every
consumer reads, and a change to them has to be cheap and visible.

ADR-001 rule 3 already places every status change in the workflow module, with its audit entry
written in the same transaction (ASR-03, NFR-011, FR-025).

## Constraints

- **FR-016** refuses every transition outside the model, for every role.
- **RSK-09** and **FEC-02**: the model is expected to change, through controlled change.
- **ADR-001 rule 2**: authorisation is decided only in the policy module, so the workflow module may
  not decide who may make a move.
- **CON-06**: the mechanism has to be one the three of us can read and review under CON-08.

## Alternatives considered

Assignment 2 Task 1 compared three mechanisms for this problem, and this record takes its analysis as
the evidence rather than repeating it (`docs/research/A2_jean-smit.md`, sections 1.2 and 1.3):

- **1A. Conditional logic in the service.** Simplest to start with, and it changes for every rule,
  and the interface needs its own copy of the rules. Defensible only for a model confirmed as stable.
- **1B. The State pattern** (Gamma et al., 1994). A class per status. It suits objects whose behaviour
  differs by state. CivicConnect's statuses differ mainly in which moves they permit and under what
  condition, so seven coupled classes would carry complexity the variation does not need.
- **1C. A declarative transition table with interchangeable guards.** The permitted transitions held as
  data, each with its roles and a guard, the guards being small Strategy objects (Gamma et al., 1994).
  A2 recommended this option.

## Decision

**Option 1C: the transition table, with Strategy guards, held as frozen data in code.**

- `src/modules/workflow-status/transition-table.js` holds the seven statuses and the twelve
  transitions. Each entry records the from status, the to status, the authorised roles, the guard, and
  the requirement it traces to.
- Each guard names the input it needs (`requires`) and returns a refusal message, or nothing when the
  condition holds.
- `src/modules/workflow-status/transitions.js` checks a requested move in a fixed order: a move outside
  the model is refused first (FR-016); then the actor's authority is checked; then the guard. Checking
  authority before the guard means an actor who may not make a move learns nothing about what it
  would have required.
- The same module tells the interface which moves to offer on a request, with the input each needs.
- Who may make a move is decided by the authorisation policy (ADR-006), passed in as a function, so
  this module never imports it and never decides authorisation itself (ADR-001 rule 2). The roles stay
  in the table as data, which keeps the Status Model register as the one source for who may move a
  request. The one move whose authority depends on category scope, accepting an unassigned request, is
  marked in the table and evaluated by the policy.

**How this refines the A2 recommendation.** A2 recommended keeping the table "in typed code". The
project language is JavaScript, and #64 fixes whether it becomes TypeScript. The table is frozen data
reviewed like code, which keeps the property A2 was after, that it cannot grow into an external
configuration language. A2 also recommended evaluating the roles through the authorisation policy.
Passing the policy in as a function, instead of importing it, keeps the dependency pointing one way,
so neither module needs the other to be tested.

## Rationale

The variation in the requirement is tabular, and the mechanism matches it. The table corresponds row
for row to the Status Model register, and the tests check it against a fixture exported from that
register (`tests/fixtures/status-model.json`), so the implementation is checked against the controlled
artefact itself.

The tests exercise every ordered pair of statuses for every role, 196 combinations, and assert that
each is allowed exactly where the register permits it and refused otherwise with the right reason.
They also cover each guard, the order of the checks, and the moves offered to the interface. To check
that the tests constrain the table, three faults were introduced on purpose, one at a time: a missing
transition, an extra role on the Closed transition, and a weakened FR-018 guard. Each one failed the
suite.

A change the model is expected to need (RSK-09) is an edited entry and an updated fixture, and it leaves
the other eleven transitions untouched.

## Trade-offs accepted

- **Guards can grow into a rules language.** Kept in check by keeping guards small, single-purpose and
  in code. A guard that needs more than a few lines is a signal to revisit this record.
- **One guard mixes a record check into the model.** "The assignee begins work" is implemented as: the
  actor is the assignee, or a Coordinator. That is the register's own wording, and it is recorded here
  because it sits at the edge between a guard and an authorisation rule.
- **The fixture has to be re-exported when the register changes.** A change to the Status Model is a
  controlled change in any case, and updating the fixture is part of it.
- **Nothing is persisted yet.** The mechanism decides whether a move is allowed. Applying it, and
  writing the audit entry in the same transaction under ADR-001 rule 3, belongs to the service built
  under #65, once the data model from #58 exists.

## Risks created

Proposed to the Risk Register under #68, where the owner assigns the identifiers:

1. **The table and the register drift apart** if the register changes without the fixture being
   re-exported. Mitigation: the fixture records the workbook commit it came from, and any change to the
   Status Model sheet includes re-exporting it. Related to RSK-09.

## Evidence

- M1 registers: the Status Model, FR-015 to FR-021, FR-025, NFR-011, RSK-09, FEC-02.
- ADR-001 rules 2 and 3 (#57), and ASR-03 and ASR-04 (#56).
- Assignment 2 Task 1, `docs/research/A2_jean-smit.md`, sections 1.1 to 1.3, which cites Gamma et al.
  (1994) and Fowler (2015).
- `src/modules/workflow-status/`, `tests/workflow-status.test.js` and `tests/fixtures/status-model.json`.

## Later consequences

- **#65** wires the service: it calls the transition check with the policy's function, applies the
  move, and writes the audit entry in the same transaction (ADR-001 rule 3, FR-025, NFR-011).
- **The RTM design column** references this record for FR-015 to FR-020, through the M2 register
  changes.
- **The M3 transition test matrix** extends the exhaustive test to the endpoints, which is where FR-016
  requires the refusal to hold.
- **A change to the Status Model** changes the table, the fixture and the tests together, through
  controlled change.
- **#92** records four cells where the Access Matrix disagrees with the Status Model and FR-021. If it
  is resolved in favour of the matrix, the roles in this table change.
