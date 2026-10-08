# CivicConnect test catalogue

One record per designed test case (#126), with the fields of the M3 brief, section 11. A record is a test
case as it was designed: one input space, technique and expected result. The automated tests that carry it
are listed under **Automated by**, so a decision table of 60 cells is one record that 60 automated checks
execute, not 60 records. The M3 brief's Meaningful Test Rule (section 9) counts designed cases, not
assertions.

Record IDs are stable. A record is not renumbered or reused; a withdrawn record stays with its status set
to Withdrawn and the reason.

## How the records stay true

`node tools/check_test_catalogue.mjs` runs every test file it finds and reports, for each record, how many
of its listed tests pass, fail or are todo, and how many browser journeys are listed (they need a deployed
instance, so the tool lists them with Playwright rather than running them); every listed test that does not exist; and every test that no
record lists. A listed file that is not on the current branch, or a listed test tagged with its open pull
request, such as `[#136]`, that is not on it, is reported as not on this branch, because records cover open
pull requests. A name ending in `*` matches every test whose name starts with the rest. With `--strict` it fails on any of those, which CI (#110) runs once every listed pull
request is on main.

**Expected result** is written from the requirement, register or decision named in **Test basis**, before
the result is known. **Actual result**, **Status** and **Evidence** come from a run. Until the CI workflow
(#110) merges, the evidence is a local run with its date, Node version, branch and commit; each is replaced
by the CI run once the test runs there.

Status values: **Pass**, **Fail**, **Blocked** (cannot run yet, with the reason), **Not yet built**,
**Withdrawn**.

## Coverage of the M3 minimum (brief, sections 9 and 10)

| Category | Minimum | Records |
|---|---|---|
| Unit or component | 5 | TC-01 to TC-21, TC-27 to TC-31, TC-36 |
| Black-box functional | 5 | TC-05, TC-13, TC-22, TC-24, TC-25, TC-26 |
| API or integration | 3 | At the handler boundary: TC-21 to TC-26. Against PostgreSQL: TC-32 (Blocked) |
| End to end | 2 | TC-33, TC-34 (written in #138; Blocked until staging, #122) |
| Negative, failure or unauthorised | 3 | TC-03, TC-04, TC-09, TC-11, TC-18, TC-22, TC-23, TC-24, TC-36 |
| High-priority requirement or risk | 5 | TC-01 and TC-22 (NFR-005, Must), TC-05 and TC-24 (FR-016, Must), TC-09 to TC-11 (FR-001, Must), TC-12 (FR-008, Must; DEC-004), TC-18 (FR-025, Must; ADR-001 rule 3) |
| Black-box techniques | 2 | Decision table (TC-01, TC-22), state transition (TC-05, TC-24), boundary values (TC-13, TC-25), equivalence partitions (TC-13, TC-26) |
| Performance | 1 scenario | TC-35 (scripts in #139; Blocked until staging, #122) |

## Where the tests are

| Pull request | Tests | Commit run |
|---|---|---|
| main | `tests/authorisation-policy.test.js`, `tests/workflow-status.test.js` | b10c3e0 |
| #130 (#111) | `tests/identity-access.test.js` | 3581885 |
| #131 (#112) | `tests/request-submission.test.js` | 968a44f |
| #132 (#113) | `tests/workflow-service.test.js` | cd05304 |
| #133 to #135 (#118 to #120) | `client/test/*.test.js` | 7948369 (the top of the stack) |
| #136 (#92) | the CR-002 test in `tests/authorisation-policy.test.js` | 2c1b1f5 |
| #121, not yet opened | `tests/api-*.test.js`, `tests/support/api.js` | 2362c11 (local) |
| #138 (#123) | `e2e/journeys/*.spec.js` | f90d154 |
| #139 (#124) | `perf/test/lib.test.js`, and the scripts in `perf/` | 62da9fb |
| #146 (#111) | `tests/password-reset.test.js` | 7c8ae5d |

The local runs on 7 October 2026 used Node 24.14.0 on Windows 11.

---

## Authorisation policy (ADR-006)

### TC-01 Access Matrix decisions in the policy

| Field | Value |
|---|---|
| Test basis | NFR-005, FR-002; the Access Matrix register (PED s8.3); ADR-006; CR-002 (#92) |
| Why selected | A wrong cell gives a role a function it must not have, or refuses one it needs. Every authorisation decision is taken in the policy, so a fault here is a fault everywhere |
| Technique and level | Decision table; unit |
| Input or precondition | The Access Matrix fixture exported from the registers workbook (15 functions by 4 roles), and an unknown role |
| Expected result | Each of the 60 cells permits exactly where the register says Yes, except the four cells CR-002 corrects, which are refused; the policy knows exactly the register's functions; an unknown role is refused everything |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, main at b10c3e0: 4 of 4 tests. The CR-002 test on #136 at 2c1b1f5 |
| Traceability | NFR-005, FR-002, ADR-006, CR-002, #92, RSK-16 |
| Interpretation | The policy and the register agree cell by cell, and a register change that the policy does not follow fails the run. It shows the decision function, not that every route asks it; TC-22 covers that |

**Automated by**

- `tests/authorisation-policy.test.js`: the policy knows every function in the Access Matrix register, and no others
- `tests/authorisation-policy.test.js`: every role and function pair matches the Access Matrix, except the recorded conflicts (NFR-005)
- `tests/authorisation-policy.test.js`: each recorded conflict is a cell the matrix grants and the policy denies, so a corrected matrix is noticed
- `tests/authorisation-policy.test.js`: an unknown role is denied everything
- `tests/authorisation-policy.test.js`: CR-002 (#92): the four corrected cells are refusals in the register and in the policy, with no conflict left [#136]

### TC-02 Request scope by role

| Field | Value |
|---|---|
| Test basis | FR-012, FR-013, FR-015; ADR-006 (scope as a Specification) |
| Why selected | Scope decides which requests a user can load at all. A wrong scope discloses another person's request (FR-012) or hides work from Staff |
| Technique and level | Equivalence partitions by role and by relation to the request (own, in category, other category); unit |
| Input or precondition | Requests from two requesters in three categories; one user per role; Staff and Manager with category 10 |
| Expected result | Requester: own only. Staff and Manager: own plus their categories. Coordinator: all. The query condition and the single-request check select the same requests for every role. Accepting needs the request in the actor's categories even if they submitted it |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, main at b10c3e0: 6 of 6 tests |
| Traceability | FR-012, FR-013, FR-015, ADR-006, FEC-01 |
| Interpretation | The two forms of each scope cannot drift apart. Whether Staff scope stays by category is FEC-01, still open |

**Automated by**

- `tests/authorisation-policy.test.js`: a Requester's scope holds only the requests they submitted (FR-012)
- `tests/authorisation-policy.test.js`: Staff see their authorised categories and their own requests, and nothing else (FR-013)
- `tests/authorisation-policy.test.js`: a Coordinator sees every category (FR-013)
- `tests/authorisation-policy.test.js`: the query condition and the single-request check select the same requests for every role
- `tests/authorisation-policy.test.js`: a transition is authorised only for its roles, and only on a request in scope
- `tests/authorisation-policy.test.js`: accepting an unassigned request needs it in the actor's categories, even if they submitted it (FR-015)

### TC-03 Internal action entries are withheld from the requester

| Field | Value |
|---|---|
| Test basis | FR-011, FR-017; DEC-003 |
| Why selected | An internal note shown to a requester is a disclosure the requirements forbid, and it would be invisible in normal use |
| Technique and level | Negative test, with a store that ignores the entry condition; unit and component |
| Input or precondition | A request with one internal and one requester-visible entry; its requester, and Staff in its category |
| Expected result | The requester sees only the requester-visible entry, even when the store returns both; Staff in the category see both, with priority and assignee |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026: main at b10c3e0, 1 test; #131 at 968a44f, 3 tests |
| Traceability | FR-011, FR-017, DEC-003, ADR-006 |
| Interpretation | The entry filter holds at two layers, so one fault does not leak an entry |

**Automated by**

- `tests/authorisation-policy.test.js`: a Requester sees only requester-visible action entries, and staff roles see all (FR-011, FR-017)
- `tests/request-submission.test.js`: FR-005, FR-011: the detail shows the submitted fields unchanged, the status history in order and only requester-visible entries
- `tests/request-submission.test.js`: FR-011: an internal entry is still withheld if the store ignores the entry condition
- `tests/request-submission.test.js`: staff in the request's category see internal entries, the priority and the assignee

### TC-04 Audit entries cannot be edited or deleted

| Field | Value |
|---|---|
| Test basis | FR-026; ADR-007 (audit immutability) |
| Why selected | An editable audit trail is not evidence. The control has to be absent, not merely unused |
| Technique and level | Negative test; unit |
| Input or precondition | Every role; the audit module's exports |
| Expected result | The policy permits nobody to edit or delete an audit entry; the audit module offers no edit or delete, and refuses an entry that records no change |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026: main at b10c3e0, 1 test; #132 at cd05304, 1 test |
| Traceability | FR-026, NFR-011, ADR-007 |
| Interpretation | The application offers no path to change an entry. The database privilege that adds the same restriction underneath is checked against PostgreSQL in TC-32 |

**Automated by**

- `tests/authorisation-policy.test.js`: nobody may edit or delete an audit entry (FR-026)
- `tests/workflow-service.test.js`: FR-026: the audit module offers no way to edit or delete an entry, and refuses entries that record nothing

## Status model (ADR-005)

### TC-05 The transition table matches the Status Model register

| Field | Value |
|---|---|
| Test basis | FR-016; the Status Model register (PED s8.4, Figure 2); ADR-005 |
| Why selected | Every status rule reads the table, so a table that differs from the register breaks FR-016 everywhere at once (RSK-09, RSK-16) |
| Technique and level | State transition, every ordered pair of statuses for every role; unit |
| Input or precondition | The Status Model fixture exported from the registers workbook; seven statuses; four roles |
| Expected result | The table holds exactly the register's transitions. A pair and role are allowed only where the model names them, and an unauthorised actor is refused before any guard is evaluated |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, main at b10c3e0: 3 of 3 tests |
| Traceability | FR-016, ADR-005, RSK-09, RSK-16, FEC-02 |
| Interpretation | The model in the code is the baselined model. TC-24 repeats the 49 pairs through the endpoint |

**Automated by**

- `tests/workflow-status.test.js`: the table holds exactly the transitions in the Status Model register
- `tests/workflow-status.test.js`: every status pair and role: allowed only where the model permits it, refused otherwise (FR-016)
- `tests/workflow-status.test.js`: an unauthorised actor is refused before the guard is evaluated

### TC-06 Transition guards refuse a move without its input

| Field | Value |
|---|---|
| Test basis | FR-015, FR-018, FR-020, FR-025; ADR-005 guards |
| Why selected | A guard that passes without its input lets a request be resolved with no summary or rejected with no reason, which the requester then sees |
| Technique and level | Negative tests and equivalence partitions per guard (missing, blank, present); unit |
| Input or precondition | One request per guarded move; changes with each required field missing, blank and present |
| Expected result | Each guard refuses without its input: resolution summary (FR-018), rejection reason (FR-020), accept only when unassigned, begin work only by the assignee or a Coordinator, reassign only to a different assignee |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, main at b10c3e0: 6 of 6 tests |
| Traceability | FR-015, FR-018, FR-020, FR-025, ADR-005 |
| Interpretation | The guards hold in the transition policy. TC-17 shows the service writes nothing when a guard refuses |

**Automated by**

- `tests/workflow-status.test.js`: every guard that needs input refuses the move without it
- `tests/workflow-status.test.js`: Resolved needs a non-empty resolution summary (FR-018)
- `tests/workflow-status.test.js`: rejection needs a reason (FR-020)
- `tests/workflow-status.test.js`: only an unassigned New request can be accepted (FR-015)
- `tests/workflow-status.test.js`: Staff who are not the assignee cannot begin work on an assigned request
- `tests/workflow-status.test.js`: reassignment needs a different assignee (FR-025 audits it as an assignee change)

### TC-07 The interface offers exactly the permitted moves, with their inputs

| Field | Value |
|---|---|
| Test basis | FR-016, FR-020, FR-021; ADR-005 (the interface asks the table) |
| Why selected | A screen that offers a move the server refuses, or hides one it allows, misleads the user even though the server is right |
| Technique and level | Every transition in the table; unit (server) and component logic (client) |
| Input or precondition | The transition table; each role; the server's moves and capabilities as the client receives them |
| Expected result | The server offers exactly the table's moves for the actor, with their inputs. The client labels every move, gives every guard input a labelled field of the right kind with an id unique across the table, sends only the inputs the move asks for, keeps Assign and Close disabled until chosen and confirmed, shows priority and entry forms only when the server's capabilities allow, and marks only the rejection reason as visible to the requester |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026: main at b10c3e0, 1 test; client at 7948369, 7 tests |
| Traceability | FR-016, FR-020, FR-021, ADR-005, #119, #134 |
| Interpretation | A move added to the table fails these tests until the screen names it. The rendered screen is covered by the journeys in TC-33 and TC-34 |

**Automated by**

- `tests/workflow-status.test.js`: the interface is offered exactly the moves the table permits, with their inputs
- `client/test/staff-screens.test.js`: ADR-005: every move in the status model has its own button label
- `client/test/staff-screens.test.js`: every input a guard requires gets a labelled form input of the right kind
- `client/test/staff-screens.test.js`: FR-020: of the reason inputs, only the rejection reason's hint says the requester will see it
- `client/test/staff-screens.test.js`: a move sends its target and only the inputs it asked for, typed for the server
- `client/test/staff-screens.test.js`: each move input gets an id unique across the whole transition table
- `client/test/staff-screens.test.js`: Assign cannot be sent until a staff member is chosen, nor Close until it is confirmed
- `client/test/staff-screens.test.js`: FR-021: the priority form and the entry form appear only when the server's capabilities allow them

## Identity and access (#111)

### TC-08 Session tokens and the session cookie

| Field | Value |
|---|---|
| Test basis | FR-001, NFR-004; ADR-006 |
| Why selected | A forgeable or endless session bypasses sign-in entirely |
| Technique and level | Negative tests (altered, expired, other secret, short secret); unit |
| Input or precondition | Tokens issued with a test secret; altered, expired and differently signed tokens; a short secret and no secret; HTTP and HTTPS |
| Expected result | A token round-trips to its user id and is refused when altered, expired or signed with another secret; the service refuses a secret under 32 characters; the cookie is HttpOnly and SameSite=Lax, and Secure over HTTPS; a session ends with its lifetime |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, #130 at 3581885: 4 of 4 tests |
| Traceability | FR-001, NFR-004, #111 |
| Interpretation | Shows the token and cookie rules. Transport security on the deployed host is part of staging (#122) |

**Automated by**

- `tests/identity-access.test.js`: a session token round-trips to its user id and is refused once altered, expired or signed elsewhere
- `tests/identity-access.test.js`: the service refuses to run with a session secret shorter than 32 characters
- `tests/identity-access.test.js`: the session cookie is HttpOnly and SameSite=Lax, and Secure only when the service runs over HTTPS
- `tests/identity-access.test.js`: a session stops working when its lifetime ends

### TC-09 A failed sign-in reveals nothing

| Field | Value |
|---|---|
| Test basis | FR-001; NFR-004 |
| Why selected | Different answers for an unknown email and a wrong password let anyone list accounts |
| Technique and level | Equivalence partitions of failure (wrong password, unknown email, deactivated account, missing field); negative; component |
| Input or precondition | Seeded users, one deactivated; sign-in bodies for each partition |
| Expected result | The three failures get the same generic message and a 401 with no cookie; the password check runs against a dummy hash when there is no usable account; a missing email or password is refused before any lookup |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, #130 at 3581885: 4 of 4 tests |
| Traceability | FR-001, NFR-004, #111 |
| Interpretation | The answers cannot be told apart by content. Timing is reduced by the dummy hash, not measured |

**Automated by**

- `tests/identity-access.test.js`: FR-001: wrong password, unknown email and a deactivated account all get the same generic failure
- `tests/identity-access.test.js`: FR-001: when there is no usable account the password is still checked, against the dummy hash
- `tests/identity-access.test.js`: a sign-in with a missing email or password is refused before any lookup
- `tests/identity-access.test.js`: FR-001: a failed sign-in answers 401 with the generic message and sets no cookie

### TC-10 A successful sign-in

| Field | Value |
|---|---|
| Test basis | FR-001, FR-002; ADR-006 |
| Why selected | Sign-in is on every journey, and the permissions it returns decide what the client offers |
| Technique and level | Positive tests with partitions of email form (case, surrounding spaces); component |
| Input or precondition | An active user per role |
| Expected result | Correct credentials sign in whatever the email's case and surrounding spaces; the cookie is set and the user is returned without the password hash; the permissions returned are exactly what the policy permits for the role |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, #130 at 3581885: 3 of 3 tests |
| Traceability | FR-001, FR-002, ADR-006, #111 |
| Interpretation | The client's menus come from the policy through this answer, so they cannot drift from the server |

**Automated by**

- `tests/identity-access.test.js`: FR-001: correct credentials sign in, with the email matched regardless of case and surrounding spaces
- `tests/identity-access.test.js`: FR-001: signing in sets the session cookie and returns the user without the password hash
- `tests/identity-access.test.js`: ADR-006: the signed-in user's permissions are exactly what the policy permits for their role

### TC-11 Protected routes and the permission check

| Field | Value |
|---|---|
| Test basis | FR-001, FR-002, FR-028, NFR-005 |
| Why selected | One route without the check is a breach; a deactivated user who keeps their session defeats FR-028 |
| Technique and level | Negative tests; component |
| Input or precondition | Requests with no cookie, a valid cookie, a deactivated user's cookie, and a route behind a permission each role does and does not hold |
| Expected result | No valid session: 401 and the handler is not reached. A valid session reaches it with the actor read from the store. A deactivated user's session stops on the next request. Without the permission: 403. A request that skipped authentication is refused. Signing out clears the cookie |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, #130 at 3581885: 6 of 6 tests |
| Traceability | FR-001, FR-002, FR-028, NFR-005, #111 |
| Interpretation | The middleware is correct. TC-22 and TC-23 show the routes use it |

**Automated by**

- `tests/identity-access.test.js`: FR-001: a protected route without a valid session answers 401 and does not reach the handler
- `tests/identity-access.test.js`: a valid session reaches the handler with the actor read from the store
- `tests/identity-access.test.js`: FR-028: deactivating a user ends their existing session on the next request
- `tests/identity-access.test.js`: FR-002, NFR-005: a signed-in role without the permission answers 403, and with it reaches the handler
- `tests/identity-access.test.js`: the permission check refuses a request that skipped authentication
- `tests/identity-access.test.js`: signing out clears the session cookie

## Request submission and the requester's views (#112)

### TC-12 The request reference

| Field | Value |
|---|---|
| Test basis | FR-008; DEC-004; DEC-017 (proposed, #131) |
| Why selected | A reused reference attaches one person's request to another's; a guessable one reveals volume, which DEC-004 guards |
| Technique and level | Exhaustive check on a reduced domain; 100,000 consecutive values; boundary values at the range ends; negative tests; unit |
| Input or precondition | The keyed permutation with a test key; sequence values 1 to 100,000, then 0, -1, 100,000,000, 1.5, text and null; keys that are short, empty, missing or not text; malformed references |
| Expected result | Every value in range maps to a different reference in the format CC-NNNN-NNNN; consecutive values get unrelated references; another key gives other references; a short key is refused at start-up; a value outside 1 to 99,999,999 is refused, never wrapped; only the reference format reaches a lookup, so a malformed one is refused without a query |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, #131 at 968a44f: 8 of 8 tests |
| Traceability | FR-008, DEC-004, DEC-017, ADR-007, #112 |
| Interpretation | Uniqueness also rests on ADR-007's sequence and unique constraint, which TC-32 checks against PostgreSQL |

**Automated by**

- `tests/request-submission.test.js`: FR-008: the keyed permutation gives every value in its range a different result, also after cycle-walking
- `tests/request-submission.test.js`: FR-008: 100,000 consecutive sequence values get 100,000 different references in the agreed format
- `tests/request-submission.test.js`: DEC-004: consecutive references are unrelated, so the gap between two does not reveal how many came between
- `tests/request-submission.test.js`: DEC-004: without the key the mapping cannot be reproduced; another key gives other references
- `tests/request-submission.test.js`: a reference key shorter than 32 characters is refused at start-up
- `tests/request-submission.test.js`: a sequence value outside 1 to 99,999,999 is refused rather than wrapped into a reused reference
- `tests/request-submission.test.js`: only the reference format reaches a lookup
- `tests/request-submission.test.js`: a malformed reference is refused without querying the store

### TC-13 Submission validation

| Field | Value |
|---|---|
| Test basis | FR-005, FR-006, FR-007, FR-021; schema VARCHAR(200) for the title; DEC-017 (proposed) for the other limits and the urgency scale |
| Why selected | Validation decides what reaches the database and what the requester is told; a missed limit fails at the database with no useful message |
| Technique and level | Boundary values and equivalence partitions; unit |
| Input or precondition | Each text field at 1, its maximum and maximum plus one, blank and non-text; titles counted in characters including emoji and accented letters; categories active, inactive, unknown and malformed; urgency levels and near misses |
| Expected result | Every failing field is reported at once, by name; values are trimmed before measuring; lengths are counted in characters as the schema counts them; only active categories are accepted, and the id kept is the store's own; urgency matches a level exactly; only the five supplied fields are kept |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, #131 at 968a44f: 7 of 7 tests |
| Traceability | FR-005, FR-006, FR-007, FR-021, DEC-017, #112 |
| Interpretation | The description and location limits and the urgency scale are proposals until DEC-017 is agreed; the tests follow them and change with it. TC-25 and TC-26 repeat the cases through the endpoint |

**Automated by**

- `tests/request-submission.test.js`: FR-005: a complete submission is accepted with its values trimmed and only the five supplied fields kept
- `tests/request-submission.test.js`: FR-007: an empty submission reports every mandatory field at once, each by name
- `tests/request-submission.test.js`: FR-007 boundaries: each text field accepts 1 and its maximum, and refuses blank and maximum plus one
- `tests/request-submission.test.js`: FR-007 boundaries: length is counted in characters as the schema counts them, so an emoji counts once
- `tests/request-submission.test.js`: FR-006: a category outside the active list is refused, including one that exists but is inactive
- `tests/request-submission.test.js`: FR-006: the category id kept is the active category's own id, as the store holds it, not the text sent
- `tests/request-submission.test.js`: FR-021: reported urgency must be one of the proposed levels, matched exactly

### TC-14 Saving a submission

| Field | Value |
|---|---|
| Test basis | FR-005, FR-007, FR-009, FR-021 |
| Why selected | A client could send its own status, priority or requester; the server must set them |
| Technique and level | Positive and negative tests; component |
| Input or precondition | Valid and invalid submissions, some carrying status, priority and requester; a role that may not submit |
| Expected result | Saved as New with no priority and the signed-in user as requester, whatever the body says; the acknowledgement carries the reference and the stored time; an invalid submission is not saved; a role that may not submit is refused before validation; the route answers 201 or 400 with an error per field |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, #131 at 968a44f: 5 of 5 tests |
| Traceability | FR-005, FR-007, FR-009, FR-021, #112 |
| Interpretation | The server owns the fields it sets. Persistence in one transaction with the first history row is checked in TC-32 |

**Automated by**

- `tests/request-submission.test.js`: FR-005, FR-021: a submission is saved as New with no priority and the signed-in user as requester, whatever the body says
- `tests/request-submission.test.js`: FR-009: the acknowledgement carries the reference and the time the store recorded
- `tests/request-submission.test.js`: FR-007: an invalid submission is not saved
- `tests/request-submission.test.js`: a submission from an actor whose role may not submit is refused before validation
- `tests/request-submission.test.js`: POST answers 201 with the acknowledgement, or 400 with an error per failing field

### TC-15 The requester's list and detail

| Field | Value |
|---|---|
| Test basis | FR-010, FR-012 |
| Why selected | The answer for another person's reference must not differ from the answer for a reference that does not exist, or references can be probed |
| Technique and level | Negative tests and equivalence partitions (own, another's, missing, no actor); component |
| Input or precondition | Requests from two requesters; the first requester signed in, and no actor |
| Expected result | The list holds every request the requester submitted, once, with six fields, and nobody else's. Another's reference and a missing one get the same 404 and body. The lookup is made with the policy's scope, so another's request is never loaded. Without an actor every entry point refuses with 401 |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, #131 at 968a44f: 5 of 5 tests |
| Traceability | FR-010, FR-012, ADR-006, #112 |
| Interpretation | Not found and not permitted cannot be told apart, at the service and at the route |

**Automated by**

- `tests/request-submission.test.js`: FR-010: the list holds every request the requester submitted, once, with the six fields, and nobody else's
- `tests/request-submission.test.js`: FR-012: another requester's reference and a reference that does not exist get the same answer
- `tests/request-submission.test.js`: FR-012: the lookup is made with the policy's scope, so another requester's request is never loaded
- `tests/request-submission.test.js`: FR-012: GET on another requester's reference and on a missing one returns the same 404 and body
- `tests/request-submission.test.js`: without a signed-in actor every entry point refuses, and the routes answer 401

## Workflow (#113)

### TC-16 Assignment and acceptance

| Field | Value |
|---|---|
| Test basis | FR-015, FR-025 |
| Why selected | Assigning to someone outside the category puts the request where nobody can work on it; accepting outside one's categories takes work one may not see |
| Technique and level | Equivalence partitions of assignee (active Staff in category, other category, inactive, not Staff); negative tests; component |
| Input or precondition | A New request in category 10; Staff in 10 and 11, an inactive Staff member, a Coordinator |
| Expected result | Assigning writes the status, one history row and one audit entry per changed field. Staff accepting an unassigned request in their category become its assignee. The assignee must be active Staff authorised for the category. Reassigning changes only the assignee, with no history row. Accepting outside one's categories is refused by the policy alone, and still refused if the scope load were bypassed |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, #132 at cd05304: 6 of 6 tests |
| Traceability | FR-015, FR-025, ADR-006, #113 |
| Interpretation | The category rule holds at two layers |

**Automated by**

- `tests/workflow-service.test.js`: FR-015, FR-025: assigning a new request writes the status, one history row and one audit entry for each changed field
- `tests/workflow-service.test.js`: FR-015: Staff accepting an unassigned request in their category become its assignee
- `tests/workflow-service.test.js`: FR-015: a request can only be assigned to an active Staff member authorised for its category
- `tests/workflow-service.test.js`: FR-015, FR-025: reassigning changes only the assignee, with one audit entry and no status history row
- `tests/workflow-service.test.js`: FR-015: the policy alone refuses Staff accepting a New request outside their categories
- `tests/workflow-service.test.js`: FR-015: if the scope load were bypassed, the accept is still refused and nothing is written

### TC-17 Resolving, closing and rejecting

| Field | Value |
|---|---|
| Test basis | FR-018, FR-019, FR-020 |
| Why selected | These are the outcomes the requester sees; a missing summary or reason, or the wrong role closing, is visible to the public |
| Technique and level | Positive and negative tests per outcome and role; component |
| Input or precondition | Requests In Progress, Resolved and New; Staff, Coordinator, Manager |
| Expected result | Resolving needs a summary, stored trimmed; without one nothing is written. Only a Coordinator or Manager closes, and only when confirmed. A Coordinator rejects with the reason kept on the history row; without a reason, or as a Manager, it is refused |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, #132 at cd05304: 3 of 3 tests |
| Traceability | FR-018, FR-019, FR-020, #113 |
| Interpretation | The confirmation for closing is a prompt, not a safeguard; the control is the role check |

**Automated by**

- `tests/workflow-service.test.js`: FR-018: resolving needs a summary; without one nothing is written, with one it is stored trimmed
- `tests/workflow-service.test.js`: FR-019: only a Coordinator or Manager closes a resolved request, and only when confirmed
- `tests/workflow-service.test.js`: FR-020: a Coordinator rejects with a reason kept on the history row; no reason, or a Manager, is refused

### TC-18 A change and its audit entry are written together or not at all

| Field | Value |
|---|---|
| Test basis | FR-025; ADR-001 rule 3; ADR-007 |
| Why selected | A status change without its audit entry is an unaudited change; two users moving the same request from the same state must not both succeed |
| Technique and level | Failure injection (the audit write throws); concurrency (the request changes between read and write); unit and component |
| Input or precondition | A store whose transactions roll back; an audit write made to fail; a request changed by another user after it was read |
| Expected result | When the audit write fails, the status change and its history row are rolled back. A change made by someone else in between is refused and nothing is written. Exactly one audit entry is written per audited field that changed, and none for unchanged or unaudited fields |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, #132 at cd05304: 3 of 3 tests |
| Traceability | FR-025, ADR-001, ADR-007, #113 |
| Interpretation | Shown with a store that rolls back the way PostgreSQL does. The same cases against PostgreSQL are TC-32 |

**Automated by**

- `tests/workflow-service.test.js`: ADR-001 rule 3: if the audit entry cannot be written, the status change and its history row are rolled back
- `tests/workflow-service.test.js`: a change made by someone else after the request was read is refused, and nothing is written
- `tests/workflow-service.test.js`: FR-025: exactly one entry per audited field that changed, and none for unchanged or unaudited fields

### TC-19 Priority

| Field | Value |
|---|---|
| Test basis | FR-021, FR-025; DEC-002; DEC-017 (proposed scale) |
| Why selected | Priority is the Coordinator's call; the reported urgency must never be overwritten by it |
| Technique and level | Equivalence partitions by role and by value; component |
| Input or precondition | A request with reported urgency High; each role; values in and out of the scale, and the current value |
| Expected result | A Coordinator sets the priority with one audit entry and the reported urgency untouched; Staff, a Manager and the Requester are refused; a value outside the scale is refused; setting the same value again writes no audit entry |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, #132 at cd05304: 3 of 3 tests |
| Traceability | FR-021, FR-025, DEC-002, DEC-017, #113 |
| Interpretation | The Manager refusal follows CR-002 |

**Automated by**

- `tests/workflow-service.test.js`: FR-021, FR-025: a Coordinator sets the priority with one audit entry, and the reported urgency is untouched
- `tests/workflow-service.test.js`: FR-021: Staff, a Manager and the Requester are refused when they try to set the priority
- `tests/workflow-service.test.js`: a priority outside the scale is refused, and setting the same priority again writes no audit entry

### TC-20 Action entries

| Field | Value |
|---|---|
| Test basis | FR-017; DEC-003 |
| Why selected | An entry saved with a guessed visibility can expose an internal note; DEC-003 says there is no default |
| Technique and level | Equivalence partitions of visibility (internal, requester-visible, missing, other) and text (empty, normal, over 4,000); component |
| Input or precondition | A request in scope; Staff and the Requester |
| Expected result | An entry without an explicit visibility is refused; Staff record either visibility with author and text, and entries are not audit entries; a Requester is refused; an empty or oversized entry is refused |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, #132 at cd05304: 3 of 3 tests |
| Traceability | FR-017, DEC-003, #113 |
| Interpretation | No path saves an entry without a deliberate visibility |

**Automated by**

- `tests/workflow-service.test.js`: FR-017, DEC-003: an action entry without an explicit visibility is refused; there is no default
- `tests/workflow-service.test.js`: FR-017: Staff record entries of either visibility with the author and text; entries are not audit entries
- `tests/workflow-service.test.js`: a Requester cannot record an action entry, and an empty or oversized entry is refused

### TC-21 Workflow routes answer with the right status code

| Field | Value |
|---|---|
| Test basis | FR-012, FR-016; the route contract in #132 |
| Why selected | The client decides what to show from the status code; a 404 where a 403 belongs discloses nothing, but a 403 where a 404 belongs confirms the request exists |
| Technique and level | API at the handler boundary; negative tests |
| Input or precondition | One request; actors outside scope, without the permission, making a move outside the model, a move whose guard fails, and a valid move |
| Expected result | 404 out of scope (same body as missing), 403 not permitted, 409 outside the model or changed underneath, 422 guard failed, 200 done. A Requester cannot move their own request, and another's request is not found. A move outside the model writes nothing |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, #132 at cd05304: 3 of 3 tests |
| Traceability | FR-012, FR-016, #113 |
| Interpretation | One case per code. TC-22 and TC-24 cover every role and every status pair |

**Automated by**

- `tests/workflow-service.test.js`: the workflow routes answer 200, 403, 404, 409 and 422 for the matching outcomes
- `tests/workflow-service.test.js`: FR-012, FR-016: a Requester cannot move their own request, and another requester's request is not found
- `tests/workflow-service.test.js`: FR-016: a move outside the status model is refused and nothing is written

## API suites at the handler boundary (#121)

These run the real handlers of #111 to #113 behind the real authentication middleware, with signed session
cookies, over an in-memory store that evaluates the policy's query conditions and rolls transactions back
(`tests/support/api.js`). The PostgreSQL runs replace only that store (TC-32).

### TC-22 Access Matrix decision table through the endpoints

| Field | Value |
|---|---|
| Test basis | NFR-005, FR-002, FR-011, FR-012; the Access Matrix register; CR-002 |
| Why selected | TC-01 shows the policy is right; this shows each endpoint asks it. A route that forgets the check passes TC-01 |
| Technique and level | Decision table, 15 functions by 4 roles, each cell an endpoint call; black-box at the API |
| Input or precondition | One signed-in user per role, each with a request in scope; expectations read from the register fixture, with CR-002's four cells refused |
| Expected result | Each cell succeeds where the register permits and is refused where it does not. A refusal is a 403, or a 404 for a request out of scope (FR-012), or the internal entry left out (FR-011), and writes nothing. For "change status", every move in the table succeeds exactly for the roles the model names. The management, category and user functions are checked at the permission check their routes will use |
| Actual result | As expected for 60 cells; 3 todo |
| Status | Pass, with three cells' own endpoints Not yet built (#115, #117) |
| Evidence | Local run, 7 October 2026, #121 at 2362c11 (local): 61 pass, 3 todo |
| Traceability | NFR-005, FR-002, FR-011, FR-012, CR-002, #121 |
| Interpretation | Every built endpoint enforces its cells, called directly rather than through the interface, as NFR-005's verification method asks. The three todos become endpoint calls when #115 and #117 add the routes |

**Automated by**

- `tests/api-decision-table.test.js`: the decision table covers every function in the register, each with a probe
- `tests/api-decision-table.test.js`: NFR-005 decision table: *

### TC-23 Calls without a session

| Field | Value |
|---|---|
| Test basis | FR-001 |
| Why selected | A single endpoint reachable without a session breaks FR-001 for everything behind it |
| Technique and level | Negative test; black-box at the API |
| Input or precondition | No session cookie; a Resolved request |
| Expected result | Every endpoint and every permission check answers 401, and nothing is written |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, #121 at 2362c11 (local): 1 of 1 test |
| Traceability | FR-001, #121 |
| Interpretation | Holds for the endpoints built so far; each new endpoint is added to this test |

**Automated by**

- `tests/api-decision-table.test.js`: FR-001: without a session every call answers 401 and writes nothing

### TC-24 Every status pair through the endpoint

| Field | Value |
|---|---|
| Test basis | FR-016, FR-025; the Status Model register; ADR-005 |
| Why selected | The service and route could disagree with the table even when TC-05 passes |
| Technique and level | State transition, all 49 ordered pairs; black-box at the API |
| Input or precondition | A request in each status, in scope for each role; every required input supplied |
| Expected result | A pair in the model succeeds for each role it names, with one history row (none for reassignment) and one audit entry per changed field. Every other pair is 409 for every role, with status, history and audit unchanged. A target that is not a status is 400. Closed and Rejected are final. One request's whole life leaves its path in the history and ten audit entries |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, #121 at 2362c11 (local): 169 of 169 tests |
| Traceability | FR-016, FR-025, ADR-005, RSK-09, #121 |
| Interpretation | 0-switch coverage of the model through the endpoint, plus one end-to-end path |

**Automated by**

- `tests/api-state-transitions.test.js`: the suite covers all 49 ordered pairs, and the model's moves are among them
- `tests/api-state-transitions.test.js`: FR-016 *
- `tests/api-state-transitions.test.js`: FR-016: a target that is not a status is refused with 400 and changes nothing
- `tests/api-state-transitions.test.js`: FR-016: Closed and Rejected are final; no move leaves them
- `tests/api-state-transitions.test.js`: FR-016, FR-025: a request's whole life through the endpoint leaves its path in the history

### TC-25 Submission boundaries through the endpoint

| Field | Value |
|---|---|
| Test basis | FR-007; schema VARCHAR(200); DEC-017 (proposed) |
| Why selected | Limits are where validation and storage disagree; the emoji case was found here |
| Technique and level | Boundary value analysis; black-box at the API |
| Input or precondition | A signed-in Requester; each text field at 1, 2, maximum minus one, maximum and maximum plus one; the title in characters with emoji and accented letters |
| Expected result | 1, 2, max-1 and max accepted; blank and max+1 refused with one error on that field and nothing saved; the title counted in characters as the schema counts them, with the message counting the same way; the service's limits equal the pinned values |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, #121 at 2362c11 (local): 5 of 5 tests |
| Traceability | FR-007, DEC-017, #112, #121; the defect fixed in 968a44f |
| Interpretation | The emoji case is a regression test for the counting defect fixed in #131 (968a44f) |

**Automated by**

- `tests/api-submission-boundaries.test.js`: the limits the suite tests are the ones the service holds; a change to them is a decision (DEC-017)
- `tests/api-submission-boundaries.test.js`: FR-007 title boundaries *
- `tests/api-submission-boundaries.test.js`: FR-007 description boundaries *
- `tests/api-submission-boundaries.test.js`: FR-007 location boundaries *
- `tests/api-submission-boundaries.test.js`: FR-007 title boundary in characters, as the schema counts them: an emoji or an accented letter counts once

### TC-26 Submission partitions through the endpoint

| Field | Value |
|---|---|
| Test basis | FR-005, FR-006, FR-007, FR-009, FR-021 |
| Why selected | Each partition is a different way a client can send a bad value; one representative of each is enough, and each must fail cleanly |
| Technique and level | Equivalence partitions; black-box at the API |
| Input or precondition | A signed-in Requester; for each text field blank, whitespace, missing, null, number, array, object and boolean; categories active by number and string, inactive, unknown, zero, negative, fraction, blank, array, object, boolean and a name; urgency levels and near misses; bodies that are empty or not objects; bodies carrying server-set fields |
| Expected result | Each invalid partition is refused with one error on its field and nothing saved; several invalid fields are reported together; padding is trimmed; the category is saved as the store's id; server-set fields are ignored; an accepted submission answers 201 with a reference in the agreed format |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, #121 at 2362c11 (local): 11 of 11 tests |
| Traceability | FR-005, FR-006, FR-007, FR-009, FR-021, #121 |
| Interpretation | The endpoint refuses every malformed shape without saving |

**Automated by**

- `tests/api-submission-boundaries.test.js`: FR-007 title partitions*
- `tests/api-submission-boundaries.test.js`: FR-007 description partitions*
- `tests/api-submission-boundaries.test.js`: FR-007 location partitions*
- `tests/api-submission-boundaries.test.js`: FR-006 category partitions*
- `tests/api-submission-boundaries.test.js`: FR-021 urgency partitions*
- `tests/api-submission-boundaries.test.js`: FR-007: an empty body reports all five fields at once and saves nothing
- `tests/api-submission-boundaries.test.js`: FR-007: several invalid fields are all reported in one answer, each by name
- `tests/api-submission-boundaries.test.js`: FR-005, FR-021: fields the server sets are ignored when a client sends them
- `tests/api-submission-boundaries.test.js`: FR-009: an accepted submission answers 201 with its reference and time, and the reference is the agreed format

## Client (#118 to #120)

### TC-27 The client's API layer

| Field | Value |
|---|---|
| Test basis | FR-001, FR-007; the API contract in #133 |
| Why selected | Every screen goes through this layer; a mishandled 401 or 400 breaks sign-in or validation messages everywhere |
| Technique and level | Component, with a fake fetch |
| Input or precondition | Answers 200, 204, 400 with field errors, 401 on a protected call and on sign-in, and a reference with path characters |
| Expected result | Calls go to the application's own /api with the session cookie and JSON; a 400's field errors reach the screen; a 401 on a protected call sends the user to sign in, and a failed sign-in shows the message without redirecting; a reference is encoded into the path; a 204 and a non-JSON answer are handled |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, client at 7948369: 6 of 6 tests |
| Traceability | FR-001, FR-007, #118 |
| Interpretation | A crafted reference cannot change which endpoint is called |

**Automated by**

- `client/test/api-and-router.test.js`: every call goes to the application's own /api with the session cookie and JSON
- `client/test/api-and-router.test.js`: FR-007: a 400 carries the server's field errors to the screen
- `client/test/api-and-router.test.js`: FR-001: a protected call answering 401 sends the user to sign in
- `client/test/api-and-router.test.js`: FR-001: a failed sign-in shows the server's message and does not redirect
- `client/test/api-and-router.test.js`: a reference is encoded into the path, so it cannot change which endpoint is called
- `client/test/api-and-router.test.js`: a 204 answer and a response without JSON are handled

### TC-28 Navigation and screens follow the server's permissions

| Field | Value |
|---|---|
| Test basis | FR-002, FR-004, FR-013; ADR-006 |
| Why selected | A client that maps role names to screens itself drifts from the policy; an open redirect after sign-in sends users to another site |
| Technique and level | Equivalence partitions by role, with permissions from the policy itself; negative tests; component |
| Input or precondition | Users carrying the permissions the policy grants each role, and users with no permissions list; return addresses inside and outside the application |
| Expected result | Each role is offered exactly the screens and menu items its permissions allow, and a Requester gets no Queue; with no permissions list nothing extra is offered; every route's permission is a policy function; the reset screen is public, stays open to a signed-in user, and the administration screens are not public; the router matches each screen; only a path inside the application is accepted as a return address |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, client at 7948369: 8 of 8 tests |
| Traceability | FR-002, FR-004, FR-013, ADR-006, #118 to #120 |
| Interpretation | The client hides what the server would refuse; the server still checks every call (TC-22) |

**Automated by**

- `client/test/api-and-router.test.js`: the router matches each screen, with the submission form ahead of a reference
- `client/test/api-and-router.test.js`: only a path inside the application is accepted as the return address after sign-in
- `client/test/staff-screens.test.js`: FR-013, FR-002: each role's navigation and screens follow the server's permissions; a Requester gets no Queue
- `client/test/manager-screens.test.js`: ADR-006: every permission a route asks for is a function the policy knows
- `client/test/manager-screens.test.js`: FR-002: each role is offered exactly the screens the policy permits it
- `client/test/manager-screens.test.js`: without a permissions list from the server nothing extra is offered, whatever the role name says
- `client/test/manager-screens.test.js`: the reset screen is public and the administration screens are not
- `client/test/manager-screens.test.js`: FR-004: the reset screen stays open to a signed-in user, and to a signed-out one

### TC-29 Queue filters and sorts

| Field | Value |
|---|---|
| Test basis | FR-014 |
| Why selected | Filters kept in the address can be bookmarked and shared, so any address, including a hand-edited one, must be read safely |
| Technique and level | Equivalence partitions and boundary values (date ranges); component |
| Input or precondition | Filter sets with empty values and defaults; addresses with unknown sorts, bad pages and unknown keys; ranges ending before they start |
| Expected result | Filters round-trip through the address with empties and defaults left out; unknown values are replaced or dropped; a backwards range is caught before sending; exactly the three named sorts are offered in both directions |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, client at 7948369: 4 of 4 tests |
| Traceability | FR-014, #119 |
| Interpretation | The queue's server side (#114) is not built yet; its filtering is covered by TC-32 once it is |

**Automated by**

- `client/test/staff-screens.test.js`: FR-014: filters round-trip through the address, with empty values and defaults left out
- `client/test/staff-screens.test.js`: an unknown sort, a bad page and unknown parameters from the address are replaced or dropped
- `client/test/staff-screens.test.js`: a date range ending before it starts is caught before the request is sent
- `client/test/staff-screens.test.js`: FR-014: the queue offers each of the three named sorts in both directions, and nothing else

### TC-30 The management view's arithmetic

| Field | Value |
|---|---|
| Test basis | FR-022, FR-023, FR-024; SC-D-03 |
| Why selected | FR-023's totals must reconcile with FR-022's counts; a pivot that drops or doubles a pair breaks that |
| Technique and level | Component; boundary values for the period (time zone, end before start) |
| Input or precondition | Breakdown rows with missing pairs, duplicates and bad counts; an empty breakdown; times either side of midnight in Johannesburg |
| Expected result | The breakdown pivots to categories by statuses with totals both ways and missing pairs as zero; duplicates are added and bad counts are zero; an empty or all-zero breakdown shows the no-requests message; the default period is the 30 days ending today in South African time; a period needs both dates and must not end before it starts; ages read as whole days; the overdue target is stated exactly as sent |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, client at 7948369: 7 of 7 tests |
| Traceability | FR-022, FR-023, FR-024, SC-D-03, #120 |
| Interpretation | The counts themselves are the server's (#117), checked against seeded data in TC-32 |

**Automated by**

- `client/test/manager-screens.test.js`: FR-023: the breakdown becomes categories by statuses with totals both ways, missing pairs counting zero
- `client/test/manager-screens.test.js`: FR-023: a pair sent twice is added, and a bad count is treated as zero rather than breaking the totals
- `client/test/manager-screens.test.js`: FR-023: an empty breakdown, or one of zeros, shows the no-requests message instead of a table
- `client/test/manager-screens.test.js`: FR-022: the default period is the 30 days ending today in South African time
- `client/test/manager-screens.test.js`: FR-022: a period must have both dates and must not end before it starts
- `client/test/manager-screens.test.js`: FR-024: ages read as whole days
- `client/test/manager-screens.test.js`: FR-022: the overdue target is stated exactly as the server sends it

### TC-31 Administration screens

| Field | Value |
|---|---|
| Test basis | FR-006, FR-028 |
| Why selected | A deactivated category offered for a new account, or a refusal that does not say which account, misleads the Manager |
| Technique and level | Component; negative test |
| Input or precondition | Categories active, unmarked and inactive; a refused deactivation and reset |
| Expected result | Only active categories are offered; a refused action names the account it was for |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 7 October 2026, client at 7948369: 2 of 2 tests |
| Traceability | FR-006, FR-028, #120 |
| Interpretation | The server rules for these (#115) are not built yet |

**Automated by**

- `client/test/manager-screens.test.js`: FR-006: the account form offers only active categories
- `client/test/manager-screens.test.js`: FR-028: a refused action keeps the account's name in the message

## Password reset (#111)

### TC-36 Password reset through a Manager-issued code

| Field | Value |
|---|---|
| Test basis | FR-004, NFR-004, FR-001, FR-028; the reset fields agreed on #109 |
| Why selected | A reset path is a second way into an account. If its failures can be told apart, or a code works twice or for ever, it undoes what FR-001 and NFR-004 protect |
| Technique and level | Equivalence partitions of failure, boundary values (expiry, password length), negative tests, a concurrent-use case; component, and the two routes at the handler boundary |
| Input or precondition | Active and deactivated accounts; codes issued, replaced, expired and used; codes typed in other forms; new passwords at 7, 8, 128 and 129 characters |
| Expected result | Only a role with manageUsers issues a code, never for a missing or deactivated account; the code is stored only as a hash; it sets a new password that then signs in, works once, expires after 24 hours and is replaced by a new one; every failed reset gets one message, with the code checked against the dummy hash when there is no usable account; the password length is checked before any lookup; a code replaced between check and write is refused |
| Actual result | As expected |
| Status | Pass |
| Evidence | Local run, 8 October 2026, #146 at 7c8ae5d: 14 of 14 tests. Nine deliberate faults each failed a test |
| Traceability | FR-004, NFR-004, FR-001, FR-028, #111, #146 |
| Interpretation | The rules hold in the service and at the routes. Against PostgreSQL the conditional write is checked in TC-32. A reset does not end sessions already open elsewhere, which #146 records as a limitation |

**Automated by**

- `tests/password-reset.test.js`: FR-004: a Manager gets a one-time code in the agreed form, and only its hash is stored [#146]
- `tests/password-reset.test.js`: FR-002, FR-004: only a role with manageUsers can issue a code, and a refusal stores nothing [#146]
- `tests/password-reset.test.js`: a code is not issued for an account that does not exist or is deactivated (FR-028) [#146]
- `tests/password-reset.test.js`: codes come only from the alphabet without look-alikes, and do not repeat [#146]
- `tests/password-reset.test.js`: FR-004: the code sets the new password, which then signs in, and the code is cleared [#146]
- `tests/password-reset.test.js`: FR-004: a code works once [#146]
- `tests/password-reset.test.js`: FR-004: a code expires after its lifetime, and works until then [#146]
- `tests/password-reset.test.js`: FR-004: issuing a new code replaces the old one [#146]
- `tests/password-reset.test.js`: the code is accepted however the user types it: lower case, spaces, with or without the hyphen [#146]
- `tests/password-reset.test.js`: FR-004: every failure gets the same answer, and the code is checked even when there is no usable account [#146]
- `tests/password-reset.test.js`: the new password's length is checked first, before any lookup, so its message reveals nothing [#146]
- `tests/password-reset.test.js`: a code replaced between the check and the write is refused, so it cannot be used twice at once [#146]
- `tests/password-reset.test.js`: POST /api/users/:id/reset-code answers 200 with the code and expiry, 403, 404 or 409 [#146]
- `tests/password-reset.test.js`: POST /api/auth/reset answers 204, 400 with the password's error, or 400 with the one generic message [#146]

## Not yet runnable

### TC-32 The API suites against PostgreSQL

| Field | Value |
|---|---|
| Test basis | FR-008, FR-016, FR-025, FR-026, NFR-005; ADR-007 |
| Why selected | The in-memory store imitates the database; the sequence, the unique constraint, real transactions and the audit table's privileges only exist in PostgreSQL |
| Technique and level | API and integration against PostgreSQL 16 |
| Input or precondition | The Prisma schema and seed data (#109) and the adapter (#108); TC-22 to TC-26 run with the store in `tests/support/api.js` replaced by the adapter |
| Expected result | The same results as TC-22 to TC-26, plus: references unique under concurrent submission; a failed audit write rolls back the change; the application's database role cannot update or delete audit rows |
| Actual result | Not run |
| Status | Blocked: needs #108 and #109 |
| Evidence | None yet |
| Traceability | #121, #108, #109, ADR-007 |
| Interpretation | Not yet available |

**Automated by**

(none yet)

### TC-33 Journey: a requester submits and follows a request

| Field | Value |
|---|---|
| Test basis | FR-001, FR-005 to FR-011 |
| Why selected | The most common journey, across the client, the server and the database |
| Technique and level | End to end in the browser (Playwright) against staging |
| Input or precondition | Staging (#122) with seed data (#109): a requester account and an active category, named in the environment (`e2e/README.md`) |
| Expected result | The requester signs in and lands on their requests; an empty form is refused with all five fields named; a complete submission gets a reference in the agreed format; the detail shows what was typed, the status New and its first history entry; the list holds the request once, with its title and status |
| Actual result | Not run against staging. Against a local stand-in of the API contract: as expected |
| Status | Blocked: needs staging (#122) and the seed data (#109) |
| Evidence | The journey is #138. Local run against the stand-in, 7 October 2026, client at 7948369: passed. Removing the form's error summary failed it |
| Traceability | #123, #138, #122, #109 |
| Interpretation | The journey is ready and its steps match the client; it shows nothing about the real server until it runs on staging |

**Automated by**

- `e2e/journeys/requester-submits-and-follows.spec.js`: TC-33: a requester submits a request, gets its reference, and finds it in their list and its detail [#138]

### TC-34 Journey: staff take a request from New to Closed

| Field | Value |
|---|---|
| Test basis | FR-011, FR-013 to FR-021, FR-025 |
| Why selected | The workflow journey, with three users acting on one request, each with their own session |
| Technique and level | End to end in the browser (Playwright) against staging, with three browser contexts |
| Input or precondition | Staging (#122) with seed data (#109): Requester, Coordinator and Staff accounts, and an active category the Staff member is authorised for |
| Expected result | The Coordinator finds the request in the queue, sets the priority and assigns it, with Assign disabled until a staff member is chosen; the Staff member starts work, adds an internal note and a visible update, and resolves it with a summary; the Coordinator closes it, with Close disabled until confirmed, and no moves remain; the history shows each step and who made it; the requester sees Closed, the resolution and the visible update, and not the internal note |
| Actual result | Not run against staging. Against a local stand-in of the API contract: as expected |
| Status | Blocked: needs staging (#122) and the seed data (#109) |
| Evidence | The journey is #138. Local run against the stand-in, 7 October 2026, client at 7948369: passed. Enabling Assign before a choice, and sending internal notes to the requester, each failed it |
| Traceability | #123, #138, #122, #109 |
| Interpretation | The journey is ready and its steps match the client; it shows nothing about the real server until it runs on staging |

**Automated by**

- `e2e/journeys/staff-new-to-closed.spec.js`: TC-34: a request goes from New to Closed through the Coordinator and Staff, and the requester sees the outcome [#138]

### TC-35 Performance: the staff queue and request submission

| Field | Value |
|---|---|
| Test basis | NFR-001, NFR-002; ASR-02; M3 brief s13 |
| Why selected | The queue reads the most data and is used all day, and the Coordinator's queue is every request (FR-013). A slow acknowledgement makes requesters submit twice (STK-01) |
| Technique and level | Performance against staging: two timed scenarios with the requirements' own methods, and one small concurrent run |
| Input or precondition | Staging (#122) with 5,000 requests seeded through the API by `perf/seed.mjs`, a tenth rejected and three tenths assigned; the Requester and Coordinator accounts (#109); the paged queue endpoint (#114) |
| Expected result | NFR-001: the 95th percentile of 20 retrievals of the first queue page under 2.0 s, the distribution recorded. NFR-002: the 95th percentile of 20 submissions under 3.0 s. Concurrent run (10 clients, 30 s): no target set; latency, throughput and errors recorded |
| Actual result | Not run against staging. The statistics are tested; a trial against the API stand-in completed and NFR-001 marked it invalid, because the stand-in returns the whole queue rather than one page |
| Status | Blocked: needs staging (#122), the seed data (#109) and the queue endpoint (#114) |
| Evidence | The scripts and method are #139 (`docs/quality/performance/README.md`). The statistics: local run, 7 October 2026, #139 at 62da9fb, 6 of 6 tests. Results from staging go to `docs/quality/performance/results/` |
| Traceability | #124, #139, NFR-001, NFR-002, ASR-02 |
| Interpretation | Not yet available. The README records what a result will not show: production scale, dates spread over months, writes during reads, screen drawing time, and other hosts |

**Automated by**

- `perf/test/lib.test.js`: the 95th percentile of 20 samples is the 19th smallest, as the nearest-rank method gives [#139]
- `perf/test/lib.test.js`: a reported percentile is always a value that was measured, never an interpolation [#139]
- `perf/test/lib.test.js`: one slow sample in 20 does not move the 95th percentile, and two do [#139]
- `perf/test/lib.test.js`: no samples, or a percentile outside 0 to 100, is an error rather than a number [#139]
- `perf/test/lib.test.js`: the summary reports the distribution, with the mean beside it, not instead of it [#139]
- `perf/test/lib.test.js`: a result meets its target only when it is under it, as NFR-001 and NFR-002 say [#139]
