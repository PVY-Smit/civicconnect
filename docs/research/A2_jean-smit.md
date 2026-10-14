# SEN381 Assignment 2: Jean Smit Contribution

**Project:** CivicConnect\
**Contributor:** Jean Smit\
**Sections:** Task 1: Design quality and design patterns; Task 4, sections 4.1 and 4.3: Software configuration management, collaborative integration and the recommended team control; Task 5: Research-to-decision map

The text is the version merged into the A2 submission on 15 September 2026. Citation letters follow the submission's consolidated reference list, so a letter can be absent here where that entry is cited only in another member's section. Task 5 summarises every member's section, so its rows cite sources from Tasks 2, 3 and 4.2 as well.

## Task 1: Design quality and design patterns

### 1.1 The design problem

#### Coupling, cohesion and why they matter now

Coupling is the degree to which one module depends on the internals of another, and cohesion is
the degree to which the elements inside a module belong to a single purpose (Stevens, Myers and
Constantine, 1974). The two move together in a predictable way. When one responsibility is spread
across several modules, cohesion falls and coupling rises, because a change to that
responsibility now needs coordinated edits in each of them. Parnas (1972) proposed starting a decomposition from a list of difficult design decisions, or decisions likely to change, and designing each module to hide one such decision from the others, so that a change to it stays within one module.

This is relevant to CivicConnect at the stage it has now reached. While the system is a handful
of screens, a rule held in three places is a nuisance. Once the request lifecycle is implemented
across the user interface, the service layer, persistence and the audit trail (FR-025), a rule
held in three places becomes three places that must change together and can fall out of step.
The M1 baseline already records two such rules as likely to change: the status model under
RSK-09 and FEC-02, and authorisation scope under FEC-01. By Parnas's criterion, these are the
decisions to isolate first.

#### The SOLID principles that apply

Three of the five SOLID principles bear directly on the problems below. The other two are set
aside deliberately.

- **Single Responsibility.** A module should have one reason to change (Martin, 2002). A request
  entity that also decides which transitions are legal and which users may see it has at least
  three reasons to change, and each would arrive from a different requirement.
- **Open/Closed.** A module should be open to extension and closed to modification (Meyer, 1997;
  Martin, 2002). If adding a status transition means editing a conditional that already governs
  every other transition, each addition puts the existing, correct transitions at risk.
- **Dependency Inversion.** High-level policy should not depend on low-level detail, and both
  should depend on abstractions (Martin, 2002). A handler that reads role names directly depends
  on how roles are represented, when what it needs is a decision about what a role may do.

Liskov Substitution and Interface Segregation are not central to these two problems. Neither
problem turns on subtype hierarchies or on clients depending on wide interfaces, so including
them would add definitions without adding analysis.

#### Problem 1: deciding whether a status change is allowed

The baselined status model (Status Model register; PED s8.4) permits twelve transitions between
seven statuses. Each permitted transition names the roles authorised to perform it and a guard
condition that must hold. The guards differ in kind. Some require data to be supplied, such as a
rejection reason (FR-020) or a resolution summary (FR-018). Some require a prior condition, such
as an assignee having been nominated. One combines a transition with an authorisation rule: Staff
may move a New request to In Progress only within their authorised categories (FR-015). FR-016
requires every other transition to be refused.

The same knowledge is needed in at least three places. The service must enforce it. The interface
must know which actions to offer, or it will present actions that then fail. The M3 test matrix
must exercise every permitted and forbidden combination. If each of these encodes the rules
separately, they will diverge, and FR-016 will fail in whichever place was not updated. RSK-09
predicts that the model will prove insufficient in use, and FEC-02 records that a status added or
redefined after baseline is expensive.

The problem is therefore how to hold the transition rules in one place that every consumer reads,
in a form that can change without disturbing the transitions that are already correct.

#### Problem 2: deciding whether a user may see or act on a particular request

Authorisation in CivicConnect has two dimensions at once. The first is role: there are four
roles, and every permission decision is made on the server (FR-002). The second is the
relationship between the user and a specific record. A Requester may retrieve only the requests
they submitted (FR-012), and Staff and Coordinators see only requests within their authorised
categories (FR-013). A Requester additionally sees only the action entries marked
requester-visible (FR-011).

NFR-005 sets the target at zero successful unauthorised accesses across the full negative-test
matrix of roles and functions. Because that target is absolute, any approach in which one
forgotten check produces a breach cannot meet it reliably. OWASP ranks broken access control first
in its current Top 10 (OWASP, 2025), and its authorisation guidance recommends enforcing least
privilege, denying by default, and validating permissions on every request (OWASP, no date a).

The problem also has a performance dimension. The Staff queue must return its first page in under
2.0 seconds at 5,000 requests (NFR-001), so an approach that loads every request and discards the
unauthorised ones afterwards trades performance for simplicity. FEC-01 records the question as
unresolved and as gating both DEC-009 and DEC-011.

### 1.2 Alternatives for each problem

#### Problem 1 alternatives

**Option 1A: conditional logic in the service.** A single method inspects the current status, the
requested status, the actor's role and the guard, and branches accordingly. This is the simplest
approach and the one a team is most likely to reach for first.

Its cohesion is good at the start, because every rule sits in one method. The weakness is that
the method changes for every rule, which works against the Open/Closed principle, and the
interface still needs its own copy of the rules to decide which actions to offer. It is
appropriate when a state model is small and confirmed as stable. Twelve transitions with guards of
different kinds is close to that limit, and RSK-09 records that the model is not expected to stay
stable.

**Option 1B: the State pattern.** The State pattern allows an object to change its behaviour when
its internal state changes, by delegating to a separate object for each state (Gamma et al.,
1994). Each status becomes a class that knows which statuses it may move to and what each move
requires. Behaviour for a given status is highly cohesive, and each state class can be tested in
isolation.

The costs are specific to our model. The state classes must refer to one another to express
transitions, which couples them. Adding a status means a new class and edits to every state that
can reach it, so it does not fully satisfy Open/Closed either. It also adds work at the
persistence boundary, because a stored status value has to be converted back into the correct
state object each time a request is loaded.

The pattern is justified when states differ substantially in behaviour. In CivicConnect, the
statuses differ mainly in which transitions they permit and under what condition, while the
request itself behaves in much the same way in each. Seven classes to express what is largely a
lookup is an example of a presumptive feature: flexibility built before it is needed, which Fowler
(2015) notes carries a cost to build, a cost of delay, and an ongoing cost of carrying the added
complexity.

**Option 1C: a declarative transition table with interchangeable guards.** The permitted
transitions are held as data. Each entry records a from status, a to status, the authorised roles
and a guard. The guards are small interchangeable objects, which is the Strategy pattern applied
to the one part of the rule that varies in kind (Gamma et al., 1994). A single transition policy
looks up the requested move, checks the role and evaluates the guard.

The service enforces transitions through the policy, and the interface asks the same policy which
actions to offer, so both read one set of rules. Adding a transition means adding an entry, and a
new guard object is needed only when a new kind of condition appears, which comes close to
Open/Closed. The table can be tested exhaustively by iterating every combination of from status,
to status and role, which is the shape of the M3 transition test matrix. It also corresponds row
for row to the baselined Status Model register, so a reviewer can check the implementation against
a controlled artefact directly.

The main risk, in our assessment, is that a table of rules can grow into an informal configuration
language if the guards become complex. Keeping the table in typed code, and out of external
configuration files, limits that risk.

| Criterion | 1A Conditionals | 1B State pattern | 1C Table with guards |
|---|---|---|---|
| Rules held in one place | Yes, in one method | Spread across state classes | Yes, in one table |
| Interface and service share the rules | No | No | Yes |
| Adding a transition | Edit the method | New class, edits to others | Add an entry |
| Coupling | Low, method grows | State classes coupled | Low |
| Testability | Combinatorial, by hand | Per state class | Exhaustive by iteration |
| Persistence overhead | None | Rebuild state object on load | None |
| Over-engineering risk | Low | High for this model | Moderate if guards grow |

#### Problem 2 alternatives

**Option 2A: checks written inline in each handler.** Every endpoint checks the user's role and,
where relevant, whether the user owns the request or holds its category. This is simple and
visible at the point of use.

It couples authorisation to every endpoint, repeats the same rules many times, and fails NFR-005
the first time a handler omits a check. Validating permissions on every request (OWASP, no date a)
is difficult to do reliably when the check has to be written again by hand in each handler. This
approach suits a small system with few endpoints and a single role. CivicConnect has four roles
and record-level rules.

**Option 2B: a central policy component.** Authorisation decisions are made by a dedicated
component that answers questions such as whether this user may view this request, or perform this
transition. Evans (2003) describes the Specification pattern, which expresses a business rule as a
predicate object that can be tested and reused. This fits rules such as "a Requester may view a
request only if they submitted it".

Handlers depend on the policy and do not need to know how roles are represented, which applies
Dependency Inversion. The rules sit in one place and can be tested exhaustively against the Access
Matrix (PED s8.3), which gives NFR-005 a direct basis for testing.

Two weaknesses remain. The policy centralises the decision, but it does not by itself guarantee
that every handler asks for it. And while it works well for a single request, a list built this way
means loading every candidate request and then discarding the ones the user may not see, which is a
poor fit for the Staff queue under NFR-001.

**Option 2C: authorisation applied at the query.** Data access is scoped so that unauthorised
records are never returned. A Requester's queries are constrained to requests they submitted, and a
Staff member's queries to their authorised categories. This can be done inside the repository
methods (Fowler, 2002), or with a protection proxy that stands in front of the repository and
controls access to it (Gamma et al., 1994).

Lists and queues are correct by construction, because a record the user may not see is never
loaded, and the filtering happens in the database, which supports NFR-001.

The costs are real. Authorisation now depends on the data model carrying the fields it scopes by,
which ties it to DEC-011. Decisions about actions, such as whether a user may perform a particular
transition, do not fit naturally into a query. And a query added later without the scope will
bypass it without any warning, so the protection depends on discipline in the place where it is
hardest to review.

| Criterion | 2A Inline checks | 2B Central policy | 2C Query scoping |
|---|---|---|---|
| Rules held in one place | No | Yes | Partly, per repository |
| Lists and queues correct by construction | No | No, loads then filters | Yes |
| Handles action permissions | Yes, scattered | Yes | Poor fit |
| Meets NFR-005 reliably | No | Only if always called | Only if every query is scoped |
| Testable against the Access Matrix | Per endpoint | Directly, in isolation | Needs a database |
| Coupling to the data model | Low | Low | High |

### 1.3 Recommendations for M2

**Problem 1: we recommend Option 1C, a declarative transition table with Strategy guards.** The
research points towards matching the pattern to the kind of variation in the requirement. The
State pattern is intended for objects whose behaviour differs by state (Gamma et al., 1994). Our
statuses differ chiefly in their permitted transitions and the conditions on them, and that
variation is tabular. Option 1C gives the interface and the service one shared source of rules,
makes the baselined Status Model register exhaustively testable, and lets the change RSK-09
predicts be absorbed as new entries without editing existing logic. Option 1A would be defensible
only if the status model were confirmed as stable, and the baseline records the opposite.

**Problem 2: we recommend combining Option 2C for reads with Option 2B for actions.** The
requirement has two shapes. Which requests a user can see is a question about data. It belongs in
the query, so that lists and queues can never return another Requester's or another category's
records (FR-012, FR-013) and so that the queue can meet NFR-001. Whether a user may perform an
action on a request is a decision. It belongs in a central policy that can be tested against the
Access Matrix. Option 2B alone would load and discard records in the queue, and Option 2C alone
would scatter action checks again.

We recognise that two mechanisms carry more complexity than one. We recommend the combination
because each covers the part of the requirement that the other handles poorly, and we would not
apply it by default elsewhere. Option 2A is rejected because NFR-005 is an absolute target, and
inline checks fail it on the first omission.

**Where the two recommendations meet.** The authorised roles in the Problem 1 transition table should be evaluated through the Problem 2 policy. This keeps every authorisation decision in one component, with no separate role check, and it means the New to In Progress transition,
whose guard includes category scope, does not duplicate the scoping rule.

| Problem | Recommended | Rejected, and why | M2 decision informed | Evidence expected in M2 |
|---|---|---|---|---|
| Status change legality | 1C, table with Strategy guards | 1B: complexity for variation that is tabular. 1A: model not stable (RSK-09) | DEC-009 | ADR for the transition mechanism; table traced to the Status Model register; M3 transition test matrix |
| Record-level authorisation | 2C for reads, 2B for actions | 2A: fails NFR-005 on the first omitted check | DEC-009, DEC-011, FEC-01 | ADR for authorisation; data model carrying requester and category; policy tests against the Access Matrix; NFR-005 negative-test matrix |

These are recommendations. Assignment 2 records the research. The M2 design decision, its
rationale and its application are recorded in the controlled project artefacts, and the final
choice may differ where the team has project-specific evidence.

---

## Task 4: Collaborative engineering and Continuous Integration

### 4.1 Software configuration management and collaborative integration

#### Version control and software configuration management

Version control records successive versions of files and allows work to branch and be merged
again. Software configuration management is broader. The Systems Engineering Body of Knowledge
describes configuration management as five activities: planning and management, configuration
identification, configuration change management, configuration status accounting, and
configuration audit, and notes that the benefits are greatest when all five are planned and
carried out (Metcalf, Hallenbeck and Gonthier, 2025). The software engineering body of knowledge
treats software configuration management as a knowledge area in its own right (IEEE Computer
Society, 2024).

Version control supports identification, and part of change management. It does not decide what
is allowed to enter the baseline, who authorises a change, or whether the recorded state of the
baseline matches what is actually in it. Those questions belong to change control, status
accounting and audit.

CivicConnect has already shown the difference in practice. During M1, two pull requests (#29 and
#33) were recorded by version control as merged, but they had merged into base branches that had
already landed, so their content never reached `main`. Version control reported success. The
configuration baseline did not contain the change. The gap was found by checking what `main`
actually contained, which is an audit activity, and the four affected changes were landed again
in #38. The repository also treats documents as controlled items alongside code: the PED and the
registers change through the same pull requests and reviews as source files would, and the pull
request template asks the author to state which registers the change updates, which is status
accounting built into the workflow.

#### Branching, pull requests and review for a three-person team

Fowler (2020) describes a set of branching patterns built around a mainline that is kept in a
healthy state, and examines integration frequency as the variable that matters: the longer work
stays on a separate branch, the larger and riskier its eventual integration becomes. He compares
feature branching with continuous integration on that basis.

The Master Project Brief sets two constraints on how CivicConnect applies this. `main` is
protected, and every substantive change needs two approvals from members other than its author
(Belgium Campus ITversity, 2026). The team implemented those constraints as a single active
GitHub ruleset on `main` with no bypass list, requiring a pull request with two approvals,
dismissing stale approvals when new commits are pushed, requiring linear history and blocking
force pushes, all of which are standard rules in the platform (GitHub, no date). Work happens on a
short-lived branch per issue, named `<type>/<issue>-<description>`, with one issue per pull
request.

The harder question the brief raises is how to make the two-approval rule meaningful in practice. Google's review guidance sets the standard as approving a change once it
improves the overall health of the code, even where it is not perfect (Google, no date). Under that standard, review is a judgement about the change. Bacchelli and Bird (2013) studied tool-based code review across teams at Microsoft and found that although finding defects remained the main motivation for review, reviews were less about defects than expected and provided additional benefits: knowledge transfer, increased team awareness, and alternative solutions to problems. They also found that understanding the code and the change is the central part of reviewing.

Three features of CivicConnect's workflow encourage that kind of review:

- **Stale approvals are dismissed on push.** An approval always refers to the commit that is
  merged. Across M1, 17 approvals were dismissed this way and had to be given again.
- **The pull request template asks the author to point the reviewer at the part they are least
  sure about.** This directs attention to where review adds most, and supports the understanding that Bacchelli and Bird (2013) identify as central to reviewing.
- **Reviewers used the power to block.** Nine reviews requested changes before approval.

Two configured limits should be stated plainly. The ruleset does not require review comment
threads to be resolved before merging, and it does not require separate approval of the most
recent push.

#### Traceability as practised

The contribution rules ask every commit to carry a `Refs:` line naming the issue and, where one
applies, the requirement, risk or decision it relates to. The repository history shows how
closely that was followed:

| Practice | Result on `main` |
|---|---|
| Merged pull requests that link an issue | 13 of 13 |
| Commits after the controls were set up that reference an issue | 16 of 16 |
| Of those, commits that also cite a requirement, risk or decision ID | 8 of 16 |
| Merged pull requests whose branch follows the naming convention | 9 of 13 |

Issue linking is complete. Citing requirement identifiers in commits is the practice with the most
room to improve. The naming breaches, five branches in total including one on a pull request that
was later closed, are recorded as issue #37.

#### Collaboration and integration risks, and ways to control them

**Risk 1: review capacity (RSK-04, FEC-07).** With exactly three members and two required
approvals from non-authors, every merge needs both of the other members, so one absence blocks all
controlled change. This risk materialised during M1. Across the 13 merged pull requests, the median
time from opening to merging was 30.5 hours. At the time of writing, #46 has held one approval for
five days while it waits for its second.

The ways to control it are limited by the Master Project Brief. Lowering the approval count would
relieve the bottleneck and is not available, because the two-approval rule is a project constraint.
The mitigations in place are small single-purpose pull requests, a 24-hour target for first review,
and two review windows each week held open by all three members. Where a delay happens anyway, the recorded contingency is to note the blockage and its cost. Bypassing the control and approving without reading are both ruled out. FEC-07 records why that matters: the pressure at a deadline is towards exactly
those two shortcuts, and both are visible in the history.

**Risk 2: controlled artefacts that git cannot merge.** This one also materialised. The PED and the
registers are Word and Excel files. For a binary file, git keeps the version from the current branch
and leaves the path in a conflicted state for a person to resolve, because such files have no
defined merge behaviour (Git Project, no date). On 10 September, #39 merged and rewrote both files.
Three other open pull requests (#40, #42 and #44) changed the same two files, so all three went into
conflict at once, two of them already holding both approvals. Rebuilding any one of them would have
force-pushed and dismissed its approvals under the team's own rule, and merging any one would have
put the other two into conflict again. The three were combined into a single pull request (#46,
issue #45).

The same files cause a second problem for review. Because they are binary, a pull request
that changes them shows the reviewer no line-level difference. On #46, both changed files report
zero lines added and zero removed, so the reviewer has to open the documents and compare them by
hand.

| Control | How it works | Benefit | Cost or limit |
|---|---|---|---|
| Keep Office files and merge one at a time | Serialise changes to each file | No new tooling | Conflicts recur whenever two pull requests touch one file; approvals are lost on rebuild; diffs remain unreadable |
| File locking | A member locks a file before editing it, which Git LFS supports because git's built-in conflict tools work only for text files (Git LFS, no date) | Prevents the conflict from arising | Serialises work at the file level; with one PED, effectively one author at a time; diffs remain unreadable |
| Custom merge driver | Git allows a custom driver to be defined for a file type (Git Project, no date) | Could merge automatically | High complexity for the internal structure of Word and Excel files; fragile; beyond the team's current capability |
| Author in text and generate the document | Write the PED in markdown and produce the Word file with a converter that applies a reference document for styling (Pandoc, no date) | Text merges normally; reviewers see line-level diffs; styling stays consistent | Adds a build step; formatting fidelity needs checking; spreadsheets do not convert as cleanly |

Section 4.2, Continuous Integration and quality gates, is Darius Mushi's research and is held in `docs/research/A2_darius-mushi.md`. Section 4.3 below refers to it.

### 4.3 Recommended team control

These recommendations cover repository and workflow practice. The quality gates that should block or warn are researched in section 4.2, and the checks that should become required status checks are set out below.

**Keep the Master Project Brief controls as configured.** Two approvals from non-authors, dismissal
of stale approvals, linear history, blocked force pushes and an empty bypass list operated as
intended during M1. The evidence is 17 approvals dismissed and earned again, nine requests for
changes, and defects found in review before merge.

**Require review threads to be resolved before merging.** This makes a reviewer's request for a
change binding without adding an approval, so it strengthens review at almost no cost to the review
capacity RSK-04 describes. We do not recommend also requiring approval of the most recent push. Stale
approvals are already dismissed on push, and a further approval step would add delay to a team whose
main constraint is throughput.

**Move the PED to markdown source and generate the Word document for submission.** This removes the
binary conflict for the largest controlled document and gives reviewers readable diffs. Figure sources
should be held in the repository alongside it, which issue #36 already records as needed. For the
registers, which are working well as spreadsheets, we recommend keeping the Excel format for now and
routing register changes through one open pull request at a time, and revisiting this if conflicts
recur. PED s12.4 reserves formal change requests for baselined scope, requirements and the status model, so a change of format is not one of those. The Master Project Brief is broader, and requires that changes after a baseline is approved are controlled rather than silently absorbed (Belgium Campus ITversity, 2026). The format change should therefore go through a reviewed, recorded change and be raised early in M2.

**Tighten traceability in commits.** Issue linking is already complete. The `Refs:` line should name
the requirement, risk or decision wherever one applies, since half of the commits currently do.

**Enforce "checks pass" through the ruleset.** The definition of done and the pull request
template both ask the author to confirm that checks pass, but no automated checks exist yet, so the
confirmation cannot be enforced. Once CI is in place, the checks recommended in section 4.2 should be
added to the ruleset as required status checks, so that a failing check blocks the merge in the same
way a missing approval does.

**Make the blocking checks from section 4.2 required.** The build, the automated tests for Must-priority requirements (NFR-012) and secret scanning (NFR-007) should be required status checks, so that a failure in any of them blocks the merge. Dependency and vulnerability scanning should also be required, configured to fail only on high or critical findings. Lint and static analysis should run on every pull request without being required, so that reviewers see the results without the merge being held up while the team's conventions are still forming.

**Record review delay as it happens.** Where a pull request waits beyond the first-review target, the
delay and its effect should be noted on the pull request at the time, which is the contingency RSK-04 already sets out. The constraint is then documented as it occurs.


## Task 5: Research-to-decision map

| A2 finding | Evidence and alternatives considered | Recommendation | Project decision it should inform | Expected PED, ADR, RTM or application evidence |
|---|---|---|---|---|
| **Design problem 1.** Transition rules are needed by the service, the interface and the tests, and would diverge if held separately. RSK-09 expects the status model to change. | Conditionals in the service; State pattern (Gamma et al., 1994); transition table with Strategy guards. Cost of presumptive flexibility (Fowler, 2015). | Transition table with Strategy guards | DEC-009 | ADR for the transition mechanism; table traced to the Status Model register (PED s8.4); M3 transition test matrix |
| **Design problem 2.** Authorisation has a role dimension and a record dimension. NFR-005 is an absolute target and the Staff queue is bound by NFR-001. | Inline checks; central policy using Specification (Evans, 2003); query scoping in the repository (Fowler, 2002). OWASP (2025; no date a). | Query scoping for reads, central policy for actions | DEC-009, DEC-011, FEC-01 | ADR for authorisation; data model carrying requester and category; policy tests against the Access Matrix (PED s8.3); NFR-005 negative-test matrix |
| **Persistence and data.** Request creation must commit as one operation, and concurrent submissions must never receive the same reference (FR-008). Reading the highest reference and adding one in application code is unsafe without locking. | Database-managed sequence with a unique constraint; application-generated reference with a unique constraint and retry; locked counter row. Validation split across UI, service and database (Fowler, 2002; PostgreSQL Global Development Group, 2026a, 2026b). Caching the next number rejected without evidence of need. | Database-native atomic sequence with a unique constraint as the final safeguard, coordinated by the service layer in one transaction | DEC-011, DEC-004 | M2 data model with the sequence and unique constraint; ADR for DEC-011 once the persistence technology is chosen; RTM trace for FR-008 |
| **Integration and API.** A status change must reach the Requester (FR-029), but a notification failure should not undo a valid update. Email and SMS stay deferred (SC-D-01). | In-process interface; HTTP/REST service (MDN, 2025, 2026a, 2026b; Microsoft, 2025); asynchronous event or message (Microsoft, 2026). Compared on coupling, performance, failure behaviour, testability, deployment, security and versioning. | In-process notification interface now, with an extension point for asynchronous events if email or SMS returns | DEC-009, DEC-010, DEC-005 | ADR for the notification mechanism; architecture and interface design; SC-D-01 kept deferred until M2 platform evidence |
| **SCM and CI.** Configuration management is broader than version control. Review capacity and unmergeable binary artefacts both materialised in M1. "Checks pass" is currently unenforced. The repository has version control and branch protection with no automated build or test, so it does not yet practise Continuous Integration as Fowler (2024) defines it. | Five configuration management activities (Metcalf, Hallenbeck and Gonthier, 2025); branching and integration frequency (Fowler, 2020); review standard (Google, no date). Four controls compared for binary artefacts. Five CI checks compared for blocking or warning (Fowler, 2024), with secrets handling from OWASP (2022; no date b); automated and human review compared (Yang et al., 2026). | Keep the Master Project Brief controls; require review threads resolved; PED to markdown with a generated Word document; required status checks once CI exists; CI on every pull request push and on main, with the build, Must-priority tests and secret scanning blocking, lint warning, and dependency scanning blocking only high and critical findings. | DEC-012, RSK-04, FEC-07; a controlled change to the PED source format (Master Project Brief s14); NFR-012, NFR-007, RSK-11 and RSK-12 through the CI checks; DEC-008 provisionally | Updated ruleset; CONTRIBUTING.md; recorded change to the PED source format; CI workflow and required status checks in M2 |


## References

Bacchelli, A. and Bird, C. (2013) 'Expectations, outcomes, and challenges of modern code review', in *Proceedings of the International Conference on Software Engineering (ICSE 2013)*. IEEE. doi: 10.1109/ICSE.2013.6606617.

Belgium Campus ITversity (2026) *SEN381 CivicConnect Master Project Brief*, version 1.1. Software Engineering 381. Belgium Campus ITversity.

Evans, E. (2003) *Domain-driven design: tackling complexity in the heart of software*. Boston, MA: Addison-Wesley.

Fowler, M. (2002) *Patterns of enterprise application architecture*. Boston, MA: Addison-Wesley.

Fowler, M. (2015) *Yagni*. 26 May. Available at: https://martinfowler.com/bliki/Yagni.html (Accessed: 15 September 2026).

Fowler, M. (2020) *Patterns for managing source code branches*. 28 May. Available at: https://martinfowler.com/articles/branching-patterns.html (Accessed: 15 September 2026).

Fowler, M. (2024) *Continuous integration*. 18 January. Available at: https://martinfowler.com/articles/continuousIntegration.html (Accessed: 15 September 2026).

Gamma, E., Helm, R., Johnson, R. and Vlissides, J. (1994) *Design patterns: elements of reusable object-oriented software*. Reading, MA: Addison-Wesley.

Git LFS (no date) *File locking*. Git LFS wiki. Available at: https://github.com/git-lfs/git-lfs/wiki/File-Locking (Accessed: 15 September 2026).

Git Project (no date) *gitattributes documentation*. Available at: https://git-scm.com/docs/gitattributes (Accessed: 15 September 2026).

GitHub (no date) *Available rules for rulesets*. GitHub Docs. Available at: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets (Accessed: 15 September 2026).

Google (no date) *The standard of code review*. Google Engineering Practices Documentation. Available at: https://google.github.io/eng-practices/review/reviewer/standard.html (Accessed: 15 September 2026).

IEEE Computer Society (2024) *Guide to the Software Engineering Body of Knowledge (SWEBOK Guide)*, Version 4.0. Available at: https://www.computer.org/education/bodies-of-knowledge/software-engineering (Accessed: 15 September 2026).

Martin, R.C. (2002) *Agile software development: principles, patterns, and practices*. Upper Saddle River, NJ: Prentice Hall.

MDN (2025) *HTTP request methods*. Mozilla Developer Network. Available at: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods (Accessed: 15 September 2026).

MDN (2026a) *HTTP: Hypertext Transfer Protocol*. Mozilla Developer Network. Available at: https://developer.mozilla.org/en-US/docs/Web/HTTP (Accessed: 15 September 2026).

MDN (2026b) *HTTP response status codes*. Mozilla Developer Network. Available at: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status (Accessed: 15 September 2026).

Metcalf, J., Hallenbeck, P. and Gonthier, S. (2025) 'Configuration management', in *Guide to the Systems Engineering Body of Knowledge (SEBoK)*. Available at: https://sebokwiki.org/wiki/Configuration_Management (Accessed: 15 September 2026).

Meyer, B. (1997) *Object-oriented software construction*. 2nd edn. Upper Saddle River, NJ: Prentice Hall.

Microsoft (2025) *Web API design best practices*. Azure Architecture Center. Available at: https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design (Accessed: 15 September 2026).

Microsoft (2026) *Asynchronous messaging options*. Azure Architecture Center. Available at: https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/messaging (Accessed: 15 September 2026).

OWASP (2022) *CICD-SEC-6: Insufficient credential hygiene*. OWASP Top 10 CI/CD Security Risks. Available at: https://github.com/OWASP/www-project-top-10-ci-cd-security-risks/blob/main/CICD-SEC-06-Insufficient-Credential-Hygiene.md (Accessed: 15 September 2026).

OWASP (2025) *OWASP Top 10:2025 - Introduction*. Open Worldwide Application Security Project. Available at: https://owasp.org/Top10/2025/0x00_2025-Introduction/ (Accessed: 15 September 2026).

OWASP (no date a) *Authorization cheat sheet*. OWASP Cheat Sheet Series. Available at: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html (Accessed: 15 September 2026).

OWASP (no date b) *CI/CD security cheat sheet*. OWASP Cheat Sheet Series. Available at: https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html (Accessed: 15 September 2026).

Pandoc (no date) *Pandoc user's guide*. Available at: https://pandoc.org/MANUAL.html (Accessed: 15 September 2026).

Parnas, D.L. (1972) 'On the criteria to be used in decomposing systems into modules', *Communications of the ACM*, 15(12), pp. 1053–1058.

PostgreSQL Global Development Group (2026a) *Constraints*. PostgreSQL Documentation. Available at: https://www.postgresql.org/docs/18/ddl-constraints.html (Accessed: 15 September 2026).

PostgreSQL Global Development Group (2026b) *Sequence Manipulation Functions*. PostgreSQL Documentation. Available at: https://www.postgresql.org/docs/18/functions-sequence.html (Accessed: 15 September 2026).

Stevens, W.P., Myers, G.J. and Constantine, L.L. (1974) 'Structured design', *IBM Systems Journal*, 13(2), pp. 115–139.

Yang, Z., Gao, C., Guo, Z., Li, Z., Liu, K., Xia, X. and Zhou, Y. (2026) 'A roadmap on modern code review: challenges and opportunities', arXiv preprint arXiv:2405.18216v2. Available at: https://arxiv.org/abs/2405.18216v2 (Accessed: 15 September 2026).

## AI assistance note for the team register

Taken from section 8 of the A2 submission.

| Date | Student | Tool | Engineering task | AI contribution | Verification | Decision | Issues found |
|---|---|---|---|---|---|---|---|
| 15 Sept 2026 | Jean Smit | Claude (Anthropic), Claude Code | A2 Task 1: design problems and pattern comparison | Drafted the problem framing from the requirements register, the comparison of candidate approaches, and the recommendations | Citations reconciled against the reference list in both directions; web sources fetched and checked against the claims attributed to them; claims cited to Martin, Meyer, Evans and Fowler checked against the authors' own published articles and catalogue pages; book and journal details checked against publisher and Crossref records; Parnas (1972) checked against the published paper; Gamma et al. (1994) checked for publication details only, because no copy of the text was available | Accepted after revision | An attribution to the OWASP Authorization Cheat Sheet was corrected before inclusion. The sheet recommends centralising the handling of failed checks, which is a different claim from centralising the authorisation decision. Book years were cited under two different rules; they were standardised to the publication date, which changed Martin from 2003 to 2002. The paraphrase of Parnas (1972) went beyond the paper and was tightened to match its wording. |
| 15 Sept 2026 | Jean Smit | Claude (Anthropic), Claude Code | A2 Task 4, sections 4.1 and 4.3: configuration management and collaborative integration | Drafted the configuration management research, gathered repository evidence, compared controls for binary artefacts, and drafted the recommendations | Repository statistics measured directly from GitHub and git; web sources fetched and checked against the claims attributed to them; citations reconciled in both directions; Bacchelli and Bird (2013) checked against the paper; cited Master Project Brief sections read directly | Accepted after revision | A paraphrase of Bacchelli and Bird (2013) overstated the paper and was corrected to match its abstract. A claim that PED s12.4 governs format changes was corrected, because s12.4 covers only scope, requirements and the status model. |
| 15 Sept 2026 | Jean Smit | Claude (Anthropic), Claude Code | A2 Task 5 research-to-decision map and report assembly | Drafted the Task 5 rows from each section's findings, merged the sections into one report, consolidated the references and built the Word document | Each map row checked against the section it summarises; every decision and requirement identifier checked against the M1 registers workbook; the merged report's citations reconciled against the consolidated reference list in both directions; the built document rendered to PDF and checked page by page | Accepted after revision | Two OWASP cheat sheets in different sections were both cited as undated OWASP sources with no letter to tell them apart, and the Master Project Brief was lettered 2026a with no 2026b; both were corrected when the reference lists were merged. |
