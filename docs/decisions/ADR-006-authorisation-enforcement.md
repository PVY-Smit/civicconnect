# ADR-006: Authorisation enforcement

- **Status:** Accepted. Approved by Darius Mushi and Tristan Roets on #94, merged 29 September 2026.
- **Date:** 28 September 2026
- **Decision Log entry:** DEC-014, added with the M2 register changes (#101).
- **Drivers:** ASR-01 and ASR-02 in `docs/architecture/asr-quality-drivers.md` (#56), and ADR-001 rules
  1 and 2. This is the second of the two final design decisions the M2 brief requires (s5.6, team
  criterion E).

## Context

Authorisation in CivicConnect has two dimensions at once. The first is role: four roles, with every
permission decision made on the server (FR-002). The second is the relationship between the user and
a particular request. A Requester may retrieve only the requests they submitted (FR-012), Staff see
only requests in their authorised categories while a Coordinator sees every category (FR-013), and a
Requester sees only the action entries marked requester-visible (FR-011).

NFR-005 sets zero successful unauthorised accesses across the full negative-test matrix of roles and
functions. That target is absolute, so any approach in which one forgotten check is a breach cannot
meet it reliably. NFR-001 requires the first page of the Staff queue in under 2.0 seconds at 5 000
requests, so an approach that loads every request and discards the unauthorised ones afterwards
trades that target away. FEC-01 records that whether staff scope stays by category, moves to site or
becomes global is still open.

ADR-001 rule 2 already decides where this lives: authorisation decisions and read scope are taken in
the policy module, every scoped query takes its scope condition from there, and no other module
encodes who may see what.

## Constraints

- **NFR-005** zero unauthorised accesses, tested against every cell of the Access Matrix.
- **NFR-001** the queue filters in the database.
- **FEC-01** scope depth is open, so a change to it must touch one place.
- **ADR-001 rules 1 and 2**: one server-side entry point, and one policy module.

## Alternatives considered

Assignment 2 Task 1 compared three approaches, and this record takes its analysis as the evidence
(`docs/research/A2_jean-smit.md`, sections 1.2 and 1.3):

- **2A. Checks written inline in each handler.** Fails NFR-005 on the first omitted check, and repeats
  the rules across every endpoint.
- **2B. A central policy component**, with rules as Specification objects (Evans, 2003). Testable
  against the Access Matrix in isolation. On its own it loads and then filters, which is a poor fit for
  the queue.
- **2C. Authorisation applied at the query**, in the repository or through a protection proxy (Fowler,
  2002; Gamma et al., 1994). Lists are correct by construction and filtered in the database. Poor at
  action decisions, and tied to the data model.

A2 recommended 2C for reads and 2B for actions, because each covers the part of the requirement the
other handles poorly.

## Decision

**2C for reads and 2B for actions, both produced by one policy module:
`src/modules/authorisation-policy/policy.js`.**

- **Actions.** `permits(actor, function)` answers whether a role may perform each of the fifteen
  functions in the Access Matrix register.
- **Reads.** `requestScope(actor)` returns a scope: a Requester's own requests; for Staff and a Manager,
  their own requests and those in their authorised categories; for a Coordinator, every category
  (FR-013). `actionEntryScope(actor)` limits a Requester to requester-visible entries (FR-011).
- **Scopes are Specifications.** Each scope yields both the condition a query applies and the check on
  a single request, from the same rule, so the two cannot drift apart. `scopedWhere(actor, where)`
  combines the scope with what the caller is looking for, and every query for requests uses it.
- **Transitions.** `authoriseTransition(actor, request, transition)` allows a move only for the roles
  the transition table gives it (ADR-005), and only on a request in the actor's scope. Accepting an
  unassigned request needs the request in the actor's authorised categories, whoever submitted it
  (FR-015). This is where the two design decisions meet: every authorisation decision, including those
  about status changes, is taken in this one module.
- **Manager scope.** The Access Matrix gives the Manager requests "in authorised categories", the same
  wording as for Staff, and this record applies it that way. A Manager can be given every category.
  Whether management oversight should be global instead is part of FEC-01.

**How this refines the A2 recommendation.** A2 placed query scoping in the repository methods. Under
ADR-001 rule 2, the scope condition comes from the policy module and the persistence layer only
applies it. The two mechanisms A2 recommended therefore become two outputs of one component, which
removes most of the complexity A2 recorded against combining them.

**Four cells where the register and the requirements disagree.** The Access Matrix grants the Manager
the right to assign, reject and set priority, and the Coordinator the right to accept an unassigned
request. FR-016 makes the Status Model authoritative for who may make each transition, and it grants
none of the first three moves to those roles. FR-021 gives priority to the Coordinator only. The
policy follows the requirements and denies all four, lists them in `MATRIX_CONFLICTS`, and #92 takes
them to change control. Denying where the baseline disagrees follows the deny-by-default principle
the NFR-005 target depends on.

## Rationale

NFR-005 becomes directly testable. The tests generate a case from every cell of the Access Matrix,
read from a fixture exported from the register (`tests/fixtures/access-matrix.json`), sixty cells in
all. The four conflicts are asserted separately, and the test fails if the matrix stops granting any of
them, so a corrected register cannot leave a stale exception behind. Further tests check each scope,
the action-entry visibility, transition authorisation, and that for every role the query condition and
the single-request check select exactly the same requests. To check that the tests constrain the
policy, four faults were introduced on purpose, one at a time: granting the Manager priority, widening
Staff scope to every category, dropping a recorded conflict, and dropping the category rule for
accepting a request. Each one failed the suite.

NFR-001 is served because the queue's filter is a query condition, so requests outside a user's scope
are never loaded. FEC-01 is contained, because a change to scope depth changes `requestScope` and
nothing else.

## Trade-offs accepted

- **The scope depends on the data model.** The conditions use `requesterId`, `categoryId` and
  `visibility`, which DEC-011 (#58) has to provide under those names or have mapped here.
- **A query that does not use `scopedWhere` bypasses the scope.** This is the risk A2 recorded against
  query scoping. Until a check can enforce it, it rests on review, and the M3 negative tests executed
  against the endpoints are what catch a miss.
- **Two representations of each scope.** The query condition and the in-memory check come from one
  rule, and a test holds them together.

## Risks created

Proposed to the Risk Register under #68, where the owner assigns the identifiers:

1. **An unscoped query leaks records** if a new query is written without `scopedWhere`. Mitigation:
   review of every query under CON-08, and the NFR-005 negative tests at the endpoints. Related to
   RSK-05 and FEC-01.

## Evidence

- M1 registers: the Access Matrix, the Status Model, FR-002, FR-011 to FR-013, FR-015, FR-016, FR-021,
  FR-026, NFR-001, NFR-005, RSK-05, FEC-01.
- ADR-001 rules 1 and 2 (#57), and ASR-01 and ASR-02 (#56).
- Assignment 2 Task 1, `docs/research/A2_jean-smit.md`, sections 1.1 to 1.3, which cites Evans (2003),
  Fowler (2002), Gamma et al. (1994) and the OWASP authorization guidance.
- `src/modules/authorisation-policy/policy.js`, `tests/authorisation-policy.test.js` and
  `tests/fixtures/access-matrix.json`.
- #92, the four register conflicts.

## Later consequences

- **#58** gives the request entity the fields the scope uses, or the mapping is updated here.
- **#65** wires the service: every query for requests goes through `scopedWhere`, every action through
  `permits`, and every status change through the transition check with `authoriseTransition`.
- **The RTM design column** references this record for FR-002, FR-011 to FR-013 and NFR-005, through
  the M2 register changes.
- **The M3 negative-test matrix** runs the same sixty cells against the endpoints, which is how NFR-005
  is measured.
- **When FEC-01 is answered**, only `requestScope` changes.
- **When #92 is resolved**, `MATRIX_CONFLICTS` is emptied or the transition table's roles change.
