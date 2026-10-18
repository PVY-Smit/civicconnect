**SOFTWARE ENGINEERING 381 \| SEN381**

**CivicConnect**

Project Engineering Document (PED) v4.0

*Finalise, Consolidate and Conclude*

| **Project** | CivicConnect - Community Service Request Management Platform |
|----|----|
| **Milestone** | Milestone 4 - Finalise, Consolidate and Conclude (Final Project) |
| **Document** | PED v4.0 Final, continued from PED v3.0, v2.0 and v1.0. PED v1.0 is kept unchanged in the repository as the M1 record. This document evolves through v4.0; it is not recreated per milestone (Master Brief, s6). |
| **Team** | Jean Smit - 600368 \| Tristan Roets - 601764 \| Darius Mushi - 577982 |
| **Baseline status** | v4.0 FINAL, the concluding version (#128); its submission information is in s37. v3.0 was submitted for M3 on 16 October 2026 (#127), with its information in s27. v2.0 is the team's M2 baseline, merged on 9 October 2026 (#95). The M1 and M2 gate decisions are the assessor's, and the team's sign-off of v1.0 and v2.0 is recorded in s16 and s26.3. |
| **Controlled artefacts** | This document, plus the registers workbook (Requirements, RTM, Risk, Decision Log, Forward Considerations, AI Usage, Change Requests, Status Model, Access Matrix, Working Agreement, Governance, Sign-off). |
| **Repository** | https://github.com/PVY-Smit/civicconnect |
| **Referencing** | Harvard, applied in-text and in the reference list (s17). |

> **Central engineering question this document answers**
>
> What exactly are we committing to engineer, for whom, within what constraints, and what must we consider now to avoid unnecessarily constraining the project later?

> **Milestone boundary**
>
> M1 establishes a controlled foundation. It is deliberately **not** an architecture, technology-selection or implementation milestone (M1 brief, s5). No technology stack, architecture style, database schema, API, user-interface design, design pattern or CI pipeline is decided in this document.
>
> Four such decisions are recorded in the Engineering Decision Log as **deliberately deferred**, each with the evidence still required before it can responsibly be taken (s13.2). Recording a future constraint is not the same as deciding it.

> **Milestone 2 boundary**
>
> M2 takes the architecture, technology and initial design decisions M1 deferred, and records them in s18 to s26 with their ADRs. It decides what the application is built from and how its core rules are enforced. It does not select the quality, security, deployment and operational controls that Milestone 3 decides, informed by Assignment 3.

> **Milestone 4 boundary**
>
> The Final Project closes the same project; it is not a new development phase (Final brief, s1). Sections 1 to 36 are kept as written. Sections 37 to 42 record the final product and release, the M1 scope against what was delivered, the closure of M3's issues, the final acceptance evidence, the deployment decision and the project's conclusion.

# 1. Document Control and Version History

This document is a controlled artefact. Baselined content is not silently overwritten: changes after sign-off enter through the change control process in s12.4 and are recorded here (Master Brief, s6.1).

| **Version** | **Date** | **Author(s)** | **Summary of change** | **Reviewed by** | **Status** |
|----|----|----|----|----|----|
| 0.1 | 3 September 2026 | Jean Smit | Full initial draft: problem and business need, stakeholders, scope baseline, constraints, functional and non-functional requirements with acceptance criteria, RTM, Risk Register, Forward Engineering Considerations, Decision Log and governance. AI-assisted; recorded in s14.2. | Not reviewed. Direct commit, predating the branch controls established on 4 September 2026. | Superseded |
| 0.2 | 8 September 2026 | Jean Smit, Darius Mushi | Evidence completion: AI Usage Register entries, the GitHub Governance evidence column, forward-consideration to decision links, and correction of the page layout so that no table or figure is truncated. | Reviewed through Pull Request by Darius Mushi and Tristan Roets, against issues \#5, \#6, \#10, \#17, \#20 and \#21. | Superseded |
| 1.0 | 9 September 2026 | Jean Smit, Darius Mushi | Submitted to the M1 engineering gate. The gate has not yet been held: the outcome, the readiness fields and the three approvals are recorded in s16 and are still incomplete. | Reviewed through Pull Request by Darius Mushi and Tristan Roets. Gate review pending. | Proposed baseline, not yet accepted |
| 2.0 | Signed off by the team 30 September 2026; revised after review 5 to 7 October 2026 | Jean Smit, Darius Mushi, Tristan Roets | Milestone 2. Source moved from Word to markdown, with the Word document generated from it (CR-001, #55). Sections 18 to 26 added for the architecture, technology and initial design baseline, after the reference list so that no M1 section number changes. Changes to M1 sections, each under change control (s12.4): the reading note in s8.3 on the four Access Matrix cells (CR-002, #92); the reading note in s9 on the RTM's M2 columns (CR-003); and, under CR-005 (proposed on #95 and recorded in the Change Requests sheet once the team agrees), the cover updated for v2.0, the Milestone 2 boundary note under the M1 one, the paragraph in s2 on how the M1 and M2 sections relate, the reading notes in s10, s13 and s14.2 that point to the live registers, four references added to s17 for s20, s24 and s26.2, the removal of the M1 template instruction under this table, and the team's M1 sign-off recorded in s16 as its recommendation (#69). The assessor's M1 gate decision is still pending, so the v1.0 row above stands. No other M1 content is changed: `tools/ped_fidelity.py --m1-only` lists every difference from v1.0 in sections 1 to 17. | Through the Pull Requests listed in s25 and s26 | Proposed for baseline: signed off by the team on #69, baselined when #95 merges (s26.3) |
| 3.0 | 16 October 2026 | Jean Smit, Darius Mushi, Tristan Roets | Milestone 3. Sections 27 to 36 added for construction, verification and release readiness, with the M3 submission information in s27 (#127). The cover names v3.0 and Milestone 3 (CR-005, item 1, as widened on #95). In sections 1 to 26, the four s8.3 cells CR-002 corrects now read No, with the reading note updated, and s22.2 and s26.2 gain dated notes that CR-002 is implemented (#136); they are otherwise unchanged. | Darius Mushi and Tristan Roets, through Pull Request #145 | Submitted for M3 on 16 October 2026 |
| 4.0 | [To be completed under #128: the date of the tag] | Jean Smit, Darius Mushi, Tristan Roets | Final Project. Sections 37 to 42 added: the final product and release, the M1 scope against the final delivery with the Scope Completion Percentage, the closure of M3's issues, the final acceptance evidence, the go-live decision and the project reflection (#128). The cover names v4.0 and Milestone 4 (CR-005, item 1). Sections 1 to 36 are unchanged. | [To be completed under #128: the pull request and its reviewers] | Final |

# 2. Purpose and How to Read This Document

PED v1.0 records what CivicConnect is committing to engineer, for whom, under which constraints, and what has deliberately been left open. It is the reference against which every later milestone measures change.

**From v2.0.** Sections 1 to 17 are the M1 baseline and keep their numbers, because the registers and the repository cite them. Milestone 2 is recorded in sections 18 to 26, placed after the reference list for that reason, and s17 holds the references for the whole document. Where M2 changes an M1 section, the change is recorded in the version history in s1 rather than made silently.

| **Convention** | **What it means** |
|----|----|
| Identifiers | STK stakeholder, SC scope item, FR functional requirement, NFR non-functional requirement, CON constraint, RSK risk, FEC forward engineering consideration, DEC decision, TR traceability row, CR change request. Identifiers are stable after baseline and are never renumbered, because the traceability matrix and every register reference them. |
| Researched fact against team judgement | A claim supported by a standard, a regulation or the project brief carries a Harvard citation. A claim that is the team's own engineering judgement is labelled as such. The two are never presented as the same kind of evidence (M1 brief, s9.1). |
| Live registers | The full requirements set, RTM, risk register, decision log, forward considerations, AI usage register and change register are maintained in the accompanying workbook and in the repository. This document reproduces them and, where a register is long, presents an extract and names where the live version lives. |
| Square brackets | Any value in \[square brackets\] is a placeholder that the team must complete before submission. |

# 3. Problem Statement and Business Need

The organisation currently manages service requests across email, telephone calls, WhatsApp messages, spreadsheets and paper records. The Master Brief describes the resulting failures directly: requests are duplicated, overlooked, misassigned or lost between channels; requesters cannot tell whether a request was received, assigned, delayed or resolved; staff struggle to prioritise and to establish ownership; accountability for status changes is weak; management lacks reliable information about outstanding and overdue work; reporting is manual and difficult to audit; and sensitive information is handled inconsistently across informal channels (Belgium Campus ITversity, 2026a).

**Team interpretation of the underlying engineering problem.** These are not seven separate problems. They are seven symptoms of one absence: there is no single controlled record of the lifecycle of a service request. Every symptom follows from that. Duplication happens because no channel can see what another has already accepted. Requesters chase by telephone because no authoritative status exists to consult. Accountability is weak because a status change leaves no durable trace. Reporting is manual because there is nothing to query.

That framing has a direct engineering consequence, and it is why the scope baseline in s6 looks as it does. If the defining property of the solution is a single controlled record, then adding an uncontrolled intake channel does not extend the platform, it reintroduces the original problem. This is the reasoning behind the exclusion defended in s6.4.

## 3.1 Business need

The organisation needs a controlled digital platform providing a reliable, traceable and usable way to submit, manage, monitor and report on service requests, without creating an unsustainable technical, operational or financial burden (Belgium Campus ITversity, 2026a). The final clause is a constraint, not an aspiration, and it is carried into CON-03 and NFR-013.

# 4. Definition of Success for CivicConnect

**Team judgement, derived from Master Brief s5.** Success is not that the system runs. The measures below are stated now so that M4 can be evaluated against something agreed in advance rather than against whatever was achieved.

| **Dimension** | **What success means for CivicConnect** | **How it will be evidenced** |
|----|----|----|
| Stakeholder value | A requester can establish the state of their request without contacting anyone, and a coordinator can establish ownership of every open request. | Acceptance of FR-009 to FR-012 and FR-013 to FR-015; stakeholder validation in M4. |
| Single controlled record | Every service request has exactly one authoritative record and one auditable history. | FR-025, FR-026 and the audit reconciliation in NFR-011. |
| Scope | What was delivered matches what was baselined here, or differs only through recorded, approved change. | This baseline, the change register and the M4 delivered-against-approved comparison. |
| Quality and security | The measurable targets in s8.3 are met, or the shortfall is stated with its residual risk rather than concealed. | Test and measurement evidence in M3 and M4 against each NFR target. |
| Constraint honesty | The team can explain what it did not build and why, in constraint terms rather than as an apology. | Sections 6.2, 6.3, 6.4 and the deferred decisions in s13.2. |

# 5. Stakeholder Analysis

Stakeholders are recorded with their needs, their influence and interest, and, where they exist, the conflicts between them. The final column matters most: a stakeholder analysis that records no conflict has not been done, because competing expectations are the reason requirements engineering is necessary at all.

| **ID** | **Stakeholder** | **Role and interest** | **Needs** | **Infl.** | **Int.** | **Conflicts and how this baseline resolves them** |
|----|----|----|----|----|----|----|
| STK-01 | Requester (community member or staff submitting a request) | Raises service requests and needs to know what happened to them | Simple submission; confirmation that the request was received; visible status without chasing anyone; a record of past requests | Low | High | Wants full visibility of who is working on the request and what they have written. Conflicts with STK-02, who needs candid internal working notes. Resolved by DEC-003. |
| STK-02 | Service staff / technician | Carries out the work and records what was done | A queue of only relevant work; enough detail to act without phoning back; ability to record honest internal notes; not to be interrupted across five channels | Medium | High | Wants broad visibility of all requests for context. Conflicts with the least-privilege security constraint. Resolved by scoping the queue to authorised categories (FR-013) rather than granting global read. |
| STK-03 | Service coordinator / supervisor | Assigns work, sets priority and keeps the queue moving | Reliable prioritisation; clear ownership of every request; ability to reassign; visibility of ageing and overdue work | High | High | Needs to own priority. Conflicts with STK-01, who wants to declare their own request urgent. Resolved by DEC-002: requester urgency is an input, coordinator sets priority. |
| STK-04 | Management / oversight | Accountable for service performance and reporting | Trustworthy counts of open, overdue, resolved and closed work; breakdown by category; an auditable record of who changed what | High | Medium | Wants rich analytics and export. Conflicts with the schedule and cost constraints. Resolved by baselining a minimal reporting set (FR-022 to FR-024) and deferring the analytics dashboard. |
| STK-05 | System administrator (role held by STK-04 in this baseline) | Maintains users, roles and the controlled category list | Add and deactivate users; maintain categories without breaking historical records | Medium | Medium | Deleting a category would orphan historical requests. Resolved by FR-027: categories are deactivated, never deleted. |
| STK-06 | Organisation / project sponsor | Funds and owns the platform; accountable for the business outcome | Improved visibility and accountability without an unsustainable technical, operational or financial burden (Master Brief, s2.1) | High | Medium | Cost ceiling constrains the availability target. See CON-03 and the trade-off analysis in s7.1. |
| STK-07 | Information officer / data subject interest | Personal information in requests is processed lawfully | Minimal personal information collected; access restricted to those who need it; a defined retention position | Medium | Low | Privacy minimisation conflicts with STK-04's appetite for detailed reporting. Resolved by aggregate reporting (FR-022) rather than personal-level performance data in the baseline. |
| STK-08 | SEN381 lecturer / assessor (acting client and approving authority) | Approves the baseline and issues controlled change | Controlled, traceable and defensible engineering evidence; a formal change request will be issued in M3 (Master Brief, s20.3) | High | High | The known M3 change request is treated as a planned event, not a surprise. See RSK-03. |
| STK-09 | Development team (three registered students) | Engineers, operates and defends the system | Achievable scope within the delivery period; a stack the team can actually learn and support; time for review and verification | High | High | Capability is a resource constraint that limits buildable scope. See CON-06 and RSK-01. |

## 5.1 The conflict that shaped this baseline most

**Team judgement.** The hardest expectation to reconcile was STK-01 against STK-02. A requester who has been ignored across five channels wants total visibility, including who is working on the request and what they have written about it. A staff member needs to record candid working notes - that a site was inaccessible, that a previous repair was done badly, that a requester was abusive - and will simply stop recording them if they are published.

Both needs are legitimate and neither can be dismissed. Resolving it by satisfying either side fully damages the record the platform exists to create: full publication produces an empty action log, and full concealment returns the requester to the telephone. The baseline therefore splits the artefact rather than choosing a side: every action entry carries an explicit visibility marking, chosen at the time of writing, with no default (FR-017), and the requester view returns only entries marked requester-visible (FR-011). The cost is one deliberate decision per entry, and the risk is that a mis-marked entry is a disclosure, which is why FR-017 forbids a silent default and why this is recorded as DEC-003.

# 6. Scope Baseline

Scope is baselined at PED v1.0. An item moves between the three lists below only through a recorded change request with impact analysis (Master Brief, s14).

## 6.1 In scope

| **ID** | **Committed capability** | **Requirements** |
|----|----|----|
| SC-I-01 | Authenticated access with four roles: Requester, Staff, Coordinator, Manager | FR-001 to FR-004 |
| SC-I-02 | Service request submission with a controlled category, description, location and reported urgency | FR-005 to FR-009 |
| SC-I-03 | A unique, human-readable request reference issued at submission | FR-008 |
| SC-I-04 | Requester visibility of their own requests, current status and status history | FR-010 to FR-012 |
| SC-I-05 | Staff work queue with search, filter and sort | FR-013, FR-014 |
| SC-I-06 | Assignment and acceptance of ownership | FR-015 |
| SC-I-07 | Controlled status transitions across a single agreed status model | FR-016, FR-018 to FR-020 |
| SC-I-08 | Action and comment log separated into internal and requester-visible entries | FR-017 |
| SC-I-09 | Coordinator-owned prioritisation | FR-021 |
| SC-I-10 | Management view of open, overdue, resolved and closed counts, by category and status | FR-022 to FR-024 |
| SC-I-11 | Append-only audit trail of status, assignment and priority changes | FR-025, FR-026 |
| SC-I-12 | Maintenance of the controlled category list and user deactivation | FR-027, FR-028 |
| SC-I-13 | In-application notification of acceptance, update, rejection and completion | FR-009, FR-029 |

## 6.2 Out of scope

These are not deferred. They are not intended for delivery in this project.

| **ID** | **Excluded** | **Why** |
|----|----|----|
| SC-O-01 | Migration of historical requests from email, spreadsheets, WhatsApp or paper records | No controlled source data exists to migrate, and the quality of the informal records is unknown. Migrating unverified records would corrupt the reporting the platform exists to provide. |
| SC-O-02 | Integration with the existing telephone, email or WhatsApp channels | See the defended exclusion in s6.4. Re-admitting uncontrolled channels would recreate the fragmentation identified in the Master Brief s2. |
| SC-O-03 | Native mobile applications | A responsive web interface meets the stated requester need. A native application multiplies build, test, store-release and maintenance obligations across two additional platforms. |
| SC-O-04 | Cost, procurement, work-order or contractor payment handling | Outside the stated business need. Introduces financial data and a materially higher security and audit obligation. |
| SC-O-05 | Anonymous public submission without an account | Conflicts with FR-012 record isolation and with the accountability the platform exists to establish; also removes the ability to give the requester status visibility. |
| SC-O-06 | External vendor SLA and contract management | No stakeholder in the analysis owns this need. |

## 6.3 Deferred and future scope

Deferred items may enter a later milestone through change control if their reconsideration trigger is met. They are recorded now because several of them constrain decisions that will be taken in M2 even while they remain unbuilt.

| **ID** | **Deferred** | **Why deferred** | **Reconsider when** |
|----|----|----|----|
| SC-D-01 | Email or SMS notification channel | Requires an always-on background worker or scheduled job. Whether that is available within the cost constraint is unknown until the deployment platform is decided in M2. See FEC-03. | M2 platform decision confirms background-process support within free or low-cost limits |
| SC-D-02 | File attachments on requests (for example a photograph of a fault) | See the defended exclusion in s6.4. | Storage cost, content-type validation, malware scanning and a retention position are all specified and affordable |
| SC-D-03 | Configurable per-category service targets and automated escalation | The baseline uses a single organisation-wide response target so that 'overdue' has one unambiguous definition (FEC-02). Per-category targets multiply the reporting and test surface. | The organisation confirms differentiated targets are actually required and supplies the values |
| SC-D-04 | Analytics dashboard with trend charts and data export | Management need is met in the baseline by counts and breakdowns. Charting and export add build and verification cost that the schedule cannot absorb in M1 to M3. | Baseline reporting is delivered and stakeholder feedback confirms the gap |
| SC-D-05 | Multi-site or multi-organisation separation | Not required by the stated scenario, but it is a data-model property that cannot be added cheaply later. Recorded now so the M2 data design keeps the option open. See FEC-01. | The organisation confirms more than one site or tenant is in view |
| SC-D-06 | Bulk import of historical requests | Depends on SC-O-01 being reconsidered and on a source of acceptable quality being identified. | A controlled, quality-assessed source dataset is provided |

## 6.4 Defended exclusions

The milestone brief (Belgium Campus ITversity, 2026b) requires the team to defend at least one deliberate exclusion or deferment. Two are defended here, because they were the two hardest to give up and are the two most likely to be questioned.

### 6.4.1 File attachments on a request (deferred, SC-D-02)

**The value being given up is real.** A photograph of a broken gate or a leaking pipe conveys more than a paragraph of description, would reduce diagnostic visits by staff, and is the single feature a requester is most likely to expect from a modern platform. The team is not deferring this because it is unimportant.

**The obligations it carries.** Accepting a file from an unauthenticated-in-practice user population means content-type validation that cannot be satisfied by checking the file extension, malware scanning, a storage location with an access model of its own, a size limit with an enforcement point, and a retention position. It also means personal information inside images, which the team cannot minimise by field design because it has no control over what a photograph contains: a picture of a damaged door may include a face, a vehicle registration or an address. That engages POPIA s19 obligations directly (Republic of South Africa, 2013), and it engages them on data the team cannot inspect in advance.

**The constraint that decides it.** CON-02 and CON-03 together. Storage beyond a free-tier allowance has a cost the sponsor has not agreed, and the security work above is not achievable to a defensible standard within the delivery period alongside the committed scope. A half-controlled attachment feature is materially worse than none: it creates an exposure the team would then have to defend in M4 rather than a gap it can explain now.

**What makes the deferral safe rather than lazy.** The deferral is only sound if it stays reversible, which is why FEC-01 and DEC-006 both record that the M2 data design must leave room for an attachment relationship without a later migration. The reconsideration trigger is explicit: storage cost, content-type validation, malware scanning and a retention position all specified and affordable.

### 6.4.2 Integration with the existing email, telephone and WhatsApp channels (excluded, SC-O-02)

**Why it is tempting.** Requesters already use those channels. Integrating them would remove the adoption barrier entirely, and a stakeholder would reasonably ask why the platform does not simply absorb the traffic it is replacing.

**Why it is excluded rather than deferred.** This is the exclusion that follows directly from the problem framing in s3. The failure being solved is the absence of a single controlled record; the fragmentation across channels is the cause, not an inconvenient detail of it. An integration that accepts requests from WhatsApp reintroduces an intake path with no authentication, no controlled category, no mandatory fields and no audit identity - which means it reintroduces exactly the duplication, loss and weak accountability the platform exists to remove. The integration would not extend the solution; it would restore the problem inside it.

**Team judgement on the honest limitation.** This is a real cost, and it should be stated plainly rather than argued away: requesters must change how they raise requests, and adoption is therefore a business change problem the platform alone does not solve. The team's position is that this cost is worth paying because the alternative defeats the purpose of the system, but it is a trade-off, not a free choice, and it is one the sponsor should be told about explicitly.

# 7. Constraints and Their Engineering Implications

| **ID** | **Type** | **Constraint** | **Engineering implication** |
|----|----|----|----|
| CON-01 | Scope | The minimum business capabilities in Master Brief s3 are non-negotiable. Committed scope is baselined at PED v1.0 and may change only through the change control in Master Brief s14. | Fixes the floor of the requirement set. Any addition must be paid for from schedule, and the team has no schedule reserve, so additions displace other committed work rather than extending the deadline. |
| CON-02 | Schedule | Four assessed milestones within the SEN381 delivery period. The team works on CivicConnect alongside other modules, so available engineering time is bounded and uneven across the term. | The binding constraint on scope. It is the reason SC-D-01 to SC-D-06 are deferred rather than attempted, and the reason quality gates are defined now: under schedule pressure, testing and security are the first things silently dropped (Master Brief, s18). |
| CON-03 | Cost and resources | Free or low-cost services are preferred. Limitations and likely operational cost beyond the educational context must be identified (Master Brief, s4). Three students; no budget for paid tiers or paid tooling. | Directly limits the availability target in NFR-003 and the feasibility of SC-D-01. See the worked trade-off in s7.1. |
| CON-04 | Quality | Quality attributes must be measurable and supported by evidence, not asserted (Master Brief, s4 and s15). | Every NFR in s6.3 carries a stated measurement method. An attribute the team cannot measure within the constraints was either made measurable or removed. |
| CON-05 | Security | Security is a lifecycle-wide responsibility (Master Brief, s16). The system holds personal information, which engages POPIA s19 (Republic of South Africa, 2013). | Constrains the data model (FEC-01), test data (FEC-04) and the deferral of attachments (s6.4). Security requirements appear in the baseline as NFR-004 to NFR-008, not as a later hardening task. |
| CON-06 | Team capability | Three students with prior exposure to programming, databases and web development, and limited exposure to controlled team engineering at this scale. Capability is stated honestly here because it is a real input to the M2 technology decision (Master Brief, s18.1). | Bounds which architectures and stacks are realistically buildable and supportable. An unfamiliar stack converts schedule into learning time. See RSK-01. |
| CON-07 | Platform availability | Belgium Campus cannot guarantee that a chosen language, framework, service or deployment platform is installed, available or supported on the BC Desktop platform (Master Brief, s25). | Makes environment availability a precondition of the M2 technology decision rather than a discovery during construction. Recorded as RSK-02 and as a criterion in DEC-008. |
| CON-08 | Process and governance | Protected main, Pull Requests for substantive change and a minimum of two approvals from members other than the author (Master Brief, s9). | With three members this means every merge needs both other members. It is a quality control and a throughput constraint at the same time. See RSK-04 and FEC-07. |

## 7.1 Worked constraint interaction: cost, availability and a deferred feature

The milestone brief requires at least one constraint interaction or ripple effect to be explained rather than listed. The following chain is the one that most shapes this baseline.

| **Step** | **What happens** |
|----|----|
| 1\. The cost constraint bites first | CON-03 directs the team to free or low-cost services. That is a project constraint, not a technical preference, and the team has no budget to override it. |
| 2\. It propagates into a quality target | Free hosting tiers commonly idle or suspend inactive instances and publish no uptime guarantee. An unqualified availability target would therefore be a claim the team could not evidence, and unsupported claims are explicitly not accepted (Master Brief, s23). NFR-003 is consequently scoped to 98 per cent within published service hours rather than stated as continuous availability, and it is measured by an external probe against a health endpoint so that the figure is observable rather than asserted. |
| 3\. It propagates again into scope | The same free-tier limits typically restrict always-on workers and scheduled jobs. An email or SMS notification channel needs exactly that. The team cannot responsibly commit to a notification channel before knowing whether the platform can host one, so SC-D-01 is deferred rather than promised, and DEC-005 records the reasoning. |
| 4\. It changes a later decision criterion | Because the deferral depends on a platform capability, background-process support becomes a required criterion in the M2 platform decision rather than a detail discovered during construction. This is recorded as FEC-03 and written into DEC-010. |
| 5\. It leaves a residual risk that is owned, not hidden | If no affordable platform supports both the availability target and a background worker, the deferral becomes a permanent exclusion and NFR-003 must be revised through change control. That outcome is recorded as RSK-02 with a named owner and a contingency, so it is a managed risk rather than a surprise. |

> **What this chain demonstrates**
>
> One financial constraint, applied honestly, changed a quality target, removed a feature from committed scope, added a criterion to a decision that will not be taken for another milestone, and generated a risk with an owner. None of those five effects is visible if constraints are recorded as a list. This is the reasoning the team is prepared to defend when asked how a constraint influenced the baseline.

# 8. Requirements and Acceptance Criteria

**Approach.** Requirements are written to be individually verifiable, unambiguous and singular, following the characteristics of a well-formed requirement in ISO/IEC/IEEE 29148:2018 (ISO/IEC/IEEE, 2018). Each carries a unique identifier, a stakeholder source, a MoSCoW priority and acceptance criteria expressed so that a tester can determine pass or fail without asking the author what was meant. Priorities are recorded because RSK-03 designates the Should and Could set as the absorption buffer for the change request expected in M3.

**Note on the acceptance criteria.** Several criteria specify that a refusal must hold when the request is issued directly to the endpoint rather than through the interface. That wording is deliberate: authorisation implemented only in the user interface is not authorisation, and stating it in the criterion is what makes the M3 negative tests derivable from this document (NFR-005).

## 8.1 Functional requirements

| **ID** | **Requirement** | **Source** | **Priority** | **Acceptance criteria** | **Status** |
|----|----|----|----|----|----|
| FR-001 | The system shall require a registered user to authenticate with a unique identifier and secret before any service request data is returned. | STK-06, STK-07 | Must | GIVEN an unauthenticated visitor WHEN any protected page or endpoint is requested THEN no request data is returned and the visitor is redirected to sign-in. GIVEN valid credentials WHEN submitted THEN an authenticated session is established. GIVEN invalid credentials WHEN submitted THEN a single generic failure message is shown that does not reveal whether the identifier exists. | Baselined |
| FR-002 | The system shall enforce role-based access control for the roles Requester, Staff, Coordinator and Manager, with every permission decision made server-side. | STK-03, STK-06 | Must | For every role and function pair in the access matrix (s8.4), a user holding the role can invoke the permitted functions and receives an authorisation failure for every function not permitted to that role, including when the request is issued directly to the endpoint rather than through the interface. | Baselined |
| FR-003 | The system shall allow a Manager to create a user account and assign exactly one role to it. | STK-05 | Must | GIVEN a Manager WHEN a new account is created with a role THEN the account can authenticate and holds only that role's permissions. A non-Manager attempting account creation is refused. | Baselined |
| FR-004 | The system shall allow a user to reset a forgotten credential through a controlled process that does not disclose whether an account exists. | STK-01 | Should | GIVEN a reset request for any identifier WHEN submitted THEN the same confirmation message is shown whether or not the account exists. A reset link is single-use and expires within a defined period. | Baselined |
| FR-005 | The system shall allow a Requester to submit a service request capturing title, description, category, location and reported urgency. | STK-01 | Must | GIVEN a Requester with all mandatory fields completed WHEN the request is submitted THEN the request is persisted with status New and is visible in the Requester's own list. Every field captured is displayed unchanged on the request detail view. | Baselined |
| FR-006 | The system shall require the request category to be selected from a controlled list maintained by a Manager, and shall not accept a free-text category. | STK-04, STK-05 | Must | The category input offers only active categories from the controlled list. A submission carrying a category value that is not an active list entry is rejected with a validation error, including when submitted directly to the endpoint. | Baselined |
| FR-007 | The system shall validate mandatory fields and field formats before accepting a submission, and shall report each failure in a message that identifies the field and the correction needed. | STK-01 | Must | GIVEN a submission with a missing or invalid mandatory field WHEN submitted THEN the request is not persisted, each failing field is identified, and previously entered values are retained in the form. | Baselined |
| FR-008 | The system shall assign every accepted request a unique, human-readable reference that is never reused. | STK-01, STK-03 | Must | Each accepted submission receives a reference matching the agreed format. Two requests never share a reference. A reference is not reissued after a request is deleted or archived. The reference is displayed on submission and on every subsequent view of that request. | Baselined |
| FR-009 | The system shall present the Requester with an in-application acknowledgement on successful submission, showing the reference and the date and time recorded. | STK-01 | Must | GIVEN a successful submission WHEN the acknowledgement is displayed THEN it contains the reference and the recorded timestamp, and the same values appear on the request detail view. | Baselined |
| FR-010 | The system shall allow a Requester to view a list of their own requests showing reference, title, category, current status, submission date and date of last update. | STK-01 | Must | GIVEN a Requester with at least one request WHEN the list is opened THEN every request they submitted appears exactly once with all six fields populated, and no request submitted by another user appears. | Baselined |
| FR-011 | The system shall allow a Requester to view the full detail and status history of their own request, showing only entries marked requester-visible. | STK-01, STK-02 | Must | The detail view shows the request fields, the ordered status history with timestamps, and only those action entries marked requester-visible. No entry marked internal appears in the response payload, not only in the rendered page. | Baselined |
| FR-012 | The system shall prevent a Requester from retrieving any request they did not submit. | STK-01, STK-07 | Must | GIVEN Requester A and a request belonging to Requester B WHEN A requests that record by reference or identifier, through the interface or directly THEN access is refused and no field of the record is disclosed, including through an error message. | Baselined |
| FR-013 | The system shall present Staff and Coordinators with a work queue of requests within their authorised category scope. | STK-02, STK-03 | Must | GIVEN a Staff member authorised for a set of categories WHEN the queue is opened THEN every open request in those categories appears and no request outside them appears. A Coordinator sees all categories. | Baselined |
| FR-014 | The system shall allow the queue to be searched by reference and by keyword, filtered by status, category, assignee and date range, and sorted by submission date, last update and priority. | STK-02, STK-03 | Must | Each named search, filter and sort returns only records satisfying the stated condition, filters combine, and an empty result set is reported as such rather than as an error. | Baselined |
| FR-015 | The system shall allow a Coordinator to assign a request to a Staff member, and a Staff member to accept an unassigned request within their authorised categories. | STK-03 | Must | GIVEN a Coordinator WHEN a request is assigned THEN the assignee is recorded and the request appears in that assignee's queue. GIVEN a Staff member and an unassigned request in their scope WHEN accepted THEN they become the assignee. A Staff member cannot assign a request to another user. | Baselined |
| FR-016 | The system shall permit a status change only where the transition is allowed by the request status model (PED Figure 2) and only by a role authorised for that transition. | STK-03, STK-04 | Must | For every ordered pair of statuses, a transition allowed by the model succeeds for an authorised role and every transition not in the model is refused, including when issued directly to the endpoint. A refused transition leaves the stored status unchanged. | Baselined |
| FR-017 | The system shall allow Staff and Coordinators to record a dated action entry against a request, marked either internal or requester-visible at the time of entry. | STK-02 | Must | An entry is stored with author, timestamp and visibility. Visibility must be chosen explicitly; there is no default that silently exposes an internal note. FR-011 governs what the Requester then sees. | Baselined |
| FR-018 | The system shall require a resolution summary before a request may move to Resolved. | STK-03, STK-04 | Must | An attempt to move a request to Resolved without a non-empty resolution summary is refused with a validation message. On success the summary is stored and is requester-visible. | Baselined |
| FR-019 | The system shall allow only a Coordinator or Manager to move a Resolved request to Closed. | STK-03 | Should | A Coordinator or Manager can close a Resolved request. A Staff member or Requester attempting the same transition is refused. Closing is recorded in the audit trail. | Baselined |
| FR-020 | The system shall allow a Coordinator to reject a request with a mandatory reason that is shown to the Requester. | STK-03, STK-01 | Should | Rejection without a reason is refused. On rejection the status becomes Rejected, the reason is stored and appears on the Requester's detail view, and the event is audited. | Baselined |
| FR-021 | The system shall record the Requester's reported urgency as a separate attribute from the priority, and shall allow only a Coordinator to set or change the priority. | STK-01, STK-03 | Must | Reported urgency is captured at submission and is not editable by Staff or Coordinators. Priority is absent until set by a Coordinator. A Requester or Staff member attempting to change priority is refused. Both values are visible to Coordinators. | Baselined |
| FR-022 | The system shall present a Manager with counts of open, overdue, resolved and closed requests for a selected period. | STK-04 | Must | For a seeded dataset with known values, each of the four counts equals the independently calculated value. Overdue uses the single organisation-wide response target defined in the status model. | Baselined |
| FR-023 | The system shall present the request counts broken down by category and by status. | STK-04 | Should | The breakdown totals reconcile exactly to the totals in FR-022 for the same period and filters. | Baselined |
| FR-024 | The system shall list overdue requests with reference, category, age and current assignee. | STK-03, STK-04 | Should | Every request whose age against the response target exceeds the threshold appears exactly once with all four fields populated; no request within the target appears. | Baselined |
| FR-025 | The system shall record an audit entry for every change of status, assignee and priority, capturing the actor, timestamp, previous value and new value. | STK-04, STK-07 | Must | For each of the three change types, performing the change creates exactly one audit entry containing all four fields, and the previous value matches the value held immediately before the change. | Baselined |
| FR-026 | The system shall not provide any application function that edits or deletes an audit entry. | STK-04, STK-07 | Must | No interface or endpoint accepts an update or delete against an audit entry. Attempted modification through an exposed route is refused. Verified by review of the access matrix and by negative test. | Baselined |
| FR-027 | The system shall allow a Manager to add, rename and deactivate a category, and shall not permit deletion of a category that is referenced by any request. | STK-05 | Should | A deactivated category is unavailable for new submissions and remains displayed correctly on existing requests. An attempt to delete a referenced category is refused with an explanatory message. | Baselined |
| FR-028 | The system shall allow a Manager to deactivate a user account so that it can no longer authenticate, while preserving that user's historical records and audit entries. | STK-05 | Could | A deactivated account cannot authenticate. Requests, action entries and audit entries authored by that account remain visible and correctly attributed. | Baselined |
| FR-029 | The system shall present the Requester with an in-application indication when a request they submitted is accepted, updated, rejected or completed. | STK-01 | Must | Following each of the four events, an indication is available to the Requester on next sign-in that identifies the request by reference and the event that occurred. | Baselined |

## 8.2 Non-functional requirements

Every target below states a number and the method by which it is measured. A quality attribute the team could not measure within its constraints was either made measurable or removed, because an unmeasurable target produces an unsupported claim at M4 (Master Brief, s15).

| **ID** | **Quality characteristic (ISO/IEC 25010:2023; ISO, 2023)** | **Requirement** | **Measurable target** | **How it is measured** | **Source** | **Pri.** |
|----|----|----|----|----|----|----|
| NFR-001 | Performance efficiency | Staff queue retrieval shall remain responsive at the baselined data volume. | 95th percentile response under 2.0 seconds for a queue of 5 000 requests returning the first page | 20 timed retrievals against a seeded 5 000-request dataset on the target environment; record the distribution, not the mean | STK-02 | Must |
| NFR-002 | Performance efficiency | Request submission shall confirm quickly enough that the Requester does not resubmit. | 95th percentile under 3.0 seconds from submit to acknowledgement | 20 timed submissions on the target environment under normal conditions | STK-01 | Must |
| NFR-003 | Reliability | The service shall be available during published service hours. | 98 percent availability measured across published service hours (weekdays 07:00 to 17:00 SAST), assessed monthly | External uptime probe at 5-minute intervals against a health endpoint; monthly report. The target is deliberately scoped to service hours because of CON-03; see the trade-off in s7.1 and RSK-02 | STK-06 | Should |
| NFR-004 | Security | Authentication secrets shall not be recoverable from stored data. | Stored using a current, deliberately slow password hashing function with a per-user salt; no plaintext, reversible or unsalted storage anywhere | Inspection of stored values in a test environment plus code review recorded on the Pull Request; supported by NIST (2022) practice PW.4 | STK-06, STK-07 | Must |
| NFR-005 | Security | Authorisation shall be enforced on the server for every protected function. | Zero successful accesses across the full negative-test matrix of role and function pairs | Automated negative tests derived from the access matrix, executed directly against endpoints rather than through the interface; addresses OWASP A01:2025 (OWASP, 2025) | STK-06 | Must |
| NFR-006 | Security | All traffic between client and service shall be encrypted in transit. | 100 percent of requests served over HTTPS; plain HTTP redirected; no mixed content | Automated check of scheme and redirect behaviour in the deployment verification step | STK-06, STK-07 | Must |
| NFR-007 | Security | No credential, key or token shall be present in the repository or its history. | Zero findings from secret scanning across the full commit history | Automated secret scanning on every Pull Request plus a full-history scan before each baseline; addresses Master Brief s9 | STK-06 | Must |
| NFR-008 | Security | Personal information shall be limited to what the service requires and shall be accessible only to roles that need it. | Only name, contact detail and request content are stored as personal information; every field is justified in the data inventory; access is governed by the FR-002 access matrix | Data inventory reviewed at each baseline against the access matrix; POPIA s19 requires appropriate, reasonable technical and organisational measures (Republic of South Africa, 2013) | STK-07 | Must |
| NFR-009 | Interaction capability | A first-time Requester shall be able to submit a request without training or assistance. | At least 4 of 5 representative first-time users complete a submission unaided within 3 minutes | Moderated task test with 5 participants who have not seen the system; record completion, time and observed errors | STK-01 | Should |
| NFR-010 | Interaction capability | The interface shall be operable without a mouse and legible to users with low vision. | All interactive controls reachable and operable by keyboard with a visible focus indicator; every form control programmatically labelled; body text contrast at least 4.5:1 | Keyboard traversal of each primary flow plus automated contrast and label checks, against the WCAG 2.2 Level AA criteria cited (W3C, 2023) | STK-01 | Should |
| NFR-011 | Functional suitability | Every change to status, assignee or priority shall produce an audit record. | 100 percent of such changes produce exactly one complete audit entry; no orphaned or partial entries | Automated test asserting audit entry creation for each change type, plus a reconciliation query comparing change counts to audit counts | STK-04 | Must |
| NFR-012 | Maintainability | The team shall be able to change the system without silently breaking committed behaviour. | Automated tests covering every Must-priority functional requirement pass on every Pull Request before merge is permitted | Pull Request check status; the requirement-to-test mapping is held in the RTM. Which tooling provides this is an M2 and M3 decision, not an M1 commitment | STK-09 | Must |
| NFR-013 | Flexibility | The service shall operate within the cost ceiling set by CON-03. | Running cost of zero within free-tier limits for the assessed period, with documented limits and the projected cost beyond the educational context | Platform limit documentation captured in the M2 decision record plus a recorded cost review before production release; unsupported claims that a platform is free are not acceptable (Master Brief, s23) | STK-06 | Must |

## 8.3 Role and function access matrix

This matrix is the authoritative statement of FR-002. Every entry marked No is a negative test case in M3, which is how NFR-005 becomes verifiable rather than aspirational.

*Reading note, corrected in v3.0 under CR-002: in v1.0 and v2.0, four cells of this table granted what the requirements refuse. The Manager could assign, reject and set priority, and the Coordinator could accept an unassigned request, where FR-015, FR-020 and FR-021, with the Status Model that FR-016 makes authoritative for transitions, give those moves to other roles. The authorisation policy built in M2 denied all four (s22.2). On 30 September 2026 the team decided to correct the matrix to the requirements (CR-002, #69). The Access Matrix in the registers workbook was corrected for all four cells and the test fixtures are exported from it (#92, #136), and in v3.0 the four cells below read No to match. v1.0 in the repository keeps the table as it was baselined.*

| **Function** | **Requester** | **Staff** | **Coordinator** | **Manager** |
|----|----|----|----|----|
| Submit a request | Yes | Yes | Yes | Yes |
| View own requests | Yes | Yes | Yes | Yes |
| View any request in authorised categories | No | Yes | Yes | Yes |
| View internal action entries | No | Yes | Yes | Yes |
| Assign a request to another user | No | No | Yes | No |
| Accept an unassigned request in scope | No | Yes | No | No |
| Record an action entry | No | Yes | Yes | Yes |
| Change status (model-permitted transitions) | No | Yes | Yes | Yes |
| Move Resolved to Closed | No | No | Yes | Yes |
| Reject a request | No | No | Yes | No |
| Set or change priority | No | No | Yes | No |
| View management counts and breakdowns | No | No | Yes | Yes |
| Maintain the category list | No | No | No | Yes |
| Create or deactivate a user account | No | No | No | Yes |
| Edit or delete an audit entry | No | No | No | No |

## 8.4 Request status model

The status model below is baselined in this document rather than deferred to design, because every management figure in FR-022 to FR-024 is derived from status and timestamps, and a state added or redefined after requests exist cannot be applied to historical records. That is recorded as RSK-09 and as FEC-02.

![Figure 2. CivicConnect request status model. Original diagram produced by the team.](fig2_status_model.png)

**Figure 2.** CivicConnect request status model. Original diagram produced by the team.

Three properties of this model carry engineering weight. First, it is closed: FR-016 refuses any transition not drawn, which makes the set of valid states testable rather than emergent. Second, no transition belongs to the Requester, which is what makes the audit trail meaningful - every state change has an accountable staff actor. Third, overdue is derived from age against a single organisation-wide target rather than stored as a status, so a request cannot be overdue and In Progress simultaneously in one field and not another. Per-category targets were deliberately deferred (SC-D-03) to keep that definition unambiguous.

# 9. Requirements Traceability Matrix

The live RTM is maintained in the registers workbook and in the repository; it holds one row per requirement, 42 rows in total. The extract below shows its structure. Columns for design, issue and Pull Request, implementation, test and release evidence are present and deliberately empty: they are the structure into which M2, M3 and M4 evidence is added, and their presence now is what makes the M3 change request an impact lookup rather than an investigation (RSK-03).

*Reading note from v2.0: this extract is shown as at the M1 baseline. The live RTM in the registers workbook carries the eight M2 columns (CR-003) for every requirement, with FR-016 traced end to end (#101, #105). s25.2 continues the two traces in s9.1.*

| **RTM ID** | **Source (stakeholder / brief)** | **Req ID** | **Requirement summary** | **Priority** | **Acceptance criteria** | **Related risk / FEC** | **Design ref (M2)** | **Issue / PR (M3)** | **Implementation (M3)** | **Test ref (M3)** | **Release evidence (M4)** | **Status** |
|----|----|----|----|----|----|----|----|----|----|----|----|----|
| TR-001 | STK-06, STK-07 | FR-001 | The system shall require a registered user to authenticate with a unique identifier and secret before any service requ... | Must | See requirements register | RSK-05 | Pending M2 | Pending M3 | Pending M3 | Pending M3 | Pending M4 | Baselined |
| TR-002 | STK-03, STK-06 | FR-002 | The system shall enforce role-based access control for the roles Requester, Staff, Coordinator and Manager, with every... | Must | See requirements register | RSK-05, FEC-01 | Pending M2 | Pending M3 | Pending M3 | Pending M3 | Pending M4 | Baselined |
| TR-003 | STK-05 | FR-003 | The system shall allow a Manager to create a user account and assign exactly one role to it. | Must | See requirements register | \- | Pending M2 | Pending M3 | Pending M3 | Pending M3 | Pending M4 | Baselined |
| TR-004 | STK-01 | FR-004 | The system shall allow a user to reset a forgotten credential through a controlled process that does not disclose whet... | Should | See requirements register | RSK-05 | Pending M2 | Pending M3 | Pending M3 | Pending M3 | Pending M4 | Baselined |
| TR-005 | STK-01 | FR-005 | The system shall allow a Requester to submit a service request capturing title, description, category, location and re... | Must | See requirements register | \- | Pending M2 | Pending M3 | Pending M3 | Pending M3 | Pending M4 | Baselined |
| TR-006 | STK-04, STK-05 | FR-006 | The system shall require the request category to be selected from a controlled list maintained by a Manager, and shall... | Must | See requirements register | FEC-02 | Pending M2 | Pending M3 | Pending M3 | Pending M3 | Pending M4 | Baselined |
| TR-007 | STK-01 | FR-007 | The system shall validate mandatory fields and field formats before accepting a submission, and shall report each fail... | Must | See requirements register | \- | Pending M2 | Pending M3 | Pending M3 | Pending M3 | Pending M4 | Baselined |
| TR-008 | STK-01, STK-03 | FR-008 | The system shall assign every accepted request a unique, human-readable reference that is never reused. | Must | See requirements register | \- | Pending M2 | Pending M3 | Pending M3 | Pending M3 | Pending M4 | Baselined |

## 9.1 One requirement traced end to end on the evidence available today

The milestone brief asks for one requirement traced end to end for the evidence that currently exists. The trace below is deliberately shown with its future links empty rather than filled with intentions.

| **Link in the chain** | **Evidence today** |
|----|----|
| Stakeholder need | STK-01, Requester: "know that my request was received, and what is happening to it now." Recorded in s5 with its conflict against STK-02. |
| Business need | Master Brief s2: requesters have limited visibility of whether a request was received, assigned, delayed, resolved or closed (Belgium Campus ITversity, 2026a). |
| Requirement | FR-011: the Requester may view the full detail and status history of their own request, showing only entries marked requester-visible. Priority Must. Source STK-01, STK-02. |
| Acceptance criteria | The detail view shows the request fields, the ordered status history with timestamps, and only entries marked requester-visible. No internal entry appears in the response payload, not only in the rendered page. |
| Decision it depends on | DEC-003: visibility is chosen explicitly per action entry, with no default. Without that decision the requirement is not implementable as written. |
| Constraint it engages | CON-05 security, through least privilege and POPIA minimisation. |
| Risk it mitigates | RSK-05, disclosure of personal information to a user not entitled to see it. Exposure 15, High. |
| Forward consideration | FEC-01: the requester-visible split is a data-model property, so it constrains the M2 persistence design rather than the interface. |
| Design evidence | Not yet produced. Due M2, tracked as RTM row TR-011, column H. |
| Issue and Pull Request | Not yet produced. Due M3, RTM columns I and J. |
| Test evidence | Not yet produced. Due M3: the negative case asserting that no internal entry appears in the response payload is derived from the acceptance criterion above and from the access matrix in s8.3. |
| Release and acceptance evidence | Not yet produced. Due M4, RTM column L. |

| Link in the chain | Evidence today |
|----|----|
| Stakeholder need | STK-03, Coordinator: "reliable prioritisation, clear ownership of every request." STK-04, Management, needs counts it can trust. |
| Business need | Master Brief s2: there is weak accountability for changes to request status and actions taken, and no single controlled record of a request's lifecycle. |
| Requirement | FR-016: the system shall permit a status change only where the transition is allowed by the request status model (Figure 2) and only by a role authorised for that transition. Must. |
| Acceptance criteria | For every ordered pair of statuses, a transition allowed by the model succeeds for an authorised role, and every transition not in the model is refused, including when issued directly to the endpoint. |
| Decision it depends on | The status model itself, baselined as Figure 2 with all twelve transitions and their authorised roles enumerated on the Status Model sheet. Without a closed model there is nothing for the guard to enforce. |
| Constraint it engages | CON-04 quality, because the acceptance criterion is only meaningful if every pair in the model is actually exercised; and CON-05 security, because the guard is an authorisation check, not a user-interface convenience. |
| Risk it mitigates | RSK-09, the status model proves ambiguous or incomplete after data exists and management reporting becomes unreliable. Probability 2, impact 4, exposure 8, Medium. Owner Darius Mushi. |
| Forward consideration | FEC-02: the model is decided inside M1 rather than deferred, because a status added after go-live cannot be applied to records already closed. It constrains the M2 persistence design and the M3 transition testing. |
| Design evidence | Not yet produced. Due M2, tracked as RTM row TR-016 column H: the architecture or state-diagram reference showing where the transition guard is enforced. |
| Issue and Pull Request | Not yet produced. Due M3, RTM columns I and J: the issue and Pull Request building the guard. |
| Test evidence | Not yet produced. Due M3, RTM column K: a matrix over all ordered status pairs, including the negative case asserting that a transition absent from the model is refused when issued directly to the endpoint rather than through the interface. |
| Release and acceptance evidence | Not yet produced. Due M4, RTM column L: management reporting reconciling against the audit trail, which is what FEC-02 says the model finally has to support. |

At M2, column H (Design ref) will hold the architecture or state-diagram reference showing where FR-016's transition guard is implemented. At M3, columns I - K will hold the issue/PR building the guard logic, its implementation reference, and the automated test reference proving the acceptance criteria, including the direct-to-endpoint negative case, actually passes.

# 10. Risk Register

Risks are scored on probability and impact from 1 to 5. Exposure is the product, and the band is Critical at 20 or above, High from 12 to 19, Medium from 6 to 11 and Low below 6. Scores are the current assessment with the mitigations described in progress, not an inherent rating. The register is live: it is reviewed at every milestone and updated when a risk materialises into an issue (Master Brief, s12).

*Reading note from v2.0: this register holds the M1 entries, RSK-01 to RSK-15, as at the M1 baseline. The live Risk Register in the registers workbook adds RSK-16 to RSK-29 from the M2 ADRs, including RSK-20 (an untested restore) and RSK-26 (one instance while node-cron schedules), which s24 and s26.2 cite. It also re-scores RSK-05 and RSK-12 (#101, #104, #106).*

| **ID** | **Risk** | **Cause** | **P** | **I** | **Exp** | **Band** | **Mitigation** | **Contingency** | **Owner** | **Status** |
|----|----|----|----|----|----|----|----|----|----|----|
| RSK-01 | The team does not reach working competence in the selected stack early enough to build the committed scope, and construction time is consumed by learning. | Technology selection is deferred to M2 (DEC-008) and the team has limited prior exposure to controlled team engineering at this scale (CON-06). | 4 | 5 | 20 | Critical | Make team capability an explicitly weighted criterion in the M2 technology decision. Run a timeboxed proof of concept covering authentication, one persisted entity and one automated test before committing. Prefer a stack in which at least two of three members have prior exposure. | Reduce committed scope to Must-priority requirements only, through a controlled change request, and record the trade-off rather than absorbing it silently. | Tristan Roets | Open |
| RSK-03 | The formal client change request scheduled for M3 arrives against an unchanged deadline and destabilises the baseline. | Master Brief s20.3 states that M3 includes a formal lecturer or client change request and impact analysis. This is a certainty, not a possibility. | 5 | 4 | 20 | Critical | Treat the change as planned work. Keep the RTM complete so impact analysis is a lookup rather than an investigation. Hold the Appendix E impact template ready. Keep Should and Could priority items as the intended absorption buffer so that a change displaces deferred work rather than Must-priority work. | Apply the change control process in Master Brief s14, record scope displacement explicitly, and seek approval for the resulting scope change rather than compressing verification. | Darius Mushi | Open |
| RSK-05 | Personal information held in service requests is disclosed to a user who is not entitled to see it. | Requests contain requester identity, contact detail and free-text description that may include sensitive circumstances. Record-level isolation (FR-012) and internal note separation (FR-011) are data-model properties, not interface behaviour. | 3 | 5 | 15 | High | Enforce authorisation server-side for every function (NFR-005). Derive negative tests directly from the access matrix. Treat record-level scope as an M2 data design input (FEC-01). Minimise stored personal information (NFR-008). | Contain by revoking the affected access, record the incident, assess notification obligations under POPIA, and raise a defect with the highest severity. | Tristan Roets | Open |
| RSK-08 | Repository history does not show authentic progressive engineering, and controlled evidence is discounted despite the software working. | Documentation work feels separable from the repository, so artefacts accumulate locally and are pushed in bulk near a deadline. Master Brief s23 states that reconstructed evidence may receive limited or no credit. | 3 | 5 | 15 | High | Place the PED and every register in the repository from the first week of M1 and change them through Pull Requests like code. Link commits to issues. Review the commit and Pull Request history as a team at each weekly checkpoint. | None available after the fact. This risk cannot be mitigated retrospectively, which is why its mitigation is entirely preventive. | Jean Smit | Open |
| RSK-11 | A credential, key or token is committed to the repository. | Configuration is needed to run locally, and the fastest way to share it between three developers is to commit it. | 3 | 5 | 15 | High | Agree the configuration and secrets approach in the Team Working Agreement before construction. Add ignore rules and secret scanning to the repository at setup, not at M3 (NFR-007). | Treat the secret as compromised: rotate it, and record that history rewriting does not undo exposure. | Jean Smit | Open |
| RSK-02 | The chosen platform's free tier proves unable to meet the availability or background-processing needs, or its terms change during the project. | Cost constraint CON-03 pushes the team to free tiers, whose idle behaviour, quotas and continuity are outside the team's control. Institutional platform support is not guaranteed (CON-07). | 3 | 4 | 12 | High | Record platform limits as explicit criteria in DEC-010 before committing. Verify cold-start and idle behaviour against NFR-003 during M2. Keep the deployment target portable by avoiding platform-specific services in the baseline. | Fall back to a second shortlisted platform identified in M2; if unavailable, revise NFR-003 through change control and record the residual risk rather than restating the target. | Tristan Roets | Open |
| RSK-04 | Controlled change stalls because the mandatory two-approval rule cannot be satisfied when a member is unavailable. | CON-08 requires two approvals from members other than the author. With exactly three members, every merge requires both remaining members, so one absence blocks all controlled change. | 4 | 3 | 12 | High | Agree a 24-hour review turnaround in the Team Working Agreement. Keep Pull Requests small and single-purpose so review is quick. Schedule two fixed review windows per week that all three members hold open. | Where an absence is known in advance, front-load merges before it. Where it is unplanned, record the blockage and its schedule effect rather than bypassing the control or rubber-stamping, which may receive no credit (Master Brief, s9). | Jean Smit | Materialised - active (review delay recorded 9 September 2026) |
| RSK-06 | Committed scope grows without control and the team delivers a larger unfinished system instead of a smaller complete one. | Additional features are permitted where justified (Master Brief, s3.1), and the visible reward for adding a feature is more immediate than the cost of specifying, securing, testing, documenting and maintaining it. | 3 | 4 | 12 | High | Baseline scope at PED v1.0 with an explicit deferred list (s6.3) so that a new idea has a recorded home other than the current sprint. Require any addition to enter through change control with an impact analysis. | Where uncontrolled work is discovered, stop it, assess it through Appendix E, and either approve it with an explicit displacement or return it to the deferred list. | Darius Mushi | Open |
| RSK-13 | The system behaves correctly in development but fails in staging or production because the environments differ. | Environment parity is not free, and free-tier hosting differs from a developer machine in runtime version, filesystem persistence, cold starts and network egress (Master Brief, s17). | 4 | 3 | 12 | High | Record parity as a forward consideration now (FEC-05) so it becomes an explicit M2 platform criterion. Keep environment-specific values in configuration rather than code from the first commit. | Roll back to the previous release, reproduce the difference in staging, and record the parity gap as a known limitation. | Tristan Roets | Open |
| RSK-14 | AI-assisted output is accepted into a controlled artefact without adequate verification, producing a defect or an artefact no member can defend. | AI is permitted throughout the project (Master Brief, s10), and reviewing generated work is slower and less rewarding than accepting it. The statement that AI generated it is never an acceptable engineering defence. | 3 | 4 | 12 | High | Record material AI contributions in the AI Usage Register at the time, not retrospectively. Apply the rule that no member may approve AI-assisted work they cannot explain without the assistant. Subject AI-generated work to the same branch, review and test controls as any other change. | Revert the artefact to its last verified state and re-derive it. Where an artefact cannot be explained by any member, remove it from the baseline. | Jean Smit | Open |
| RSK-07 | A registered member becomes unavailable and the team loses both delivery capacity and that member's contribution evidence. | Illness or other exceptional circumstance, against a fixed milestone calendar and an individually assessed presentation requirement (Master Brief, s25). | 3 | 4 | 12 | High | Rotate authorship so that no artefact has a single owner. Require all three members to review across the whole artefact set, not only their own area. Keep the PED and registers current so any member can present any artefact. | Follow the institutional process for an approved later presentation date. Redistribute committed work through the change process and record the schedule effect. | Jean Smit | Materialised - active (member availability affected M1 review capacity on 9 September 2026) |
| RSK-09 | The request status model proves ambiguous or incomplete after data exists, and management reporting becomes unreliable. | Reporting in FR-022 to FR-024 derives entirely from status and timestamps. A state added or redefined after go-live cannot be applied retrospectively to historical records. | 2 | 4 | 8 | Medium | Agree and baseline the status model now (Figure 2) with every transition and its authorised role enumerated. Define overdue against a single organisation-wide target (SC-D-03). Test every non-permitted transition as well as every permitted one (FR-016). | Treat a model change as a controlled change with an explicit data-migration and reporting-continuity analysis under Appendix E. | Darius Mushi | Open |
| RSK-10 | Real personal information is copied into a development, test or staging environment. | Realistic data is convenient for testing reporting and queue behaviour, and staging is intended to resemble production (Master Brief, s17). | 2 | 4 | 8 | Medium | Commit now to generated test data only. Build the seeding approach as a project artefact in M2 so the convenient path and the correct path are the same one (FEC-04). | Purge the affected environment, rotate any exposed credential, and record the event and its POPIA implications. | Tristan Roets | Open |
| RSK-12 | A third-party dependency introduces a vulnerability or malicious code into the build. | The baseline will rest on an ecosystem of transitive dependencies chosen in M2. OWASP raised software supply chain failures to A03 in 2025 (OWASP, 2025), and Sonatype recorded over 454 600 new malicious open-source packages during 2025 (Sonatype, 2026). | 2 | 4 | 8 | Medium | Make dependency-ecosystem maturity a criterion in DEC-008. Adopt lockfiles and automated dependency and vulnerability checking from the first construction Pull Request. Require any new dependency to be justified in the Pull Request that introduces it. | Remove or replace the affected component, assess exposure, and record the residual risk rather than claiming the system is clean. | Darius Mushi | Open |
| RSK-15 | A controlled engineering artefact cannot be safely reproduced or corrected because only the rendered output is retained. | Generated diagrams or similar artefacts are committed without their editable source or generation script. | 3 | 3 | 9 | Medium | Commit editable source or generation scripts alongside generated artefacts, and regenerate and compare outputs against the authoritative register. | Record the limitation, reconstruct the source, and independently verify the replacement against the controlled evidence before accepting it. | Jean Smit | Materialised - Figure 2, issue \#27 |

## 10.1 The risk that deserves the most attention now

Two risks share the highest exposure of 20. **Team judgement: RSK-03 deserves the most attention now**, and the reason is not its score.

|  | **RSK-01 - team capability against the schedule** | **RSK-03 - the M3 change request against a fixed deadline** |
|----|----|----|
| Probability | 4 - likely, but genuinely uncertain | 5 - certain. Master Brief s20.3 states that M3 includes a formal client change request and impact analysis. It is a scheduled event, not a possibility. |
| Impact | 5 | 4 |
| Can it be acted on now? | Partly. The main mitigation is a proof of concept, which cannot happen until the M2 technology decision is at least shortlisted. | Almost entirely. Every mitigation is available in M1: a complete RTM, the impact template prepared, and a designated absorption buffer. |
| What acting now buys | A better-informed decision in M2. | The difference between impact analysis as a lookup and impact analysis as an investigation, at the point in the project where the team has least spare time. |

**The argument.** A risk register is a list of things that might happen. RSK-03 is not one of them: the brief states it will happen. Treating a certainty as a risk is a category error, and the correct engineering response is to convert it into planned work rather than to monitor it.

That conversion is what most of this baseline is for. The RTM exists in complete form at M1 so that "which requirements does this change affect" is answered by reading a column rather than by re-deriving the analysis. MoSCoW priorities exist so that a change has a designated place to take capacity from: the Should and Could set absorbs it, and Must-priority scope is protected. The Appendix E impact template is prepared before it is needed. The alternative - discovering in M3 that impact analysis requires reconstructing traceability the team never built - costs exactly the time the team will not have.

**RSK-01 is not being neglected.** It carries the same exposure and a higher impact, and it has an owner and a contingency. The distinction is that its useful mitigation window opens in M2, whereas RSK-03's closes at the end of M1. Sequencing attention by when a mitigation is actually available, rather than by score alone, is the judgement being made here.

# 11. Forward Engineering Considerations

These are the later-lifecycle concerns that already influence the M1 baseline. They are recorded, not decided. Assignment 1 research is deliberately not reused here: each concern below is derived from a specific CivicConnect requirement, constraint or control, and is stated with the actual information the team is missing (M1 brief, s4).

| **ID** | **Concern** | **Why it matters now** | **Later decision or activity influenced** | **Information still missing** | **Risk of ignoring it** |
|----|----|----|----|----|----|
| FEC-01 | Authorisation depth and record-level data scope | The baseline already commits to per-Requester record isolation (FR-012), category-scoped Staff queues (FR-013) and internal versus requester-visible entries (FR-011). Each of these is a property of how data is shaped and queried, not a screen behaviour. | M2 data and architecture design; the M3 negative-test matrix derived from the access matrix. | Whether Staff scope is ultimately by category, by site, or global; whether SC-D-05 multi-site separation will ever be required. | Record-level authorisation added after the data model is fixed touches every query and every test, and tends to be implemented in the interface layer where it can be bypassed. |
| FEC-02 | Request status model stability and the definition of overdue | Every management figure in FR-022 to FR-024 is derived from status and timestamps. The model is being baselined now (Figure 2) precisely because it cannot be revised cheaply once requests exist. | M2 persistence design and reporting approach; M3 transition testing; M4 evaluation of whether reporting is trustworthy. | The organisation's actual response target, and whether different categories genuinely need different targets (SC-D-03). | A state added or redefined after go-live cannot be applied to historical records, so the reporting the platform exists to provide becomes unreliable at exactly the point it is first used. |
| FEC-03 | Background processing capability of the deployment platform | Notification beyond the in-application indication is deferred (SC-D-01), but reinstating it needs a scheduled job or always-on worker. Free tiers frequently restrict exactly that, so the M2 platform choice can close the option permanently without anyone noticing. | M2 deployment platform decision (DEC-010); any future change request that reintroduces email or SMS notification. | The background-process, scheduled-job and idle-timeout limits of each candidate platform within free-tier terms. | Choosing a platform on cost and interface alone can make a deferred requirement unimplementable, converting a reversible deferral into an irreversible exclusion. |
| FEC-04 | Test data and personal information in non-production environments | Staging is meant to resemble production (Master Brief, s17), while NFR-008 and POPIA constrain where personal information may exist. These two pull in opposite directions and the tension appears the first time anyone needs realistic data. | M3 test strategy and staging deployment; the seeding approach used for the NFR-001 performance measurement at 5 000 records. | Whether the organisation will provide any real historical data, and the retention position the organisation expects. | Realistic data is usually obtained by copying production. Deciding this after staging exists means the convenient path has already been taken. |
| FEC-05 | Environment parity, release control and rollback | NFR-003 states an availability target and the team has not yet chosen where the system will run. Whether a release can be verified before users see it, and reversed afterwards, is decided by the platform and the release path, not by the application code. | M2 platform decision; M3 staging deployment and production-readiness review; M4 production release and operational evidence. | Platform cold-start and idle behaviour, deployment mechanism, region and data residency, and whether a previous release can be restored quickly. | Discovering in M3 or M4 that staging cannot resemble production, or that a release cannot be reversed, leaves no time to change platform. |
| FEC-06 | Reporting load against the transactional data as volume grows | NFR-001 is stated at 5 000 requests and the management view in FR-022 aggregates across the same records the Staff queue reads. The interaction between the two only appears at volume. | M2 persistence and indexing design; whether reporting reads the transactional store directly; M3 performance evidence. | Expected request volume per month and the retention period, neither of which the organisation has yet supplied. | Aggregate reporting queries running against the same store can degrade the Staff queue, so the feature that provides oversight damages the feature that does the work. |
| FEC-07 | Review capacity under the mandatory two-approval control | CON-08 requires two approvals from members other than the author. With three members this is a throughput constraint on every controlled change from M2 onward, and it is being agreed now in the Team Working Agreement rather than discovered at a deadline. | All controlled change in M2, M3 and M4; the authenticity of the review evidence the project is assessed on. | Each member's realistic weekly availability windows across the remaining milestones. | The pressure at a deadline is to bypass the control or to approve without reading. Both are visible in the history, and rubber-stamped approval may receive no credit (Master Brief, s9). |

## 11.1 Forward Engineering Considerations map

![Figure 1. Forward Engineering Considerations map. Original diagram produced by the team.](fig1_fec_map.png)

**Figure 1.** Forward Engineering Considerations map. Original diagram produced by the team.

All seven concerns are opened in M1. What differs is when each is decided and where its consequence lands, and the map is drawn to make that difference visible. Five remain deliberately open, each gating a named deferred decision in s13.2, which is what distinguishes a recorded deferral from an oversight.

Two are decided inside M1 rather than deferred, and the reasoning is worth stating because it is the exception. FEC-02, the status model, is decided because its cost of reversal rises the moment the first request exists: a status added later cannot be applied to historical records, so the reporting the platform exists to provide would become unreliable at the point it is first used. FEC-07, review capacity, is decided because the two-approval control applies to controlled work from now onward, and the pressure to bypass it or to approve without reading arrives at a deadline. Agreeing the review commitment in advance is the only mitigation that works, because the alternative is agreeing it under exactly the pressure that defeats it.

# 12. Process, Team Working Agreement and Governance

## 12.1 Team working agreement

| **Area** | **Agreement** |
|----|----|
| Cadence | Two fixed working sessions each week plus one 20-minute checkpoint at which the PED, RTM, Risk Register and repository history are reviewed together. Attendance is recorded. |
| Review turnaround | A Pull Request receives a first review within 24 hours on a working day. This is a commitment made because CON-08 makes every merge dependent on both other members (RSK-04). |
| Review windows | Two windows each week are held open by all three members specifically for review, so that review is scheduled work rather than an interruption. |
| Pull Request size | One issue per Pull Request. A change large enough that a reviewer cannot hold it in their head is split, because approval that does not reflect meaningful review may receive no credit (Master Brief, s9). |
| Definition of done | Change is linked to an issue and a requirement identifier; affected registers are updated in the same Pull Request; checks pass; two approvals from members other than the author; merged by the author after approval. |
| Authorship rotation | No controlled artefact has a single permanent owner. Section ownership in the PED rotates each milestone so every member has authored and reviewed across the whole artefact set (RSK-07). |
| Decision rule | Technical decisions are taken by consensus at a working session and recorded in the Decision Log. Where consensus is not reached within one session the alternatives, the disagreement and the evidence still needed are recorded, and the decision is deferred rather than defaulted. |
| Escalation | A blocking disagreement or a blocked merge lasting more than two working days is raised with the lecturer rather than absorbed silently. |
| Communication | One agreed team channel for coordination. Engineering decisions are not settled in chat; they are recorded in the Decision Log or a Pull Request where they form part of the controlled history. |
| AI use | Permitted as an engineering assistant. Material contributions are recorded in the AI Usage Register at the time. No member approves AI-assisted work they cannot explain without the assistant. AI-assisted work carries the same branch, review and test controls as any other change (Master Brief, s10). |
| Secrets | No credential, key or token is committed. Configuration required to run locally is shared outside the repository through an agreed mechanism and is documented in the repository as a template with placeholder values only (NFR-007). |
| Contribution evidence | Each member maintains authored commits, owned issues, authored Pull Requests and reviewed Pull Requests throughout every milestone, because individual evidence is assessed separately (Master Brief, s8.1). |

## 12.2 GitHub governance and configuration management

GitHub is an engineering control and evidence environment, not the place where finished work is uploaded (M1 brief, s3.1). The PED and every register live in the repository from the first week of M1 and change through Pull Requests, because most M1 evidence is documentation and excluding it from controlled history would leave the team with nothing to show.

> **The evidence column is yours and cannot be produced retrospectively**
>
> The right-hand column below is the only part of this document that the team must generate rather than complete. Repository history, Pull Requests, reviews and approvals must show authentic progression over time; bulk uploads or activity reconstructed before assessment may receive limited or no credit (Master Brief, s23). This is the one risk in the register with no contingency (RSK-08), because it cannot be mitigated after the fact.

| **Control** | **How the team applies it** | **Evidence link** |
|----|----|----|
| Repository | One controlled team repository holding the PED, all registers, and later the source and tests. Documents live in the repository from week one of M1 so that history is authentic rather than reconstructed (RSK-08). | https://github.com/PVY-Smit/civicconnect (public). Holds PED v1.0, the seventeen register sheets and both figures under docs/, with src/ and tests/ in place for M3. |
| Main branch protection | main is protected. Direct pushes are disabled for all members including administrators. | Ruleset "Protect main" (id 22248862), enforcement active on refs/heads/main: https://github.com/PVY-Smit/civicconnect/rules/22248862. bypass_actors is empty, so the control binds administrators as well. Read back from the GitHub API on 8 September 2026. |
| Pull Requests | Required for every substantive change to any controlled artefact, documents included. | https://github.com/PVY-Smit/civicconnect/pulls?q=is%3Apr. Every change to a controlled artefact since the baseline commit has entered through a Pull Request: \#18 AI Usage Register, \#19 PED layout. The two direct commits to main predate the ruleset, which was created on 4 September 2026; none have occurred since. |
| Required approvals | Two approvals from members other than the author. Self-approval is not accepted. | Ruleset rule pull_request, required_approving_review_count = 2: https://github.com/PVY-Smit/civicconnect/rules/22248862. GitHub does not permit an author to approve their own Pull Request, so self-approval cannot occur. |
| Stale review dismissal | Approvals are dismissed when new commits are pushed, so an approval always refers to the merged content. | Ruleset rule pull_request, dismiss_stale_reviews_on_push = true: https://github.com/PVY-Smit/civicconnect/rules/22248862. An approval therefore always refers to the commit that merges, not to an earlier one. |
| Linear history | Enabled, so that the controlled history stays readable as evidence. | Ruleset rules required_linear_history and non_fast_forward, both active: https://github.com/PVY-Smit/civicconnect/rules/22248862. Merge commits and force pushes to main are refused. |
| Branch naming | type/issue-number-short-description, for example docs/14-scope-baseline or feat/27-request-submission. | Convention in CONTRIBUTING.md, "Branch naming": https://github.com/PVY-Smit/civicconnect/blob/800b982f60ff7edb1931debc8525ffb6a48a5a20/CONTRIBUTING.md#L20-L26. Applied in the live branches docs/10-ai-register-js, docs/ped-layout-fix, docs/20-fec-decision-links and docs/6-governance-evidence. |
| Issues and board | Every substantive change is represented by an issue on the project board and referenced from the branch and Pull Request. | Board: https://github.com/users/PVY-Smit/projects/1. Issues: https://github.com/PVY-Smit/civicconnect/issues. Every issue raised on the project is placed on the board, and each controlled change references its issue from the branch name and from the Pull Request that implements it. No fixed count is stated here: the number changes whenever an issue is raised, and evidence that goes stale on its own is weaker than evidence that describes the control. |
| Pull Request template | Prompts for the linked issue and requirement identifier, the registers updated, the checks run, and what the reviewer should focus on. | https://github.com/PVY-Smit/civicconnect/blob/800b982f60ff7edb1931debc8525ffb6a48a5a20/.github/pull_request_template.md. In use on \#18 and \#19, both of which record the linked issue, the registers touched, the AI-assistance declaration and what the reviewer should focus on. |
| Review checklist | Alignment with the requirement and its acceptance criteria; correctness; maintainability; security and privacy implications; test and regression impact; dependency changes; traceability impact; whether the change belongs in the controlled baseline (Master Brief, s9.1). | Checklist in CONTRIBUTING.md, "Review checklist": https://github.com/PVY-Smit/civicconnect/blob/800b982f60ff7edb1931debc8525ffb6a48a5a20/CONTRIBUTING.md#L55-L68. The control operating, not merely configured: review of \#18 found the registers-updated checklist inverted against the actual change, which was corrected in response (https://github.com/PVY-Smit/civicconnect/pull/18#issuecomment-5583144236); the same review found that the Figure 2 label defect was recorded in a register row but not tracked as work, and it was raised as issue \#27 (https://github.com/PVY-Smit/civicconnect/pull/18#issuecomment-5583171255). Approval carrying reasoning rather than a bare tick: https://github.com/PVY-Smit/civicconnect/pull/19#pullrequestreview-5140293911. |
| Secret scanning | Enabled on the repository, with push protection where available (NFR-007). | Secret scanning and push protection both enabled, confirmed from the GitHub API on 8 September 2026: https://github.com/PVY-Smit/civicconnect/settings/security_analysis. Supported by .gitignore, which excludes .env, key and certificate files, and by .env.example, which carries placeholder values only (NFR-007, RSK-11). |
| Repository structure | docs/PED, docs/requirements, docs/risk, docs/decisions, docs/change, docs/quality, docs/security, docs/deployment, src, tests, .github (Master Brief, Appendix C). | https://github.com/PVY-Smit/civicconnect/tree/main/docs. docs/PED, docs/requirements, docs/architecture, docs/decisions, docs/risk, docs/change, docs/quality, docs/security, docs/deployment, plus src/, tests/ and .github/. Folders for later milestones are present and empty by design (Master Brief, Appendix C). |

## 12.3 Meaningful review

An approval records a judgement that the change belongs in the controlled baseline. The team applies the review criteria in Master Brief s9.1: alignment with the requirement and its acceptance criteria, correctness and design consistency, maintainability and technical debt, security and privacy implications, tests and regression impact, dependency changes, and traceability impact. A reviewer who cannot identify what the change is for asks rather than approves, and an approval given without reading may receive no credit.

## 12.4 Change control after baseline

Once PED v1.0 is signed off, a change to baselined scope, requirements or the status model follows Master Brief s14: change request, impact analysis, decision, authorisation, implementation, verification, then baseline update. The impact template is held on the Change Requests sheet of the registers workbook and is prepared in advance because a change request is expected in M3 (RSK-03).

# 13. Engineering Decision Log

Significant decisions are recorded so that later consequences can be evaluated against what was known at the time (Master Brief, s13). Entries marked DEFERRED are as deliberate as those marked Decided: each states the evidence still required before the decision can responsibly be taken.

*Reading note from v2.0: this log is shown as at the M1 baseline. The live Decision Log in the registers workbook records DEC-008, DEC-009 and DEC-011 as decided, DEC-010 as still deferred for the production database, and DEC-013 to DEC-015 as the M2 design decisions (#101, #105). s19 to s24 and s26.1 summarise them.*

| **ID** | **Decision** | **Status** | **Context** | **Constraints** | **Alternatives** | **Decision taken** | **Rationale** | **Trade-offs** | **Risks** | **Evidence / still required** | **Later consequence** |
|----|----|----|----|----|----|----|----|----|----|----|----|
| DEC-001 | Adopt four roles: Requester, Staff, Coordinator and Manager | Decided | The capabilities in Master Brief s3 group into three actor types, but assignment and prioritisation are distinct from carrying out work. | CON-06 team capability; CON-02 schedule; least privilege under CON-05. | \(a\) Three roles, folding coordination into Staff. (b) Four roles as adopted. (c) Five roles, separating Administrator from Manager. | Four roles, with administration held by Manager. | Three roles would give every Staff member the ability to set priority, defeating DEC-002 and the accountability the platform exists to create. Five roles adds a permission set and a test column for a separation no stakeholder in the analysis has asked for. | More roles means a larger access matrix and more negative tests. Manager holds both oversight and administration, which is a mild separation-of-duties compromise accepted for a team of this size. | If the organisation later requires separation of administration from oversight, the matrix and tests must be revised. | PED s5 stakeholder analysis; the access matrix in s8.4. | Sets the permission model that FR-002 and every negative test in M3 are derived from. |
| DEC-002 | Requester-reported urgency is an input; the Coordinator owns priority | Decided | STK-01 wants to signal that a request is urgent. STK-03 is accountable for the order in which work is actually done. | Accountability requirement in Master Brief s2; no reliable way to validate a self-declared urgency. | \(a\) Requester sets priority directly. (b) No urgency captured at all. (c) Urgency captured as a separate attribute, priority set by Coordinator. | Option (c). | Option (a) makes priority meaningless within a short period because there is no cost to declaring urgency. Option (b) discards genuine information the Requester holds about impact. | The Requester may perceive that their urgency was ignored. Mitigated by keeping both values visible to the Coordinator and by FR-020 requiring a reason on rejection. | If the two values diverge persistently the organisation may need a documented triage rule, which does not exist yet. | FR-021; stakeholder conflict recorded against STK-03. | Requires two attributes in the M2 data design, not one. |
| DEC-003 | Separate internal action entries from requester-visible entries | Decided | STK-01 wants full visibility. STK-02 needs to record candid working notes, including notes about access, safety or difficulty. | CON-05 security and least privilege; POPIA minimisation under NFR-008. | \(a\) All notes visible to the Requester. (b) No notes visible to the Requester. (c) Visibility chosen explicitly per entry. | Option (c), with no default visibility. | Option (a) suppresses honest recording, which degrades the record the platform exists to create. Option (b) returns the Requester to chasing by telephone, which is the original problem. | Every action entry now carries a decision the author must make, which is a small ongoing cost and a possible source of error. | An entry marked with the wrong visibility is a disclosure. FR-017 therefore forbids a silent default. | FR-011, FR-017; stakeholder conflict recorded against STK-01 and STK-02. | Makes visibility a field in the data model and a case in the M3 negative-test matrix. |
| DEC-004 | Issue a unique human-readable request reference at submission | Decided | Requesters, staff and management all need to refer to one request unambiguously across conversations that will continue to happen outside the system. | CON-01 scope; the accountability need in Master Brief s2. | \(a\) Expose the internal identifier. (b) Issue a separate human-readable reference. | Option (b). | Exposing an internal sequential identifier both reveals volume and invites enumeration attempts against FR-012. | A second identifier must be generated, kept unique and never reused, which is a small amount of additional logic and one more uniqueness constraint. | Reference collision or reuse would corrupt the audit trail. FR-008 states the acceptance criterion. | FR-008; FR-012. | Constrains the M2 data design to a generation strategy that is safe under concurrent submission. |
| DEC-005 | In-application notification only in the baseline | Decided (scope) | STK-01 needs to know when something happens to a request. Email, SMS and WhatsApp channels all reach the requester more directly. | CON-02 schedule; CON-03 cost; unknown platform background-processing limits. | \(a\) Email notification in the baseline. (b) In-application indication only. (c) Both. | Option (b), with the channel deferred as SC-D-01. | An external channel needs a sending service, a background worker, delivery-failure handling and a bounce position, none of which can be specified before the platform is known. | The Requester must sign in to learn of an update, which is weaker than the stated need. This is a known gap, recorded rather than concealed. | If the M2 platform cannot run a background worker, the deferral becomes an exclusion. Recorded as FEC-03. | SC-D-01; FEC-03. | Makes background-process support a required criterion in DEC-010. |
| DEC-006 | Exclude file attachments from the baseline | Decided (scope) | A photograph of a fault is high-value evidence for STK-02 and would reduce return visits. | CON-03 cost of storage; CON-05 security; CON-02 schedule. | \(a\) Include attachments. (b) Include with type and size restriction only. (c) Defer. | Option (c), deferred as SC-D-02. Defended in PED s6.4. | Attachments introduce storage cost, content-type validation, malware scanning, a retention position and personal information inside images. The team cannot meet the security obligations within the schedule, and a half-controlled attachment feature is worse than none. | Requesters will describe faults in text, which is less precise. Staff may need more site visits. | Deferral is only safe if the M2 data design does not preclude adding an attachment relationship later. | SC-D-02; PED s6.4. | The M2 data design must leave room for an attachment relationship without a migration. |
| DEC-007 | Adopt MoSCoW prioritisation and the project identifier scheme | Decided (process) | Requirements, risks, decisions and changes must carry stable identifiers that survive into later milestones (Master Brief, s6.1 and s11). | CON-08 governance; the RTM must remain usable as evidence grows. | \(a\) High/Medium/Low priority. (b) MoSCoW. (c) Numeric ranking. | MoSCoW, with the scheme FR-nnn, NFR-nnn, STK-nn, CON-nn, RSK-nn, DEC-nnn, FEC-nn, SC-x-nn, CR-nnn. | MoSCoW states the commitment rather than a relative ordering, which is what a baseline needs. It also identifies the Should and Could set that RSK-03 designates as the absorption buffer for the M3 change. | MoSCoW invites everything to be labelled Must. Countered by requiring a stakeholder source for each item. | Identifiers must not be renumbered once baselined; doing so silently breaks the RTM. | Requirements register; RTM. | Every later artefact references these identifiers, so the scheme is effectively irreversible after sign-off. |
| DEC-008 | Technology stack selection | DEFERRED to M2 | M1 is explicitly not a technology-selection milestone (M1 brief, s5), and the team does not yet hold the evidence to choose responsibly. | CON-06 capability; CON-07 platform availability; CON-03 cost; CON-05 security. | Not yet evaluated. Candidate evaluation is an M2 activity. | Deliberately not decided. | Deciding now would rest on familiarity rather than evidence, which is the specific failure Master Brief s18.1 warns against. | Deferral costs nothing while requirements are being baselined, because no baselined requirement in this document names a technology. | Deferring past M2 would begin to constrain construction time. The decision point is the start of M2. | Evidence still required: requirement and architecture fit; realistic learning curve for these three members; availability and compatibility on the BC Desktop platform; dependency ecosystem maturity; testing and automation support; deployment compatibility; free-tier limits and likely operational cost; lock-in and unavailability consequences. | Determines construction, testing and deployment for the remainder of the project. |
| DEC-009 | Software architecture style | DEFERRED to M2 | Architecture must follow from the architecturally significant requirements, and those are only being baselined in this document. | NFR-001 performance; NFR-003 availability; NFR-005 authorisation; NFR-012 maintainability; CON-06 capability. | Not yet evaluated. | Deliberately not decided. | The quality attributes that should drive the choice are baselined here for the first time. Choosing before they were agreed would invert the dependency. | None while requirements work continues. | The choice interacts with DEC-008 and DEC-010; deciding any one in isolation constrains the other two. | Evidence still required: which NFRs prove architecturally significant; the record-level authorisation shape from FEC-01; the reporting load position from FEC-06. | Sets the structure that maintainability and change cost depend on for the rest of the project. |
| DEC-010 | Deployment platform and environment topology | DEFERRED to M2 | The availability target NFR-003 and the cost ceiling NFR-013 both depend on a platform that has not been chosen. | CON-03 cost; CON-07 availability of the platform; NFR-003; NFR-013. | Not yet evaluated. | Deliberately not decided. | Platform behaviour cannot be assumed from marketing material; free-tier terms, idle behaviour and background-process limits must be verified (Master Brief, s23). | None yet, but this decision has the shortest safe deferral window of the four because FEC-03 and FEC-05 both wait on it. | Choosing on cost alone could permanently close the deferred notification channel (FEC-03) or make staging parity impossible (FEC-05). | Evidence still required: free-tier quotas and terms; cold-start and idle behaviour measured against NFR-003; background-process and scheduled-job support; region and data residency; rollback mechanism; projected cost beyond the educational context. | Determines whether NFR-003 and NFR-013 are achievable and whether SC-D-01 can ever be reinstated. |
| DEC-011 | Persistence technology and schema design | DEFERRED to M2 | The data model must express FR-012 record isolation, FR-025 audit immutability and the FEC-01 authorisation scope, which are baselined here but not yet designed. | CON-05 security; NFR-001 performance; NFR-011 auditability. | Not yet evaluated. | Deliberately not decided. | Schema design is explicitly outside M1 (M1 brief, s5). The requirements it must satisfy are inside M1, and are recorded here. | None while requirements work continues. | This is the longest-lived commitment in the system, because data outlives the application. FEC-01, FEC-02 and FEC-06 all constrain it. | Evidence still required: the outcome of DEC-008; expected volume and retention from the organisation (FEC-06); the final record-level scope decision (FEC-01). | Constrains every later change to reporting, authorisation and migration. |
| DEC-012 | Adopt protected main with short-lived branches and two-reviewer approval | Decided (governance) | Master Brief s9 mandates the controls. The team must decide how to operate them with three members from the first week of M1. | CON-08 governance; CON-02 schedule; RSK-04 review capacity. | \(a\) Long-lived feature branches per member. (b) Short-lived branches per issue with rapid review. (c) Direct commits to main for documents only. | Option (b). Every substantive change to any controlled artefact, document or code, enters main through a Pull Request with two approvals. | Option (a) produces large, hard-to-review Pull Requests that invite rubber-stamping. Option (c) is not permitted by Master Brief s9 and would exclude the PED and registers from controlled history, which is where most M1 evidence lives. | Every document change now costs a Pull Request and two reviews. This is a real overhead accepted because the review history is itself assessed evidence. | With three members, one absence blocks all merges. Recorded as RSK-04 and FEC-07. | Repository branch protection settings; Pull Request history; PED s12. | Applies to every controlled change for the remainder of the project. |

## 13.1 The decision the team deliberately did not make

Four decisions are recorded as deferred: technology stack (DEC-008), architecture style (DEC-009), deployment platform (DEC-010) and persistence design (DEC-011). Of these, **DEC-008, the technology stack, is the one the team was most tempted to take**, and the reasoning for not taking it is the one most worth defending.

The temptation is that the team already has preferences, and choosing now would feel like progress. The Master Brief is direct that this is the failure mode: technology selection is an assessed engineering decision, not a preference exercise, and it must be justified against requirements, capability and constraints rather than familiarity (Belgium Campus ITversity, 2026a, s18.1). At the point M1 began, the team did not hold the evidence to make that justification, because the requirements it must be justified against are being baselined in this document for the first time.

**What makes the deferral safe.** Deferral costs nothing while requirements work continues, and the test of that claim is concrete: no baselined requirement in this document names a technology, a framework, a database or a platform. The NFRs state measurable targets and measurement methods; none states an implementation. If a requirement here had assumed a stack, the deferral would be fiction.

**What the team still needs, and when the window closes.** DEC-008 records the evidence required: requirement and architecture fit, realistic learning curve for these three members, availability and compatibility on the BC Desktop platform (CON-07), dependency ecosystem maturity, testing and automation support, deployment compatibility, free-tier limits and likely operational cost, and the consequence if the technology becomes unavailable. The decision point is the start of M2. Deferring past it begins to consume construction time, which is RSK-01. Of the four, DEC-010 has the shortest safe window, because FEC-03 and FEC-05 both wait on it.

# 14. AI Usage and Verification

AI is used as an engineering assistant. It is not authoritative evidence and does not transfer accountability away from the team, and the statement that AI generated something is never an acceptable engineering defence (Master Brief, s10).

## 14.1 Controls the team applies

**1.** Material AI contributions are recorded in the AI Usage Register at the time the work is done, not reconstructed before assessment.

**2.** No member approves AI-assisted work they cannot explain without the assistant. Anything that fails that test is rewritten or rejected.

**3.** AI-assisted work carries the same branch, Pull Request, review and test controls as any other change.

**4.** Important AI claims are verified against credible sources or technical tests. A citation supports why a practice matters; it never proves the team implemented a control correctly, which requires project evidence (M1 brief, s9.1).

**5.** No credentials, confidential material or personal data belonging to the organisation are exposed to external AI systems.

## 14.2 AI Usage Register

*Reading note from v2.0: this register holds the M1 entries. The live AI Usage Register in the registers workbook adds the A2, A3 and M2 entries for all three members (#101, #104).*

> **This register is incomplete by design**
>
> The rows below show the expected format and the standard of verification required. **They are placeholders.** Each member must record their own actual AI-assisted work, with their own name, and must delete or rewrite any row that does not describe something they personally did. A register that does not match the team's real process is worse than no register.

| **Date** | **Student** | **Tool** | **Engineering task** | **AI contribution** | **Verification performed** | **Decision** | **Issues found** |
|----|----|----|----|----|----|----|----|
| 3 September 2026 | Jean Smit | Claude (Anthropic) - conversational assistant | Drafting PED v1.0 and the M1 registers workbook: functional and non-functional requirements with acceptance criteria, RTM, Risk Register, Forward Engineering Considerations and Decision Log. | Proposed the document and register structure, candidate FR and NFR wording with acceptance criteria, candidate risk and forward-consideration entries, and the two PED figures. | Every requirement checked against Master Brief s11 for a unique identifier, a named source, a priority and testable wording, and each acceptance criterion checked to be objectively verifiable. Forward Engineering Considerations checked to be CivicConnect-specific and anchored to named FR, NFR and CON identifiers rather than a generic lifecycle list. RTM columns H to L were left as Pending M2 and Pending M3 rather than populated, since no design, implementation or test evidence exists at M1. | Accepted after revision | Draft Decision Log entries that pre-selected a technology stack, an architecture style and a deployment platform were rejected as outside the M1 boundary (M1 brief s5) and re-recorded as deliberately deferred decisions DEC-008 to DEC-011, each stating the evidence still required before the decision can be taken. |
| 2026-09-09 | Tristan Roets | ChatGPT (OpenAI, GPT-5.6 Sol) | Reviewing M1 GitHub pull requests and preparing Risk Register and Forward Engineering Consideration evidence | Assisted with identifying review blockers, checking traceability and governance issues, drafting review wording, and structuring Risk Register and FEC notes. | Compared the recommendations against the live GitHub pull requests, current main branch, CONTRIBUTING.md, issue requirements, and the controlled workbook and PED before accepting or revising them. | Accepted after revision | Some suggestions were based on incomplete or outdated repository state. These were rechecked against the live repository, corrected where necessary, and unsupported claims were rejected. |
| 2026-09-08 | Darius Mushi | AI chat assistant | Understanding and preparing to defend PED s8 (functional and non-functional requirements) and owned risks RSK-03, RSK-06, RSK-09, RSK-12 ahead of the M1 engineering defence; inspecting the repository's actual commit history for authenticity | Explained the rationale linking requirement structure to ISO/IEC/IEEE 29148:2018, traced connections between FR/NFR items and owned risks, generated practice questions, and retrieved the repository's commit history via git commands | Re-ran git log --all --stat myself against the live repository and confirmed the commit history, authorship and file changes matched what the assistant reported | Accepted as a study aid; the commit-history finding was treated as something to raise with the team, not taken at face value | The assistant could not assess repository authenticity from a ZIP export alone (no .git history included) until the live repository URL was supplied; a snapshot without history can look complete while hiding whether the process was authentic |
| 3 September 2026 | Jean Smit | Claude (Anthropic) - conversational assistant | Structuring and formatting of PED v1.0 and the registers workbook, and the later repair of the document layout. | Proposed the section architecture and numbering, the column sets and table layouts for each register sheet, and the document and workbook styling. Later re-oriented three sections to landscape and scaled five over-wide tables to the page. | Section structure checked against the twelve required M1 outputs (M1 brief s3) and against the PED quality standard (Master Brief s6.1), to confirm that each required output has a home and a stable identifier scheme. The layout repair was verified by exporting the document to PDF and confirming that no table or figure exceeds the usable width of the section it sits in. | Accepted after revision | Seven items overflowed the page and were cut off in the rendered document: the RTM, the Decision Log, the Risk Register, both figures, the version history table and the AI Usage Register. The RTM and both figures had been placed in portrait sections despite being sized for landscape, so scaling alone would not have made them readable. |
| 3 September 2026 | Jean Smit | Claude (Anthropic) - conversational assistant. Figures produced programmatically as SVG from a Python script and rendered to PNG; no diagramming application was used. | Producing Figure 1, the Forward Engineering Considerations map, and Figure 2, the request status model. | Generated the SVG source, including the lifecycle columns, the marker positions for each concern and the decision each concern gates. | Figure 1 checked against s11 and the Decision Log concern by concern: the opened-in-M1 marker, the decision or implementation window, the peak-consequence point and the gated decision for all seven concerns. Figure 2 checked against the twelve rows of the baselined status model, transition by transition, including the authorised role and the guard condition on each. | Accepted after revision | The first attempt was rejected because it was not vector source that could be regenerated: the initial figure was a canvas rendering rather than SVG. It was redone as SVG generated from a Python script and rendered to PNG, so a marker can be moved by editing the source and re-rendering rather than by redrawing the image. Two discrepancies were then found on checking and are recorded rather than silently corrected. (1) Figure 1 names one gated decision per concern, but the Decision Log records FEC-01 and FEC-06 as gating DEC-009 as well as DEC-011, since DEC-009 requires the record-level authorisation shape from FEC-01 and the reporting load position from FEC-06; the figure understates those two rows by one decision. The Forward Considerations sheet also cites DEC-010 in the Links column for FEC-03 and FEC-05 but cites no decision for FEC-01 or FEC-06, so that link is recorded in the Decision Log only. (2) In Figure 2 the single New to In Progress arc carries two stacked labels while the Assigned self-loop carries none, so 'reassign to a different staff member' reads as belonging to the wrong transition; recorded as issue \#27 and carried as a known limitation in s16.1 rather than corrected, since the diagram source is not held in the repository. All twelve transitions, their directions, authorised roles and guard conditions are otherwise correct. |
| 8 September 2026 | Jean Smit | Claude Code (Anthropic) | M1 close-out: auditing the baseline and its repository evidence against the briefs, and drafting the AI Usage Register entries and the GitHub Governance evidence column. | Audited the repository, git history and GitHub controls against Master Brief s9 and M1 brief s3, and drafted the register entries and the evidence references. | Every governance claim was checked against the live repository rather than asserted. Ruleset 22248862 was read back from the GitHub API to confirm two required approvals, stale-review dismissal, linear history and an empty bypass list; secret scanning and push protection were confirmed enabled; collaborator and invitation state was confirmed directly. | Accepted after revision | Draft evidence cells initially cited the branch-protection settings as configured. These were rewritten to cite the ruleset read back from the API, because a claim that a control exists is not evidence that it operates. Two cells were left deliberately unfilled rather than pointed at an empty Pull Request list. |

# 15. Initial Deployment and Operational Considerations

No deployment decision is taken in M1. What follows is the set of considerations already known to constrain the M2 platform decision, recorded so that the decision is made against criteria rather than convenience (Master Brief, s17).

| **Consideration** | **Position at M1** |
|----|----|
| Environments | Development, test, staging and production are treated as distinct. Success in one does not evidence success in another, which is why NFR-003 and NFR-001 are measured on the target environment rather than on a developer machine. |
| Environment parity | Recorded as FEC-05. Free-tier hosting differs from a developer machine in runtime version, filesystem persistence, cold-start behaviour and network egress. Parity is a platform selection criterion in DEC-010, not a discovery for M3. |
| Configuration and secrets | Environment-specific values are held in configuration, never in code, from the first commit. No credential, key or token enters the repository (NFR-007, RSK-11). A configuration template with placeholder values is committed; the real values are not. |
| Release and rollback | Deployment and release are distinct. How release approval occurs, and whether a previous release can be restored quickly, are criteria in DEC-010. Rollback is considered before production release, not after an incident. |
| Observability | The availability measurement in NFR-003 requires a health endpoint and an external probe. That is the minimum operational instrumentation the baseline already commits to; broader logging and monitoring design belongs to M3. |
| Data residency and retention | POPIA obligations make hosting region and retention period real constraints rather than defaults (CON-05, NFR-008). Both are recorded as information still required in DEC-010 and FEC-04. |
| Operational cost | NFR-013 requires the free-tier limits and the projected cost beyond the educational context to be documented. An unsupported claim that a platform is free is not acceptable (Master Brief, s23). |

# 16. Baseline Sign-off and Gate Decision

PED v1.0 becomes the controlled engineering baseline when this sign-off is completed by all three members at the M1 gate review. After sign-off, baselined content changes only through s12.4.

| **Field** | **Value** |
|----|----|
| **Project** | CivicConnect - Community Service Request Management Platform |
| **Baseline type** | Engineering Foundation and Requirements Baseline |
| **Document** | PED v1.0 |
| **Version** | 1.0 |
| **Date** | 30 September 2026, after the M1 submission. Answers recorded on #69 |
| **Scope reviewed** | YES |
| **Requirements and traceability checked** | YES |
| **Risk review completed** | YES |
| **Repository and governance controls checked** | YES, noting #37 and #47 |
| **Forward Engineering Considerations reviewed** | YES |
| **AI Usage Register current and verified** | YES |
| **Outcome** | CONDITIONALLY ACCEPTED, as the team's recommendation (30 September 2026, #69). The gate decision is the assessor's, recorded below, and is pending. |
| **Conditions recorded (if any)** | #27 the Figure 2 label defect; #36 figure sources not held in the repository; #37 branch naming breached on five branches; #47 checks required before any existed; #48 s12.4 narrower than Master Brief s14. Each is carried in s26.2 |
| **Team approval - Jean Smit** | Approved, 30 September 2026 (#69) |
| **Team approval - Tristan Roets** | Approved, 30 September 2026 (#69) |
| **Team approval - Darius Mushi** | Approved, 30 September 2026 (#69) |
| **Assessor / client gate decision** | For the assessor to complete |

> **Gate outcomes (M1 brief, s9)**
>
> **ACCEPTED** - PED v1.0 provides a sufficiently controlled foundation for the next project phase.
>
> **CONDITIONALLY ACCEPTED** - minor corrections or conditions are recorded; the team may proceed subject to those conditions.
>
> **REVISION REQUIRED** - the foundation is not sufficiently controlled to justify consequential architecture or design decisions.

## 16.1 Known limitations of this baseline

Stated deliberately, because professional honesty about limitations and residual risk is valued above unsupported claims of completeness (Master Brief, s23).

**1.** Several NFR targets rest on assumptions the organisation has not yet confirmed: expected request volume, the response target that defines overdue, and the retention period. These are recorded as information still required in FEC-02, FEC-04 and FEC-06 rather than invented.

**2.** NFR-003 states an availability target against a platform not yet chosen. It is a commitment the team may have to revise through change control once DEC-010 is taken, and RSK-02 records that.

**3.** The requester notification need is only partially met. In-application indication (FR-029) is weaker than the stated need, and whether the deferred channel can be reinstated depends on FEC-03.

**4.** Stakeholder roles are held by a small number of real people in the organisation; the analysis in s5 is derived from the scenario in the Master Brief rather than from interviews the team conducted. Where an assumption stands in for a stakeholder statement, it is recorded as such.

**5. Figure 2 carries a label placement defect. The single New to In Progress arc shows two stacked labels while the Assigned self-loop shows none, so the reassignment label reads against the wrong transition and implies the wrong authorised role. The baselined status model on the Status Model sheet is correct and is the authority; only the rendered figure is wrong. It is recorded as issue \#27 rather than corrected before the gate, because the diagram source is not held in the repository and rebuilding it the day before sign-off carries more risk than the defect does.**

# 17. References

*Harvard style. Sources support why a practice, standard or concern is relevant; they do not evidence that the team implemented a control correctly, which requires project evidence (M1 brief, s9.1).*

Belgium Campus ITversity (2026a) *SEN381 CivicConnect Master Project Brief, version 1.1*. Software Engineering 381. Belgium Campus ITversity.

Belgium Campus ITversity (2026b) *SEN381 CivicConnect Project Milestone 1: Engineering Foundation and Requirements Baseline*. Software Engineering 381. Belgium Campus ITversity.

ISO (2023) *ISO/IEC 25010:2023 Systems and software engineering - Systems and software Quality Requirements and Evaluation (SQuaRE) - Product quality model*. Geneva: International Organization for Standardization. Available at: https://www.iso.org/standard/78176.html

ISO/IEC/IEEE (2018) *ISO/IEC/IEEE 29148:2018 Systems and software engineering - Life cycle processes - Requirements engineering*. Geneva: International Organization for Standardization. Available at: https://www.iso.org/standard/72089.html

Node.js (no date) *Node.js release schedule*. GitHub repository nodejs/Release. Available at: https://github.com/nodejs/Release (Accessed: 29 September 2026).

OWASP (2025) *OWASP Top 10:2025 - Introduction*. Open Worldwide Application Security Project. Available at: https://owasp.org/Top10/2025/0x00_2025-Introduction/

Prisma (2026) *Prisma 7.10.0 pins deepmerge-ts 7.1.5 and mysql2 3.15.3, which carry high-severity npm audit advisories*. GitHub issue #30295, prisma/prisma, 15 September. Available at: https://github.com/prisma/prisma/issues/30295 (Accessed: 29 September 2026).

Render (no date) *Deploy for free*. Render Docs. Available at: https://render.com/docs/free (Accessed: 30 September 2026).

Republic of South Africa (2013) *Protection of Personal Information Act 4 of 2013*. Pretoria: Government Printer. Available at: https://www.gov.za/documents/protection-personal-information-act

Sonatype (2026) *State of the Software Supply Chain Report: the evolving software supply chain attack surface*. Available at: https://www.sonatype.com/state-of-the-software-supply-chain/2026/open-source-malware

Supabase (no date) *Edge Functions*. Supabase Docs. Available at: https://supabase.com/docs/guides/functions (Accessed: 30 September 2026).

W3C (2023) *Web Content Accessibility Guidelines (WCAG) 2.2*. W3C Recommendation, 5 October. Available at: https://www.w3.org/TR/WCAG22/

# 18. Architecturally Significant Requirements

Milestone 2 turns the M1 baseline into architecture, technology and initial design. The first step was to establish which requirements shape the structure of the system, and why. Six drivers were selected from the M1 baseline. The full record, with the evidence for each driver, the measurable expectation already committed in M1 and the decisions each one constrains, is `docs/architecture/asr-quality-drivers.md`, raised under #56 and merged through #71.

| **Driver** | **Statement** | **Comes from** |
|----|----|----|
| ASR-01 | Authorisation is decided on the server for every protected function, and scope reaches individual records | NFR-005, FR-002, FEC-01 |
| ASR-02 | The staff queue stays responsive at the baselined volume while management reporting reads the same data, and a submission is acknowledged quickly | NFR-001, NFR-002, FEC-06 |
| ASR-03 | Every status, assignee and priority change produces exactly one audit entry that nothing can edit | NFR-011, FR-025, FR-026 |
| ASR-04 | The team can change the system safely under two-approval review with three people | NFR-012, CON-08, RSK-04 |
| ASR-05 | The service runs inside a free tier at the committed availability | NFR-013, NFR-003, CON-03, RSK-02 |
| ASR-06 | Three students can build and support the result inside the milestone schedule. A bound on complexity, with no measurable target | CON-06, RSK-01 |

ASR-01 to ASR-05 each carry a measurable target from the M1 baseline. ASR-06 does not, so it is treated as a bound on complexity in every decision that follows and is never scored alongside the other five. The committed quality attributes that do not shape structure are listed in the same record, with the reason each is excluded.

# 19. Architecture

**Decision (DEC-009, ADR-001).** CivicConnect is a modular monolith: one deployable application, divided into modules with explicit interfaces, over one relational database. Reporting reads the transactional store for now. The record is `docs/decisions/ADR-001-architecture-style.md` (#57), approved under #72.

The modular monolith and three alternatives were compared against the six drivers. A service per capability would have to repeat authorisation across services and would need a distributed transaction or a compensation design for every audited change (ASR-01, ASR-03). A function per operation puts cold starts directly on NFR-001. A client over a hosted data service moves enforcement into store rules and a client the team does not control, against FR-002. No baselined requirement asks for independent deployment, independent scaling or a second consumer of the data, so the evidence for the distributed options is absent. The M2 brief's point that a more distributed architecture is not automatically more advanced applies directly.

Five rules make the module boundaries real rather than folder names:

**1.** Every call enters through the application's own server-side entry point (ASR-01).

**2.** Authorisation decisions and read scope are taken in the policy module, and no other module encodes who may see what (ASR-01, ASR-02).

**3.** A status change passes through the workflow module, and its audit entry is written in the same transaction (ASR-03).

**4.** Notification is called through an in-process interface, with an extension point for asynchronous delivery (ASR-05).

**5.** Modules depend on one another through declared interfaces only, and shared data access lives behind the persistence module (ASR-04).

![Figure 3. Module view of the modular monolith, from ADR-001.](../architecture/diagrams/module-view.png)

**Figure 3.** Module view of the modular monolith, from ADR-001. Original diagram produced by the team; its source is `module-view.svg` beside the image.

![Figure 4. Deployment view, from ADR-001.](../architecture/diagrams/deployment-view.png)

**Figure 4.** Deployment view, from ADR-001. Original diagram produced by the team; its source is `deployment-view.svg` beside the image.

**The M1 evidence conditions for DEC-009, answered.** The architecturally significant NFRs are identified in s18. FEC-01 is partly answered: scope reaches individual records, and if staff scope later becomes site-based or global, only the policy module changes, under rule 2. FEC-06 is answered for now: reporting reads the transactional store, and ADR-001 records the two measurements that would reopen that choice.

# 20. Technology Stack

**Decision (DEC-008, ADR-002).** Node.js 24 LTS, Express 5 and PostgreSQL through Prisma 7, with React 19 built with Vite for the client, argon2 for password hashing and Node's built-in test runner. The record is `docs/decisions/ADR-002-technology-stack.md` (#91).

| **Component** | **Version** | **Why it is here** |
|----|----|----|
| Node.js | 24 LTS, supported until 30 April 2028 (Node.js, no date) | Runtime |
| Express | 5.2.1 | Server-side entry point (ADR-001 rule 1) |
| Prisma CLI, client and PostgreSQL adapter | 7.10.0, pinned exactly | Schema, migrations and data access (DEC-011) |
| pg | 8.23.0 | PostgreSQL driver the Prisma adapter uses |
| argon2 | 0.45.1 | Password hashing for NFR-004 |
| node-cron | 4.6.0 | In-process scheduling, if FEC-03 requires it |
| Test runner | `node:test`, built in | NFR-012's evidence, with no added dependency |
| React and React DOM; Vite | 19.3.0; 8.3.0 | Client, added with the first client work |

**How it was decided.** Node and Django both passed the hard gates, and the five measurable drivers came out level between them. Two register entries pointed in opposite directions: RSK-12 (Medium, 8) favours Django, which needs fewer packages, and RSK-01 (Critical, 20) favours Node, because its baselined mitigation prefers a stack in which at least two of three members have prior exposure, and Node meets that on both readings of prior exposure while Django meets it on neither. RSK-01 decided it, as the highest-scored risk on the register, with a preference fixed in M1 before any candidate was named. ADR-002 records how the drafts reached that answer, including two reversals.

**Conditions.** Two things must happen before the bootstrap in #90 merges: the stack is run on a BC Desktop machine, recording the Node version found (gate 3), and the RSK-01 proof of concept passes, covering authentication, one persisted entity and one automated test.

**Dependency finding.** Prisma 7.10.0 pins two packages, deepmerge-ts 7.1.5 and mysql2 3.15.3, that carry high-severity advisories no 7.x release has fixed (Prisma, 2026). The bootstrap overrides them to their fixed versions. The finding is the risk RSK-12 describes, and RSK-12 is re-scored for it with the M2 register changes (#68).

# 21. Data and Persistence

**1.** CivicConnect uses PostgreSQL as its single relational transactional store, with Prisma as the authoritative application schema and persistence mapping. The initial model contains User, Category, UserCategory, Request, ActionEntry, RequestStatusHistory and AuditEntry. Each Request belongs to one requester and one category and may have an assignee. A Request has many action entries, status-history entries and audit entries. The persistence module owns database access and transaction boundaries; domain modules use it through declared interfaces under ADR-001.

**2.** The Request stores the externally visible `reference` and the application fields needed for request processing and authorisation, including `requesterId`, `categoryId`, `assigneeId`, `reportedUrgency`, `status`, `priority` and `resolutionSummary`. `reportedUrgency` records the urgency supplied by the Requester and remains distinct from staff-controlled priority. `visibility` does not belong to Request: it belongs to ActionEntry and must be chosen explicitly when an action entry is created.

**3.** ActionEntry, RequestStatusHistory and AuditEntry have separate responsibilities. ActionEntry stores dated operational notes under FR-017 and records the author, body and explicit visibility. RequestStatusHistory provides the immutable requester-facing status timeline required by FR-011. AuditEntry provides immutable structured evidence of auditable changes under FR-025 and FR-026, including the actor, `fieldChanged`, `previousValue`, `newValue` and timestamp. A status change therefore appends RequestStatusHistory and exactly one AuditEntry; the history row is not a duplicate FR-025 audit entry.

**4.** FR-008's human-readable request reference is generated from a database-managed atomic sequence and protected by a unique constraint. The application does not calculate the next reference by reading the current maximum value because concurrent submissions could select the same value. A sequence value may be consumed by a transaction that later rolls back, so gaps are accepted; uniqueness and concurrency safety are required, while gap-free numbering is not.

**5.** Request creation is one transaction. The authenticated requester and supplied title, description, category, location and reported urgency are validated, referenced records are checked, the next atomic reference value is obtained, the Request is inserted in `New` state, and the initial RequestStatusHistory row is written with `fromStatus = null` and `toStatus = New` before commit. Request creation does not create an FR-025 AuditEntry because FR-025 records changes to an existing value and creation has no previous value. If a required write fails, the transaction rolls back rather than exposing a partially created Request.

**6.** Controlled request changes use the same consistency boundary required by ADR-001 rule 3. After ADR-005 validates a status transition and ADR-006 authorises the operation, the current Request status, RequestStatusHistory row and exactly one structured AuditEntry containing the previous and new status are written in the same transaction. Assignee and priority changes similarly update the Request and write exactly one AuditEntry containing the corresponding previous and new values. This prevents current state from changing successfully without its required audit evidence.

**7.** Integrity is enforced at several layers. UI validation provides early feedback, service validation applies workflow and authorisation rules, and database constraints protect facts that must remain true regardless of caller, including primary keys, foreign keys, required relationships, email uniqueness and request-reference uniqueness. Indexes initially support the main request scope and queue fields, including `requesterId`, `categoryId`, `status`, `assigneeId` and `createdAt`. Categories referenced by historical records are deactivated rather than deleted under FR-027, preserving historical request references.

**8.** PostgreSQL remains the system of record for both operational request data and management reporting during M2. Using one relational store keeps the architecture proportionate but creates a shared availability and performance dependency. Production deployment therefore requires persistent storage that survives application-process restart and a defined backup and restore mechanism. The reporting-store choice must be reconsidered if NFR-001 cannot be met against 5,000 requests while management reporting runs against the same store, or if FEC-06 produces evidence that reporting load threatens transactional responsiveness. Reporting separation, replication and concrete hosting/recovery arrangements otherwise remain later evidence-driven deployment decisions rather than being introduced by this section.

The controlling decision and initial schema are recorded in [ADR-007: Data and persistence design](../decisions/ADR-007-data-persistence.md) and `docs/data/initial-schema.sql` under #58.

# 22. Design Decisions

Milestone 2 requires at least two final project-specific design decisions informed by the Assignment 2 research (M2 brief, s5.6). Both below come from design problems A2 Task 1 identified in the CivicConnect requirements, and both are built and tested. The research is held in `docs/research/A2_jean-smit.md`, sections 1.1 to 1.3, and is referenced here rather than repeated.

## 22.1 Status transition mechanism (ADR-005)

**Problem.** The Status Model permits twelve transitions between seven statuses, each with authorised roles and a guard of a different kind. The service, the interface and the tests all need the same rules, and RSK-09 expects the model to change. Copies in three places would drift, and FR-016 would fail wherever a copy was not updated.

**Decision.** A declarative transition table with Strategy guards, the option A2 recommended over conditional logic and the State pattern. The table holds the twelve transitions as frozen data in code, each with its roles, its guard and the requirement it traces to. The transition check refuses a move outside the model first, then asks the authorisation policy, then evaluates the guard. The same module tells the interface which moves to offer. The record is `docs/decisions/ADR-005-status-transition-mechanism.md` (#93).

**Applied and verified.** `src/modules/workflow-status/transition-table.js` and `transitions.js`. The tests check the table against a fixture exported from the Status Model register and exercise all 196 combinations of status pair and role. Three deliberate faults in the table each failed the suite.

**Expected benefit.** The service, the interface and the tests read one set of rules, so FR-016 cannot fail through a copy that was not updated. A change to the Status Model, which RSK-09 expects, is one edited entry and a re-exported fixture, and leaves the other eleven transitions untouched.

**Against the A2 recommendation.** It matches: A2 recommended the transition table (option 1C) over conditional logic in the service (1A) and the State pattern (1B). ADR-005 refines it in two ways. The table is frozen JavaScript data reviewed like code, where A2 said typed code, which keeps the property A2 wanted, that it cannot grow into an external configuration language. The authorisation policy is passed in as a function, so neither module imports the other.

**Complexity accepted.** Guards could grow into an informal rules language, so they are kept small and in code, and the fixture has to be re-exported whenever the register changes.

## 22.2 Authorisation enforcement (ADR-006)

**Problem.** Authorisation has a role dimension and a record dimension. NFR-005 is an absolute target, so one forgotten check is a breach, and NFR-001 rules out loading every request and filtering afterwards.

**Decision.** Scope applied at the query for reads, and a central policy for actions, the combination A2 recommended. Under ADR-001 rule 2 both come from one policy module, which removes most of the complexity A2 recorded against combining them. Scopes are Specifications, so the query condition and the check on a single request come from one rule. The record is `docs/decisions/ADR-006-authorisation-enforcement.md` (#94).

**Applied and verified.** `src/modules/authorisation-policy/policy.js`. The tests generate a case from all sixty cells of a fixture exported from the Access Matrix register, and check for every role that the query condition and the single-request check select the same requests. Four deliberate faults in the policy each failed the suite.

**Alternatives.** A2 compared three approaches: checks written inline in each handler (2A), which fails NFR-005 on the first omitted check; a central policy component (2B), testable against the Access Matrix but loading and then filtering on its own; and authorisation applied at the query (2C), correct for lists by construction but poor at decisions about actions.

**Expected benefit.** NFR-005 becomes testable cell by cell against the register. Lists are filtered in the database, so NFR-001 is not spent loading requests the actor may not see. If FEC-01 moves staff scope to site or makes it global, only the policy module changes.

**Against the A2 recommendation.** It matches: A2 recommended 2C for reads and 2B for actions. ADR-006 refines where the scope comes from. A2 placed query scoping in the repository methods, and under ADR-001 rule 2 the condition comes from the policy module and the persistence layer only applies it.

**What the tests found.** Four cells of the Access Matrix grant what the requirements refuse: the Manager assigning, rejecting and setting priority, and the Coordinator accepting an unassigned request. FR-016 makes the Status Model authoritative for transitions, and the Status Model gives assigning to the Coordinator and accepting to Staff (FR-015), and rejecting to the Coordinator (FR-020). FR-021 gives priority to the Coordinator only. The policy denies all four, and #92 takes the conflict to change control.

*Resolved in M3 (13 October 2026): CR-002 corrected the four cells in the Access Matrix register and in s8.3, the test fixtures are exported from the register, and the policy's list of conflicts is empty (#92, #136). See s29.*

**Complexity accepted.** A query that does not use the scope bypasses it. Until a check enforces this, it rests on review, and the M3 negative tests at the endpoints are what catch a miss.

## 22.3 Where the two decisions meet

The transition table holds which roles may make each move, and the authorisation policy evaluates them, together with the actor's scope. Every authorisation decision, including those about status changes, is therefore taken in one component, and the one transition that depends on category scope, accepting an unassigned request, does not duplicate the scoping rule.

# 23. Interface and Integration

**1.** CivicConnect uses an in-process notification interface inside the modular monolith for M2. FR-029 indications are derived from already persisted requester-visible request evidence rather than stored in a separate Notification table. The request/status workflow and requester-visible action-entry workflow produce that evidence, and the in-application notification component consumes it and maps qualifying evidence to requester indications.

**2.** FR-029's four indications have explicit mappings. `accepted` is produced by the first RequestStatusHistory transition from `New` to `Assigned` or from `New` to `In Progress`. `updated` is produced by a new requester-visible ActionEntry under FR-017; internal action entries do not qualify. `rejected` is produced by a transition whose `toStatus` is `Rejected`. `completed` is produced by each RequestStatusHistory transition whose `toStatus` is `Resolved`; if a request is reopened and later resolved again, that new transition produces a new completed indication. A later transition to `Closed` does not produce an additional completed indication.

**3.** Status-based indications use persisted RequestStatusHistory evidence. Their logical boundary information includes `requestId`, `requestReference`, `requesterId`, `fromStatus`, `toStatus` and `occurredAt`. Update indications use a persisted requester-visible ActionEntry and logically require `requestId`, `requestReference`, `requesterId`, `actionEntryId` and `occurredAt`. The indication type is derived from the controlled FR-029 mapping rather than supplied arbitrarily by a caller.

**4.** `visibility` is not part of the status-notification contract because RequestStatusHistory is requester-visible under FR-011. For an ActionEntry-derived `updated` indication, visibility is evaluated before the entry qualifies: only an ActionEntry whose explicit ADR-006 visibility permits requester access can enter the notification path. The notification boundary does not expose database connection information, audit internals, credentials or unrelated personal information.

**5.** The producers remain responsible for workflow, authorisation and persistence. Status transitions are validated under ADR-005, authorised under ADR-006 and persisted with their required history/audit evidence under ADR-007. Requester-visible action entries are likewise authorised and persisted before they can qualify as updates. The notification consumer reads authorised persisted evidence and maps it to FR-029 indications; it does not change request state, create action entries or bypass those controlled decisions.

**6.** Persisted source evidence provides the required next-sign-in behaviour. RequestStatusHistory preserves the events used for `accepted`, `rejected` and `completed`, while ActionEntry preserves requester-visible authored updates used for `updated`. When the Requester later asks for notifications, the application retrieves only requests and qualifying evidence authorised for that authenticated Requester and applies the FR-029 mapping. No separate notification write is required for M2.

**7.** This design also defines failure behaviour. If a request/status transaction fails, no successfully committed history exists from which to derive an `accepted`, `rejected` or `completed` indication. If ActionEntry creation fails, no `updated` indication exists. If notification presentation temporarily fails, the persisted evidence remains available to be read again later. This avoids a separate notification-write failure window.

**8.** No HTTP call, message broker, notification microservice or separate Notification table is introduced for the M2 path. The notification interface remains inside the authenticated CivicConnect application boundary: the authenticated Requester identity comes from the application context, notification-source queries remain subject to ADR-006, and internal-only ActionEntries, audit data, credentials and unrelated personal information are not exposed across the boundary. Because the interface is internal to the modular monolith, it is not a public versioned API; breaking changes are coordinated through the application code and controlled ADR/RTM updates. Email and SMS remain deferred under SC-D-01. The decision must be reopened if later requirements introduce email or SMS delivery, delivery while the user is offline, durable read/unread or acknowledgement state, retry after provider failure, independent notification scaling or a separate deployment boundary. Any asynchronous or externally consumed extension must then define contract versioning, persistence, retries, duplicate handling, secrets and operational monitoring.

The controlling decision is recorded in [ADR-008: Request status notification interface](../decisions/ADR-008-notification-interface.md) under #63.

# 24. Deployment Direction

**1.** **Evaluation of Baseline Hosting Infrastructures (DEC-010):** To resolve the operational hosting direction, a comparative architectural review was performed between Supabase and Render. Supabase provides a managed PostgreSQL database, but it runs server-side code as Edge Functions: TypeScript functions on the Deno runtime, distributed at the edge (Supabase, no date). The Express application in s20 is a long-running Node.js server, so on Supabase it would need a separate host. Render was selected because it natively supports generic multi-language web service runtimes, allowing the team to host our Express application and relational database in a unified workspace area that accommodates the s20 baseline technology stack footprint.

**2.** **Infrastructure Constraints and Free Tier Disadvantages (NFR-013 & NFR-002):** In compliance with NFR-013, the platform's free tier bounds are explicitly constrained by official platform specifications (Render, no date). Operating under these parameters introduces severe operational limitations that alter system capability. Free web services automatically spin down after 15 minutes of idle traffic. A subsequent inbound request forces a container cold start that takes approximately one full minute to resolve, which explicitly breaks the 3-second application layer maximum latency bound required by NFR-002.

**3.** **Storage Ephemerality and Milestone 3 Database Deferral (NFR-003):** Relational storage validation passes are fundamentally bound to Render Free PostgreSQL limits. Free PostgreSQL instances automatically expire 30 days after creation, after which a strict 14-day upgrade grace period is triggered before Render permanently deletes the database and all its associated data rows. Furthermore, the free database tier lacks all automated backup layers and connection pooling. Consequently, this managed instance serves strictly as an initial environment proof of concept and cannot function as our persistent production database cluster. The final production database choice is deliberately deferred to Milestone 3, pending team investigation into paid tier operational costs or identifying an alternative free PostgreSQL host that does not enforce an automatic 30-day deletion limit.

**4.** **Credential Isolation and Automated TLS Mapping (NFR-006):** Security baseline parameters conform strictly to NFR-006; Render automatically provisions and manages free fully-managed TLS certificates across all custom web service endpoints, removing manual certificate configuration blocks from the Milestone 3 roadmap scope. All production infrastructure connection strings and database credential keys are completely abstracted away from source control, injected at the container instance tier, and resolved at runtime via centralized wrapper modules (`src/lib/env.js`).

**5.** **Background Automation Task Scheduling Restrictions (FEC-03):** Localized automation routines designed via standard background tracking daemons (`node-cron`) are severely limited on this tier. Because free web service containers sleep during idle cycles, the application event loop pauses, meaning background cron routines will completely fail to execute when the platform is asleep. Additionally, standalone Render background workers and native cron jobs are restricted to paid tiers only. To preserve data integrity and prevent task race anomalies, the platform is restricted strictly to a single (1) active running instance. Advanced continuous delivery deployment scripts and remote log stream aggregators are deliberately deferred for Milestone 3 evaluation.

# 25. Development Evidence and Traceability

## 25.1 What has been built

| **Work** | **Evidence** | **State at the time of writing** |
|----|----|----|
| Project bootstrap aligned to ADR-001's ten modules | #90 | Open, merge gated by the ADR-002 conditions |
| Status transition mechanism | #93, ADR-005 | Merged |
| Authorisation policy | #94, ADR-006 | Merged |
| Secret scanning as the first CI check | #87 | Merged 30 September 2026. It runs on every pull request and push to main, and has passed on each run |
| End-to-end path from submission to notification | #65 | Not started, and moved to M3 (s26.2). The data model has merged (#97); it needs the bootstrap (#90) |

## 25.2 The two M1 traces, continued

s9.1 traced FR-011 and FR-016 on the evidence that existed at M1, with their later links deliberately left empty. The links M2 fills are shown below against what M1 recorded. The M1 rows in s9.1 stand unchanged.

**FR-011: the Requester sees only requester-visible entries.**

| **Link** | **At M1 (s9.1)** | **At M2** |
|----|----|----|
| Architecture driver | Not in the M1 trace. The drivers were identified in M2 | ASR-01: authorisation is decided on the server, and scope reaches individual records (s18) |
| Module | Not in the M1 trace | `authorisation-policy`, which owns read scope under ADR-001 rule 2 (s19) |
| Technology | Not in the M1 trace. DEC-008 was deferred | Node.js 24 and `node:test` (ADR-002, merged under #91) |
| Data | FEC-01: the requester-visible split is a data-model property, so it constrains the M2 persistence design | ADR-007 (#97, merged) holds action entries as their own entity, ActionEntry, whose `visibility` is chosen explicitly with no default. It is the field the policy's scope filters |
| Design evidence | Not yet produced. Due M2, RTM row TR-011, column H | ADR-006: action-entry scope in the policy module limits a Requester to entries marked requester-visible (FR-011, FR-017) |
| Issue and Pull Request | Not yet produced. Due M3 | #62 and #94, merged ahead of the M3 schedule |
| Test evidence | Not yet produced. Due M3 | `tests/authorisation-policy.test.js` asserts that a Requester's scope admits only requester-visible entries. The negative case in the acceptance criterion, that no internal entry appears in the response payload, is still due in M3 at the endpoint |

**FR-016: a status change only where the model allows it, by an authorised role.**

| **Link** | **At M1 (s9.1)** | **At M2** |
|----|----|----|
| Architecture driver | Not in the M1 trace. The drivers were identified in M2 | ASR-03: every status change produces exactly one audit entry that nothing can edit (s18) |
| Module | Not in the M1 trace | `workflow-status`, through which every status change passes under ADR-001 rule 3, with its roles evaluated by `authorisation-policy` (s19) |
| Technology | Not in the M1 trace. DEC-008 was deferred | Node.js 24 and `node:test` (ADR-002, merged under #91) |
| Data | FEC-02: the model constrains the M2 persistence design | ADR-007 (#97, merged): the Request's current status, its status-history row and one audit entry with the previous and new status, written in one transaction under ADR-001 rule 3 |
| Design evidence | Not yet produced. Due M2, RTM row TR-016, column H | ADR-005: the transition table holds the model, and ADR-006 evaluates its roles. ADR-001 rule 3 places the change in the workflow module |
| Issue and Pull Request | Not yet produced. Due M3 | #61 and #93, merged ahead of the M3 schedule |
| Test evidence | Not yet produced. Due M3: a matrix over all ordered status pairs | The matrix exists at unit level in `tests/workflow-status.test.js`: all 196 combinations of status pair and role, checked against the Status Model register. The acceptance criterion's refusal "when issued directly to the endpoint" is still due in M3, once #65 builds the endpoint |

RTM rows TR-011 and TR-016 carry the same links in the M2 columns (#54, #101), and TR-016 is the RTM's end-to-end trace.

# 26. Architecture, Technology and Initial Design Baseline

## 26.1 What the baseline contains

The baseline is PED v2.0 and the registers workbook as signed off by the team in s26.3, on 30 September 2026. It becomes the baseline when #95 merges. The status column is as at 30 September 2026.

| **Item** | **Record** | **Evidence** | **Status** |
|----|----|----|----|
| Architecturally significant requirements | `docs/architecture/asr-quality-drivers.md` | #71 | Merged |
| Architecture style, with module and deployment views | ADR-001, DEC-009 | #72; Decision Log row #82 | Merged |
| Technology stack | ADR-002, DEC-008 | #91 | Merged. Conditional on the two ADR-002 conditions in s26.2 |
| Data and persistence | ADR-007, DEC-011 | #97 | Merged |
| Notification interface | ADR-008, DEC-015 | #98 | Merged |
| Status transition mechanism | ADR-005, DEC-013 | #93 | Merged |
| Authorisation enforcement | ADR-006, DEC-014 | #94 | Merged |
| Deployment direction | DEC-010 | #60, #103 | Merged. The production database is deferred to M3 (s26.2) |
| This document | PED v2.0 | #95 | Signed off by the team 30 September 2026 (s26.3); baselined when #95 merges |

## 26.2 Open decisions and deferred concerns

These are recorded separately from the baseline, as the M2 brief requires, each with what would close it.

**DEC-008, the two ADR-002 conditions**: ADR-002 merged under #91 on 30 September 2026, conditional on the campus check (gate 3), which records the Node version a BC Desktop machine has, and on the RSK-01 proof of concept covering authentication, one persisted entity and one automated test. Both must pass before #90 merges, and if either fails, DEC-008 is revisited through change control. The check posted on #64 on 30 September 2026 was run on a member's own machine, on Node 25.9.0 with mock data, so neither condition is met yet.

**DEC-010, the production database**: Section 24 records the application running as a Render web service (#103). The production database is deferred to M3. Render's free PostgreSQL expires 30 days after creation and is then deleted, and it supports no backups (Render, no date), so it cannot be the system of record that ADR-007 requires to be backed up and restorable (RSK-20). Closing it needs one of two pieces of evidence: the projected cost of a paid database plan, assessed against CON-03 and NFR-013, or a free PostgreSQL host without the expiry. The single instance node-cron requires (RSK-26) and the cold start after 15 minutes idle, which NFR-002 and NFR-001 cannot absorb on the first request, are recorded in s24 as limits of the direction taken.

**CR-002, the Access Matrix**: four cells grant what FR-015, FR-016, FR-020 and FR-021 refuse (#92). On 30 September 2026 the team decided to correct the matrix to the requirements for all four cells (#69). The correction of the Access Matrix sheet, s8.3 and the test fixture is M3 work; the authorisation policy already denies the four cells, so no code depends on it.

*Resolved in M3 (13 October 2026): CR-002 is implemented. The Access Matrix sheet and the test fixtures are corrected (#136), and the s8.3 table is corrected in PED v3.0. Nothing of CR-002 remains open.*

**#65, the end-to-end path**: moves to M3. It needs the bootstrap (#90), whose merge is gated on the DEC-008 conditions, and the data model (#97). The two design decisions and their tests are merged (#93, #94), so M3 wires them into a working path rather than designing them.

**FEC-01**: whether staff and management scope stays by category, moves to site or becomes global. Only the policy module changes when it is answered.

**FEC-06**: reporting reads the transactional store until one of the two measurements in ADR-001 reopens it.

**SC-D-01**: notification beyond the in-application indication stays deferred. ADR-008 lists the conditions that would reopen it, and the extension point under ADR-001 rule 4 keeps it possible.

**Prisma**: the overrides for deepmerge-ts and mysql2 are removed when a Prisma 7 release fixes issue #30295 (RSK-12). Upgrading to Prisma 8 is a separate decision, taken once it is released as stable.

**Known limitations carried from M1.** Each is an open issue, recorded here so the baseline does not imply it is resolved.

**#27**: the Figure 2 label defect recorded in s16.1. Closed by regenerating the figure once its source is held (#36).

**#36**: the sources of Figures 1 and 2 are not in the repository, so neither figure can be corrected. Figures 3 and 4 hold their sources beside them.

**#37**: five branches breached the naming convention during M1. Closed by a check on branch names.

**#47**: the definition of done and the PR template require checks to pass. The first check exists in #87; the requirement is met when a check runs on every pull request to main.

**#48**: PED s12.4 is narrower than Master Brief s14. Closed by a change request widening it.

**#49**: the repository controls A2 Task 4 recommended. #87 is the first of them; the rest are M3 work.

## 26.3 Baseline sign-off

| **Field** | **Value** |
|----|----|
| Project | CivicConnect - Community Service Request Management Platform |
| Baseline type | Architecture, Technology and Initial Design Baseline |
| Document | PED v2.0 |
| Date | 30 September 2026, the team's sign-off. Answers recorded on #69. Baselined when #95 merges |
| ASRs and architecture reviewed | YES |
| Technology selection and deployment direction reviewed | NO. ADR-002 is accepted, but DEC-010's production database is deferred to M3 (s24, s26.2) |
| Data and persistence model reviewed | YES |
| Design decisions reviewed against the code | YES |
| RTM, Risk Register and Forward Considerations updated | YES |
| AI Usage Register current and verified | YES |
| Outcome | CONDITIONALLY ACCEPTED, as the team's recommendation (30 September 2026, #69). The gate decision is the assessor's, recorded below, and is pending. |
| Conditions recorded (if any) | 1. DEC-010: the production database is chosen in M3 on the evidence in s24 and s26.2. 2. #90 merges only after the campus Node check (gate 3) and the RSK-01 proof of concept pass against a database; CR-004 (#129, under review) proposes amending this condition. 3. #65, the end-to-end path, moves to M3. 4. CR-002 is implemented: the four Access Matrix cells are corrected to the requirements (#92) |
| Team approval - Jean Smit | Approved, 30 September 2026 (#69) |
| Team approval - Tristan Roets | Approved, 30 September 2026 (#69) |
| Team approval - Darius Mushi | Approved, 30 September 2026 (#69) |
| Assessor / client gate decision | For the assessor to complete |

# 27. Milestone 3 Overview and Release Candidate

Milestone 3 builds the M1 scope on the M2 baseline and shows, with evidence, how ready the release candidate is. It is recorded in sections 27 to 36, after section 26, for the reason given in s2 for M2: sections 1 to 26 keep their numbers because the registers and the repository cite them.

## 27.1 Submission information

The M3 brief, s5.3, asks for this block so that the assessor can find the submitted baseline.

| **Item** | **Value** |
|----|----|
| Team | Jean Smit - 600368 \| Tristan Roets - 601764 \| Darius Mushi - 577982 |
| Repository | https://github.com/PVY-Smit/civicconnect |
| Release candidate | None tagged, because the classification is NOT READY (s36.2). The submitted baseline is main at commit d1af49a (15 October 2026); pull requests still in review are named where their evidence is cited |
| PED version | v3.0 |
| RTM | `docs/requirements/CivicConnect_M1_Registers.xlsx`, sheet RTM. The M3 columns CR-006 proposes are not added, because CR-006 still waits for Darius Mushi's answer (#126, s36.1). The workbook keeps its M1 file name, which the registers, the PED and the pull requests cite, and holds the registers for every milestone |
| Test catalogue | `docs/quality/test-catalogue.md` (#126) |
| CI and test evidence | No CI workflow runs the tests (#110 not done). The secret scan runs on every pull request. The test evidence is the local runs recorded in the test catalogue, on main at d1af49a on 15 October 2026, Node 24.14.0 on Windows 11 (s32.3) |
| Staging or demonstration | No staging environment (#122 not done). To run the tests locally, follow the repository README: with PostgreSQL 16 and `DATABASE_URL` set in `.env` from `.env.example`, run `npm ci`, `npx prisma generate`, `npx prisma migrate deploy` and `npm test` in the repository root for the server, and `npm ci` and `node --test` in `client/` and in `perf/`. The client screens start with `npm run dev` in `client/`, but the server on main serves only its health check, so they have no API to call. The screens were built and checked against a stand-in of the API contract, which is not part of the repository |
| Date submitted | 16 October 2026. The university extended the M3 deadline from 14 to 16 October 2026 in an announcement from the university |

## 27.2 Overview

M3 builds the M1 scope on the M2 baseline, one module at a time, each in its own pull request with its tests (ADR-001). The table gives each area's state on 16 October 2026, the day of submission. "On main" means merged; every other area is in an open pull request, a draft, or not started.

| **Area** | **Requirements** | **Server** | **Client** | **State, 16 October 2026** |
|----|----|----|----|----|
| Sign-in, sessions and the permission check | FR-001, FR-002, NFR-004, NFR-005 | #130 | #133 | On main |
| Password reset | FR-004 | #146 | #134 | On main; review follow-ups in #153 |
| Submission and the requester's views | FR-005 to FR-012 | #131 | #133 | On main (15 October), after DEC-017 was recorded (#154) |
| Workflow, priority, action entries and audit | FR-015 to FR-021, FR-025, FR-026 | #132, folded into #131 | #134 | On main, with #131 |
| Access Matrix correction | CR-002 | #136 | | On main |
| Staff queue | FR-013, FR-014 | #141 (draft) | #134 | Draft |
| Requester notifications | FR-029 | #142 (draft) | #133 | Draft |
| Management reports | FR-022 to FR-024 | #143 (draft) | #134 | Draft |
| User and category administration | FR-003, FR-027, FR-028 | #115, no pull request | #134 | Not started on the server |
| Schema, migrations and seed data | ADR-007 | #140 (draft) | | Draft. Its migrations and seed stand up on a fresh PostgreSQL 16 database (checked 15 October) |
| Bootstrap | ADR-001, ADR-002, CR-004 | #90 | | On main (14 October): the Express application with its health check, the Prisma client and the first migration |
| Persistence adapter and the routes wired into the server | ADR-001, ADR-007 | #108, #109, no pull request | | Not started, so main serves only its health check |
| CI with a blocking test gate | NFR-012 | #110, no pull request | | Not started; the secret scan (#87) is the only workflow |
| Simulated staging and release identification | | #122, no pull request | | Not started |

**Release candidate.** None is tagged, because the classification is NOT READY (s36.2). The submission is main at commit d1af49a, 15 October 2026, which holds the areas marked On main above. Where this document cites evidence from a pull request still in review, it names the pull request.

**Current status.** Each module is built and tested on its own, at component level and through its HTTP handlers (s32, s33). Main holds the authorisation policy, the transition table, sign-in, the password reset, submission, the requester's views, the workflow service, the client screens, and the bootstrap with its first migration. The routes are not wired into the server and the persistence adapter does not exist, so main serves only its health check, and the services run over in-memory stores in their tests. There is no integrated release candidate to deploy, and s36 weighs that.

# 28. M2 Baseline Conformance

**1.** This section compares what main holds at commit d1af49a (15 October 2026, s27.1) with the M2 baseline in s18 to s26. It records what was built as the baseline planned it, what was not built, and each significant deviation with its reference. Minor coding choices are not recorded.

## 28.1 Conformance by module and by decision

**1.** All ten module directories that ADR-001 names exist under `src/modules/`: administration, audit, authorisation-policy, identity-access, notification, persistence, reporting, request-access, request-capture and workflow-status. The table gives what each holds, from s27.2.

| **Module (ADR-001)** | **Responsibility** | **State at d1af49a** | **Evidence** |
|----|----|----|----|
| identity-access | Sign-in, sessions, password reset (FR-001, FR-004) | On main: sign-in, session, reset and HTTP handlers | #130, #146 |
| authorisation-policy | Read scope and action checks (ASR-01) | On main | #94 |
| request-capture | Submission, reference generation and validation (FR-005 to FR-009) | On main | #131 |
| request-access | The requester's list and detail (FR-010 to FR-012) | On main | #131 |
| workflow-status | Transition table and workflow service (FR-015 to FR-021) | On main | #93, #132, #131 |
| audit | One audit entry per change (FR-025, FR-026) | On main. The entry is written inside the workflow service's transaction, as ADR-001 rule 3 requires | #132 |
| notification | FR-029 indications | Only the module's index file is on main. The implementation is a draft | #142 |
| reporting | FR-022 to FR-024 | Only the module's index file is on main. The implementation is a draft | #143 |
| administration | FR-003, FR-027, FR-028 | Only the module's index file is on main. The server side is not started. The screens are on main | #115, #134, #135 |
| persistence | Database access and transactions | The module re-exports the Prisma client. The named operations the services expect are not built | #108, #109 |

**2.** The staff queue (FR-013, FR-014) is a draft (#141).

| **M2 decision** | **What the baseline planned** | **State at d1af49a** | **Conforms** |
|----|----|----|----|
| ADR-001 rules 2 and 3 | Authorisation decisions only in the policy module. A status change and its audit entry in one transaction | Both hold in the modules and are tested at component level and at the handler boundary (TC-01, TC-04, TC-18, TC-22) | Yes |
| ADR-001 rules 1 and 5 | Every call enters through the server's entry point. Data access sits behind the persistence module | The route handlers exist per module, but they are not wired into the server, and the persistence module only re-exports the Prisma client. Main serves only its health check, and the services run over in-memory stores that follow the store contract (s30.4) | Not yet shown in a running system |
| ADR-002 stack | Node.js 24, Express 5, Prisma 7 on PostgreSQL, argon2, `node:test`, React with Vite | As planned. `package.json` pins Express 5.2.1, Prisma and its adapter 7.10.0, pg 8.23.0, argon2 0.45.1 and node-cron 4.6.0 exactly, and `engines` is `>=24 <25` with `engine-strict=true` in `.npmrc`. The two overrides s20 describes are in place, deepmerge-ts 8.0.2 and mysql2 3.24.4. The client is in `client/`. One minor addition: dotenv 18.0.4, pinned exactly, for local configuration, which needs no ADR. The campus check is outstanding (RSK-30) | Yes |
| ADR-005 transitions | A declarative table with Strategy guards, one set of rules | On main (#93). Checked against the Status Model register (TC-05) and through the endpoint for every status pair (TC-24) | Yes |
| ADR-006 authorisation | Scope applied at the query for reads, a central policy for actions | On main (#94). Checked against the Access Matrix register (TC-01). 48 of 60 cells are called through their endpoint and 12 at the permission check their routes will use (TC-22) | Yes. Endpoint verification is partial until #115 and #117 |
| ADR-007 data | Seven entities in PostgreSQL, an atomic reference sequence, each change in one transaction | The first migration on main (`20261011014510_init`) creates only the User table, from the full User model. The other entities, the sequence and the seed data are in a draft (#140), which stands up on a fresh PostgreSQL 16 database (15 October). TC-32 has not run | Partly |
| ADR-008 notification | An in-process interface that derives FR-029 indications from persisted evidence | Draft (#142), not on main | Not yet |
| DEC-010 deployment | A Render web service, with the production database deferred to M3 | Nothing is deployed (#122). The production database was not decided in M3 | Not delivered |

## 28.2 Significant deviations

**1. The merge conditions for the bootstrap (CR-004, DEC-016, #129).** *Original:* s20 and s26.2 allowed #90 to merge only after the campus Node check and the RSK-01 proof of concept had passed. *Problem:* the two verification logs on #64 disagreed. The one with a screenshot ran on a member's own machine, on Node 25.9.0 with mock data, and the one reporting a campus run had no output. The proof of concept in #90 also persisted to a table the test created and dropped, which says nothing about the ADR-007 model. *Revised:* a member other than the author runs `npm ci`, `npx prisma generate`, `npx prisma migrate deploy` and `npm test` from a fresh clone on Node 24 against PostgreSQL 16, and posts the output with the operating system, `node -v` and where PostgreSQL ran on #90. The proof of concept creates a User from the ADR-007 model through Prisma, reads it back, accepts the right password and rejects a wrong one with argon2, and removes it, with no `CREATE TABLE` or `DROP TABLE`. CI repeats the check once #110 merges. Gate 3, the campus check, is not closed: it becomes RSK-30 (probability 3, impact 3, exposure 9, Medium, owner Darius Mushi). *Consequence:* Darius Mushi approved CR-004 on 8 October and Tristan Roets on 12 October, and #129 merged. Both conditions were then shown on #90, which merged from head a109702 as commit 481cda8. The environment check was posted by Jean Smit, the reviewer, since Darius Mushi was the author: a fresh clone with no `node_modules` at commit a109702 on Windows 11 (10.0.26200), Node 24.14.0, npm 11.9.0 and PostgreSQL 16.13 on a local cluster with an empty database. `prisma migrate deploy` applied the first migration, `npm test` passed 41 of 41, `npm audit` reported 0 vulnerabilities, and the database held only `users` and `_prisma_migrations` afterwards, with no rows in `users`. An earlier run by Darius Mushi on PostgreSQL 18.6 was recorded as not an exact match, and under ADR-002's amendment it does not count as the check. The RSK-01 test in `tests/rsk01.test.js` meets condition 2. The reviewer rejected its earlier forms three times: it could not fail, because it passed on any database error, it did not parse, and it used a table the test created and dropped. The campus machines have still not been run, and CI will never test their image, which is why RSK-30 stays open. See s29.

**2. The persistence module is not built.** *Original:* ADR-001 rule 5 and ADR-007 place all database access in the persistence module, behind named operations. *Evidence:* each M3 module was built and tested against a stated store contract before the schema (#140) and the operations (#108, #109) were finished, and the module on main only re-exports the Prisma client. The reviewer of #90 flagged that a bare re-export lets other modules query the database directly, against rules 2 and 5, and the module now states that other modules use its named operations. *Revised decision:* none. This is unfinished work, not a changed design, and it is recorded here so that it is not read as one. *Consequence:* main serves only its health check, TC-32 is blocked, and s36 classifies the candidate NOT READY. The operations must satisfy the contract in s30.4. The reviewer also found that Prisma returns ids as `bigint`, which JSON cannot carry, so any handler that returns an id would answer 500. That rule is settled with the schema on #109.

**3. The Access Matrix (CR-002, #92, #136).** *Original:* s8.3 granted four moves that FR-015, FR-020 and FR-021 refuse. *Evidence:* the M2 policy tests found it (s22.2). *Revised:* the register, the test fixtures and s8.3 are corrected to the requirements. *Consequence:* the code never changed, because the policy already denied the four cells. The baseline text was wrong, not the implementation.

**4. ADR-007's User model.** *Original:* the User entity in ADR-007. *Evidence:* it was incomplete for authentication, which writing the schema (#109) showed. The model on main now holds name, role, active, the password hash, the reset-code fields and both timestamps. *Revised:* the model was corrected through the controlled change process. *Consequence:* the defect and its correction are recorded in s35 and the Defect Register (#125).

**5. How a password is reset (FR-004).** *Original:* FR-004 asks for a controlled reset by a single-use link that expires, with one confirmation message whether or not the account exists. *Evidence:* the team has no email channel, because SC-D-01 is deferred, so a link has no way to reach a user. *Implemented:* a Manager-assisted reset with a one-time code (#146). The code works once, expires and is withdrawn after five wrong tries, and a reset ends every earlier session. Every failed sign-in or reset gets the same answer (TC-08 to TC-11, TC-36). *Consequence:* a Manager must be involved, which is weaker than self-service. The public reset endpoint has no rate limit by address. The Manager-assisted reset is recorded as TD-004 in the Technical Debt Register (#144, a draft with changes requested). The missing rate limit by address is not yet recorded there, and s36 lists it. FR-004 is a Should requirement.

## 28.3 Statements in sections 1 to 26 that M3 has overtaken

Sections 1 to 26 are kept as written, so the current position is given here.

| **Where** | **What it says** | **Position at d1af49a** |
|----|----|----|
| s20 and s26.2, DEC-008 | Both ADR-002 conditions must pass before #90 merges | Replaced by the amended conditions of CR-004 (28.2, item 1). Both were shown on #90, which is on main. The campus check is outstanding as RSK-30 |
| s1, the 2.0 row; s26.1; s26.3 | v2.0 is baselined when #95 merges | #95 merged on 9 October 2026, so v2.0 is the M2 baseline |
| s25.1, first row | #90 is open and its merge is gated | On main |
| s20, last table row | React and Vite are added with the first client work | The client is on main (#133, #134, #135) |
| s25.1 and s26.2, #65 | The end-to-end path is not started and moves to M3 | The services behind it are on main and tested at the handler boundary. The routes are not wired and the persistence operations are not built, so the path is incomplete. TC-33 and TC-34 pass only against a stand-in of the API |
| s26.3, conditions 1 and 2 | The production database is chosen in M3. CR-004 is under review | The production database was not decided in M3, and no environment was deployed (s36). CR-004 is approved and merged (#129) |
| s26.2, #47 | Met when a check runs on every pull request to main | The secret scan runs on every pull request, but the ruleset requires no status check, so #47 stays open (s31) |
| s26.2, #27, #36, #37, #48, #49 | Open M1 limitations | All five were still open on 16 October 2026, checked with `gh issue view`. Each is carried forward as s26.2 states it |

## 28.4 What the conformance shows

The decisions that carry the most risk, ADR-005 and ADR-006, are the most closely conformed to and the most heavily tested, each against its register. The weakest conformance is where the pieces join: ADR-007's persistence and ADR-001's rules 1 and 5 hold in design and in component tests, but not yet in a running, integrated system. s36 weighs that.

# 29. Controlled Changes

Five significant changes went through change control in M3 (s12.4). Each is recorded in the Change Requests sheet or the Decision Log of the registers workbook, and each record reached main through a pull request with two approvals. Three were approved and implemented by the submission, and the other two were approved on 18 October 2026. The table gives the state of each on 16 October 2026, and the items below give its reason, its impact and its outcome. Where s16, s26.2 or s26.3 describe one of these changes as it stood in M2, the outcome here is the current position.

| **Change** | **Recorded in** | **Pull requests** | **State at 16 October 2026** |
|----|----|----|----|
| CR-002, the Access Matrix | Change Requests | #92, #136 | Approved and implemented |
| CR-004 and DEC-016, the merge conditions for the bootstrap | Change Requests, Decision Log | #107, #129, #90 | Approved and implemented |
| DEC-017, the submission and workflow details | Decision Log | #131, #154 | Agreed by all three members and implemented |
| CR-005, the changes PED v2.0 makes to sections 1 to 17 | Change Requests | #95 | Proposed at submission. Approved on 18 October 2026, when Darius Mushi agreed on #95 |
| CR-006, five M3 columns in the RTM | Change Requests | #126 | Proposed at submission, and the columns not added. Approved on 18 October 2026, when Darius Mushi agreed on #126, on the condition that completion is counted per acceptance criterion |

**1. CR-002, the Access Matrix (#92, #136).** *Change:* four cells of the Access Matrix are corrected to the requirements. The Manager may not assign, reject or set priority, and the Coordinator may not accept an unassigned request. *Reason:* the four cells granted what FR-015, FR-020 and FR-021 refuse. The ADR-006 tests found it, because they generate a case from every cell (s22.2). *Impact:* the Access Matrix sheet, s8.3 and the test fixture exported from the register. The policy code did not change, because it already denied the four cells, and its list of conflicts is now empty. Four grants the requirements refuse are removed, in line with deny by default under NFR-005. *Outcome:* approved by all three members on #69 on 30 September 2026, and merged in #136 on 13 October 2026. s28.2 item 3 gives the conformance view.

**2. CR-004 and DEC-016, the merge conditions for the bootstrap (#107, #129, #90).** *Change:* the two conditions ADR-002 set before the bootstrap could merge are amended. The campus Node check becomes an environment check that a member other than the author runs from a fresh clone on Node 24 against PostgreSQL 16, which the CI workflow repeats once #110 merges. The RSK-01 proof of concept must persist a User from the ADR-007 model. DEC-016 records the decision and amends DEC-008, and ADR-002 carries a dated amendment that keeps the original conditions in the record. *Reason:* neither original condition could be shown as met, and every M3 implementation issue waited on the bootstrap. *Impact:* ADR-002, DEC-008, the bootstrap and the issues that depended on it. RSK-30 is added for the campus environment, which is still unverified (exposure 9, Medium). *Outcome:* approved by Darius Mushi on 8 October 2026 and by Tristan Roets on 12 October 2026, and #129 merged on 14 October 2026. Both amended conditions were then shown on #90, which merged the same day. s28.2 item 1 gives the detail, and s30.2 the reviews.

**3. DEC-017, the submission and workflow details (#131, #154).** *Change:* four details the M1 baseline left open are decided. The reference is CC- and eight digits in two groups of four, such as CC-4829-1573, drawn from ADR-007's sequence through a keyed permutation, with the key held in configuration. Reported urgency is Low, Medium or High. The title is limited to 200 characters, the description to 4,000 and the location to 300, each counted after trimming. Priority uses the same scale and is set only by a Coordinator, and a Requester sees only the urgency they reported. *Reason:* FR-008 refers to "the agreed format" for the reference, and no baseline artefact stated one. FR-005 and FR-021 require an urgency and a priority with no scale, and the schema limited only the title. *Impact:* FR-005, FR-008 and FR-021, and the code that holds each value in one place: reference.js, validation.js, views.js and the workflow service. DEC-004 is unchanged, so the reference is still unique, never reused, and not a visible counter. *Outcome:* agreed on #131 by Jean Smit and Tristan Roets on 7 October 2026 and by Darius Mushi on 8 October 2026. It was recorded in the Decision Log through #154 on 15 October 2026, and #131, which implements it, merged the same day.

**4. CR-005, the changes PED v2.0 makes to sections 1 to 17 (#95).** *Change:* records seven changes to the M1 sections that CR-001 to CR-003 do not cover: the cover, a Milestone 2 boundary note, a paragraph in s2, reading notes in s10, s13 and s14.2, four references in s17, the removal of an M1 template instruction, and the team's M1 sign-off in s16. Item 1 was widened on 8 October 2026, so that v3.0 and v4.0 update the same cover rows under this change. *Reason:* the M1 sections must stay readable next to the later ones without being rewritten (Master Brief s6). *Impact:* no M1 table changes its content. `tools/ped_fidelity.py --m1-only` lists every difference from v1.0 in sections 1 to 17, and on v3.0 it lists 69, each one named in the PED README. *Outcome:* proposed. Tristan Roets agreed on #95 on 7 October 2026, and to the widened item 1 on 12 October 2026. Darius Mushi's answer was still to be recorded at submission. Darius Mushi agreed on #95 on 18 October 2026, after checking that the changes to sections 1 to 17 are only those the change request lists, and the Change Requests sheet records the approval.

**5. CR-006, five M3 columns in the RTM (#126).** *Change:* adds five columns after column N: the test cases, the expected result, the execution evidence, the defects, and the status of the acceptance criterion. *Reason:* the M3 brief (s12) requires the RTM to carry each implemented requirement through to its test cases, expected result, execution evidence and defect status, and the Final brief (s9) calculates Scope Completion from a status for each acceptance criterion. *Impact:* the RTM sheet only, and every requirement keeps its row. *Outcome:* proposed. Tristan Roets agreed on #126 on 12 October 2026, and Darius Mushi's answer was still to be recorded at submission, so the RTM submitted for M3 does not carry the M3 trace, as s27.1 and s36.1 record. Darius Mushi agreed on #126 on 18 October 2026, on the condition that the Scope Completion Percentage is counted per acceptance criterion, since some requirements hold several criteria in one row. The Change Requests sheet records the approval, and the columns are added for the Final (#128).

**6. Two changes that did not go through a change request.** s28.2 describes two more departures from the baseline, and this item says what each is.

**FR-004's reset is Manager-assisted (s28.2, item 5).** FR-004's criterion describes a single-use reset link. The build issues a one-time code through a Manager instead, because the email channel that would carry a link is deferred (SC-D-01). The team agreed it on #109 and #146, and it is recorded as TD-004. It changes how a baselined requirement is met, so it should have been a change request, and it was not. The criterion is therefore unchanged, and the Final Project counts FR-004 against it as Partially met.
**ADR-007's User model (s28.2, item 4).** The model in ADR-007 lacked the fields authentication needs. Its correction is an amendment to ADR-007, an M2 design record, made on #140 and merged with the integration (#155). No M1 requirement or acceptance criterion changed, so it needed no change request; the defect it corrected is DEF-001.

**What the changes show.** The two approved change requests corrected the baseline where it could not be met or disagreed with the requirements, and each was recorded before the work that depended on it merged. The two that were still proposed at submission show the cost of the two-approval rule: a change one member has not answered stays proposed, and this document reported it as proposed until the answer was recorded.

# 30. Construction and Configuration

## 30.1 Repository strategy

**1.** The controlled repository is https://github.com/PVY-Smit/civicconnect. Main is protected by the ruleset "Protect main" (id 22248862), read back from the GitHub API on 16 October 2026: enforcement active on `refs/heads/main`, last updated on 4 September 2026, the day it was created, so it has not changed since. It holds a pull request for every change, with two approving reviews and stale approvals dismissed on push, linear history and no force pushes. `current_user_can_bypass` reads `never`, so it binds administrators too (s12.2). The ruleset has no required status check, which s31 states plainly.

**2.** Branches are named `type/issue-number-short-description` (CONTRIBUTING.md), and each pull request covers one issue and uses the pull request template, which asks for the registers touched, the AI-assistance declaration and what the reviewer should focus on. M3 branches follow the convention, for example `feat/111-sign-in-authorisation`, `fix/92-access-matrix-correction`, `test/124-performance` and `docs/107-cr-004-bootstrap-conditions`. Two M2 branches do not: #99 (`docs/ped-s21-s23-tristan-v2`) and #103 (`feature/s24-ped-documentation`) carry no issue number. They are the same limitation as #37, which was still open on 16 October. s27.2 lists each M3 area with its pull requests, so they are not repeated here.

**3.** Contribution evidence in the repository is attributed by GitHub account, and two of the names shown there differ from the registered names, so the accounts are mapped here. The pull requests and reviews cited in this document carry the GitHub names in the last column.

| **Registered member** | **Student number** | **GitHub account** | **Name shown on GitHub** |
|----|----|----|----|
| Jean Smit | 600368 | PVY-Smit | J. S. |
| Tristan Roets | 601764 | Tristan0852 | None set |
| Darius Mushi | 577982 | MrRobottos | Darius Ramaripa |

## 30.2 Review evidence

**1.** The review of the bootstrap (#90) shows review changing the work. The reviewers requested changes four times before approving, and the findings were real defects:

*The first review.* `engines` demanded Node `>=24.21.0`, which the reviewer's own Node 24.14.0 and possibly the campus machines fail, `dotenv` was imported in three files but not declared, and "Checks pass" was ticked although no workflow existed. A failed assertion in the health test would also have left the server open and hung the run.

*The second review.* `npm test` failed from a clean checkout, because a path in `src/lib/prisma.js` was wrong. The RSK-01 test could not fail: it passed on any error from `SELECT 1`, so a database that was not running counted as a pass. The `.env.example` file named a variable the code did not read, so copying it failed.

*The third and fourth reviews.* The test file did not parse, because every Prisma raw call was written with a backslash before the dollar sign, and the fix commit titled "remove syntax errors" left all four in. The proof of concept still had no authentication step and wrote to a table the test created and dropped.

*After the rebase.* Both conditions of CR-004 were still unmet: there was no migration, the test did not create a User through `prisma.user`, the User model differed from ADR-007 and from the draft in #140, and `engines` allowed Node 25. The author fixed each, generating the first migration from the full User model and setting `engines` to `>=24 <25` with `engine-strict=true`. Tristan Roets asked for the same Node restriction and for `npm ci` in the README. Both reviewers then approved.

**2.** The review of #129 (CR-004) shows the same control working on a register change. Darius Mushi requested changes twice before approving. He found that ADR-002 called the bootstrap both #64 and #90, that gate 3 still read as a live blocker, that CR-004's register row made the pull request's own merge its approval, that DEC-016 named only one of the two amended conditions, that DEC-008 still stated the original conditions as live, that the proof of concept's timebox had passed, and that RSK-30 claimed a CI control that had not merged. The author fixed each, and CR-004 now records both approvals with their dates.

**3.** The review of this document's own pull request (#145) led to the 3.0 row's date matching the cover, a shorter cover status line, the build refusing to run with `--submission` while any placeholder remains, the expected `--m1-only` count recorded in the PED README, and sections s28 and s29 moving to different owners, in line with the authorship rotation in s12.1 and RSK-07.

**4.** Every M3 change reached main through a pull request, and 52 pull requests had merged by 16 October. The two direct commits to main in s12.2 predate the ruleset.

## 30.3 Configuration and secrets

**1.** No credential, key or token is committed. `.gitignore` excludes `.env`, key and certificate files, and `.env.example` carries placeholder values only, naming `DATABASE_URL` and `PORT`, the variables the code reads (NFR-007, RSK-11). The application reads every environment-specific value through `src/lib/env.js` (s24), and on the hosted service they are injected at the container instance, not held in code. The generated Prisma client in `src/generated/` is git-ignored, since `prisma generate` rebuilds it from the schema.

**2.** Secret scanning and push protection are enabled on the repository. A workflow also runs Gitleaks on every pull request and on every push to main, checking out the full history (`.github/workflows/secret-scan.yml`, #87). NFR-007 asks for a full-history scan before each baseline. Running `gitleaks detect --source . -v` on main on 16 October 2026 scanned 267 commits, about 2.8 MB, and reported no leaks.

**3.** Environment-specific values and where they differ:

| **Setting** | **Held in** | **Development** | **Planned staging** |
|----|----|----|----|
| Database connection | `DATABASE_URL`, read through `src/lib/env.js` | A local PostgreSQL 16 database | A hosted database. The production database choice is still open (s28.2) |
| Session signing secret | Environment variable. The service refuses to start with one shorter than 32 characters | A local value, never committed | A distinct value held on the host |
| Node version | The `engines` field, `>=24 <25`, with `engine-strict=true` in `.npmrc` so that an install on another version fails | 24 | 24 |
| Instances | Host setting | 1 | 1, because node-cron needs a single instance (RSK-26, s24) |

No value is recorded here or in the repository.

**4.** Test data is generated, never copied from real people (RSK-10, FEC-04): the seed data (#140) and the 5,000 requests for the performance run are submitted through the API as a seeded Requester (s34.2).

**5.** Dependencies come from a committed lockfile through `npm ci`, and every one is pinned to an exact version, as ADR-002 records. Two packages pinned by Prisma 7 are overridden to their fixed versions, deepmerge-ts 8.0.2 and mysql2 3.24.4 (RSK-12). The reviewer confirmed the reasoning: mysql2 is needed only by the Prisma CLI and is never loaded at runtime, because the application uses the pg adapter, and `npm audit`'s suggested fix of downgrading to Prisma 6 would have undone ADR-002's pin. `npm audit` reported 0 vulnerabilities on main's lockfile on 15 October.

## 30.4 Implementation notes a maintainer needs

**The policy module is the only place that encodes who may see what** (ADR-001 rule 2). The test fixtures are exported from the Access Matrix and Status Model registers, so a change to either register needs the fixture re-exported (`python tools/export_register_fixtures.py --check`) and TC-01 and TC-05 re-run.

**Services state a store contract.** The in-memory stores in the tests satisfy it, and so must the persistence module's named operations: conditional writes, transactions that roll back the change, its history row and its audit entry together, and comparing a stored reset-code hash as it was read (s36.3). Other modules must not import the Prisma client directly.

**A query that does not use the policy's scope bypasses it** (s22.2). Review and the endpoint tests (TC-22) are what catch a miss, so every new read goes through the policy.

**Input limits come from DEC-017.** Lengths are counted in characters as PostgreSQL counts them, and control characters are refused at every endpoint (TC-25, TC-37).

**Setup is `npm ci`, `npx prisma generate`, `npx prisma migrate deploy` and `npm test`,** against PostgreSQL 16, with `DATABASE_URL` set from `.env.example`. The README gives the four commands.

**Tests use `node:test` for the server and the performance scripts, and Playwright for the two browser journeys** (#123, #138). `tools/check_test_catalogue.mjs --strict` keeps the test catalogue and the tests in step (s32).

## 30.5 AI-assisted work

**1.** AI-assisted contributions are recorded in the AI Usage Register in the registers workbook, with the verification performed and the decision taken. #90's description declares AI assistance, and the reviewer's checks on it are the verification (30.2, item 1): the first version of the RSK-01 test, which could not fail, is an example of AI-assisted output that review rejected until it was rewritten to create a User through `prisma.user`, read it back and check argon2 against the right and a wrong password.

**2.** The drafting of s28, s30 and s31 was AI-assisted, and its entry is in the register. Every statement was checked against the repository: the module listing, `package.json`, `.npmrc`, the ruleset read back from the API, the Gitleaks run, the state of issues #27, #36, #37, #48 and #49, the review history of #90 and #129, and the workflow file. An early draft of s28 described the persistence module as an empty directory and the first migration as wider than it is. Checking the reviewer's comments on #90 corrected both.

**3.** A test written with AI assistance is accepted only once it has been seen to fail for the right reason (s32.2).

# 31. CI and Automated Verification

**1.** At submission one workflow runs in CI: the secret scan (#87). No workflow builds the application or runs its tests (#110 is not started), and the ruleset on main requires no status check. The automated tests were run by hand and each pull request records its run. This section states what that does and does not show.

## 31.1 Pipeline

**1.** The workflow is `.github/workflows/secret-scan.yml`, and it is the only file in `.github/workflows/`. It runs on every pull request and on every push to main, with read-only permissions. It checks out the full history and runs Gitleaks (`gitleaks/gitleaks-action`). It has passed on each run, and the checks panel of #90, #129 and #145 each shows it as the one check, passed. GitHub's own secret scanning and push protection are enabled alongside it (NFR-007).

**2.** The checks below are run by hand from the repository root, `client/` and `perf/`, and each pull request records the result. They were last run together on main at d1af49a on 15 October 2026.

## 31.2 Automated checks and results

| **Check** | **How it runs** | **Result** | **Evidence** |
|----|----|----|----|
| Secret scan | CI, every pull request and push to main | Passes | #87, #90, #129, #145 |
| Full-history secret scan, `gitleaks detect` | By hand, on main | 267 commits scanned, no leaks, 16 October 2026 | s30.3 |
| Environment check under CR-004, fresh clone | By hand, by a member other than the author, posted on #90 | `npm ci`, `prisma generate` and `prisma migrate deploy` succeed, `npm test` 41 of 41, `npm audit` 0. Windows 11, Node 24.14.0, npm 11.9.0, PostgreSQL 16.13, commit a109702 | #90 |
| Server tests (`node --test`) | By hand | 132 pass | s32.3 |
| Client tests | By hand | 34 pass | s32.3 |
| Performance-script tests | By hand | 13 pass | TC-35 |
| Stack smoke test against PostgreSQL 16.13 | By hand, local database | Passes | TC-39 |
| API suites at the handler boundary | By hand, on #147's branch rebased on main | 385 pass, 3 todo for endpoints not yet built | s33.2 |
| Test catalogue check, `--strict` | By hand | Fails on main for one reason: #90's two tests have no record until #151 adds them | s32.3 |
| Dependency check, `npm audit` | By hand | 0 vulnerabilities, with two overrides (RSK-12) | s36.1 |
| Static analysis | None configured | | s36.1 |
| Coverage percentage | Not reported | | s32.4 |

## 31.3 Gate rules

| **Control** | **What it stops** | **State** |
|----|----|----|
| Two approvals from non-authors, stale approvals dismissed | A merge nobody else has read | Enforced by the ruleset. Approvals were dismissed and re-given when #129 was rebuilt on main |
| Linear history, no force pushes to main | Rewriting the controlled history | Enforced by the ruleset |
| Secret scan | A committed secret | The workflow runs, but it is not a required status check, so a failing scan would not stop a merge (s36.1) |
| Build and tests | A failing build or test | Not configured (#110) |

**1.** The M3 brief asks for at least one meaningful failure that blocks progression. The only control that blocks a merge today is the approval rule. It did block: the reviewers of #90 withheld approval four times, on a failing `npm test`, a test that could not fail and a test file that did not parse, each found by running the code from a clean checkout. That is evidence that review works as a gate. It is not a configured check, because a person had to notice, and the team's own record shows that it took several rounds. No failing automated check that blocked a merge is cited in this document. This is a gap, and s36 records it as a blocker.

## 31.4 What the evidence shows

**1.** A green secret scan shows that no secret pattern the scanner knows was committed in that change. It does not show that no secret is present, and it says nothing about whether the code works.

**2.** The hand-run suites show that the critical rules hold at component level and at the HTTP boundary, and the fault checks in s32.2 show that each new test fails when the defect it guards against is put back. The environment check on #90 shows that the stack installs and its tests pass on one clean machine, run by a member other than the author. They do not stop a failing change from merging. The assessor can see the runs only through the test catalogue and each pull request's record. They are weaker than CI evidence, and the release classification reflects that.

**3.** Nothing here runs against the real database through the API (TC-32), on a deployed server, or on the campus image (RSK-30). A passing run of these checks would not show that.

**4.** The team's rule for a test that fails intermittently is to find and fix the cause, never to rerun it until it passes.

## 31.5 What would close the gap

A workflow that, on every pull request, installs from the lockfiles, builds, runs the tests in the repository root, `client/` and `perf/` and the strict catalogue check, runs TC-39 against a PostgreSQL 16 service and runs `npm audit`, with the secret scan and the test job set as required status checks in the ruleset (#110, #47). This is also CR-004's condition that CI repeats the environment check. It is the first of the conditions for CONDITIONALLY READY in s36.2.

# 32. Quality Strategy Applied

Verification effort follows what a failure would cost. The behaviour that decides who may see or change a request, how a request moves between statuses, and whether a change leaves its audit entry is tested most heavily, at more than one level. Behaviour whose failure is visible and recoverable, such as the layout of a screen, is tested more lightly.

The test catalogue (`docs/quality/test-catalogue.md`, #126) is the record of this. Each record is one designed test case with the fields the M3 brief lists in s11: test basis, why selected, technique and level, input, expected result, actual result, status, evidence, traceability and interpretation. Under each record are the automated tests that carry it. The brief's Meaningful Test Rule (s9) counts designed cases and excludes tests that only add to a count, so the 60-cell Access Matrix decision table is one record with 60 checks, and the catalogue counts it once. `tools/check_test_catalogue.mjs` runs every listed test and reports, per record, how many pass, fail or are still to do. With `--strict` it fails on a failed test, on a listed test that does not exist in its file, and on a test that no record lists. `--strict` alone reports a missing test file, or a test from a pull request that has not merged, without failing; with `--complete` those fail too. Together the two switches keep the catalogue and the tests in step.

## 32.1 Where verification is strongest, and why

| **Concern** | **Requirements and risks** | **How it is verified** | **Records** |
|----|----|----|----|
| Who may do what, and who may see what | NFR-005, FR-002, FR-011, FR-012 (all Must); RSK-05, RSK-17, RSK-23 | The authorisation policy is tested against the Access Matrix register itself, so a change to either is noticed. Every one of the 60 cells is then called through its endpoint, or, for the three functions whose endpoints are not built yet, at the permission check their routes will use. Another person's request and a request that does not exist get the same answer, and an internal entry is withheld even when the store ignores the visibility condition. NFR-005 asks for verification at the endpoint, so until #115 and #117 add those three routes it is verified there for 48 of the 60 cells | TC-01 to TC-03, TC-11, TC-15, TC-22, TC-23 |
| The status model | FR-016 (Must); RSK-09, RSK-16 | The transition table is compared with the Status Model register. Every ordered pair of the seven statuses is then tried through the endpoint, with what is written checked for each (s33.1) | TC-05 to TC-07, TC-24 |
| A change and its audit entry | FR-025, FR-026 (Must); RSK-19; ADR-001 rule 3 | A failure while writing the audit entry rolls back the change and its history row. No function edits or deletes an audit entry | TC-04, TC-18 |
| Signing in and resetting a password | FR-001, NFR-004 (Must); FR-004 (Should) | Every failed sign-in or reset gets one answer, with the password or code checked against a dummy hash when there is no usable account. A reset code works once, expires, and is withdrawn after five wrong tries, and a reset ends every earlier session | TC-08 to TC-11, TC-36 |
| The request reference | FR-008 (Must); DEC-004, DEC-017 | The keyed permutation is checked on every input of a small domain and on 100,000 consecutive real values, so two sequence values never give the same reference | TC-12 |
| What a user types | FR-007 (Must); DEC-017 | Each length limit is tested at its boundaries, counted in characters as PostgreSQL counts them. Control characters, which PostgreSQL would refuse after validation had passed, are refused at every endpoint | TC-13, TC-25, TC-26, TC-37 |
| Urgency and priority | FR-021 (Must); RSK-22 | Only a Coordinator sets the priority, the reported urgency never changes with it, and the Requester sees only their own urgency | TC-19, TC-34 |

The client screens are tested more lightly, as functions of what the server returns (TC-27 to TC-31), because the server makes every decision again and a wrong screen cannot grant anything. The management reports (FR-022 to FR-024) have no record yet, because their endpoint is not built (#117).

## 32.2 How a test is shown to be able to fail

A test that cannot fail shows nothing. For the services, the API suites and the scripts, each new test was checked by putting back the defect it guards against, one at a time, and confirming that a test then failed. The records name the faults used. For example, the browser journey TC-34 failed when the priority was made to overwrite the reported urgency, which the earlier version of the journey had passed. TC-37's tests failed against the services as they were before the fixes of 8 October. This also answers RSK-14: a test written with AI assistance is accepted only once it has been seen to fail for the right reason.

## 32.3 The M3 minimum

A record whose tests are in a pull request that has not merged is counted from the run on that pull request's branch, as its evidence states.

| **Category (M3 brief s9)** | **Minimum** | **Records** | **Status at 15 October 2026** |
|----|----|----|----|
| Unit or component | 5 | TC-01 to TC-21, TC-27 to TC-31, TC-36, TC-38 | Pass |
| Black-box functional | 5 | TC-05, TC-13, TC-22, TC-24 to TC-26, TC-37 | Pass |
| API or integration | 3 | TC-21 to TC-26 and TC-37 at the handler boundary; TC-39 and TC-32 against PostgreSQL | Pass at the handler boundary; TC-39, a smoke test of the stack, passes against PostgreSQL; TC-32 Blocked until the persistence adapter exists (#109) |
| End to end | 2 | TC-33, TC-34 | Blocked until staging (#122); both pass against a local stand-in of the API |
| Negative, failure or unauthorised | 3 | TC-03, TC-04, TC-09, TC-11, TC-18, TC-22 to TC-24, TC-36, TC-37 | Pass |
| High-priority requirement or risk | 5 | TC-01, TC-05, TC-09 to TC-12, TC-18, TC-22, TC-24 | Pass |
| Black-box techniques | 2 | Decision table, state transition, boundary values, equivalence partitions (s33) | Pass |
| Performance | 1 scenario | TC-35 (s34) | Blocked until staging (#122) |

The statuses are from the catalogue check on main at d1af49a, 15 October 2026. Every record whose tests are on main passes: 132 server, 34 client and 13 performance-script tests, and TC-39 against a local PostgreSQL 16.13. The strict check on main fails for one reason: #90's two tests have no record yet. #151 adds them as TC-38 and TC-39, and with it the strict check passes. TC-22 to TC-26 and TC-37 pass on #147's branch, rebased on main at d1af49a. #147 and #151 are in review.

## 32.4 What the evidence does not show

No line-coverage percentage is reported. The brief does not require one. A percentage shows which lines ran and says nothing about whether a test would notice them behaving wrongly; the fault checks in s32.2 are the evidence for that. What the strict catalogue check does show is that every automated test belongs to a designed case and every designed case has tests that run. Until TC-32 runs, the API suites show the behaviour at the HTTP boundary over an in-memory store whose transactions roll back. PostgreSQL's own behaviour, such as its conditional writes and constraints, is shown only once TC-32 runs.

# 33. Black-Box, Integration and System Validation

The techniques were chosen because the behaviour calls for them, as the M3 brief asks in s10. Each is applied where its conditions hold, and the records name the technique used.

## 33.1 The techniques and why each was used

**Decision table (TC-01, TC-22).** Whether an actor may perform a function depends on two conditions together, the role and the function, and for some functions on a third, whether the request is in the actor's scope. The Access Matrix register is that table: 15 functions by 4 roles. TC-01 checks the policy against it, and TC-22 calls 48 of the 60 cells through their endpoint. Three functions have no endpoint of their own yet (#115, #117), so their 12 cells are checked at the permission check their routes will use, and three todo entries stand for the later endpoint calls. Until those routes are built, NFR-005's verification through the endpoints is partial.

**State transition (TC-05, TC-24).** What a request may do next depends on its current status. TC-05 checks the transition table against the Status Model register. TC-24 tries every ordered pair of the seven statuses, 49 in all, through the endpoint: 169 checks. Each of the 37 pairs outside the model is tried by all four roles and must answer 409 and write nothing. Each of the 12 moves in the model must succeed, with its history and audit entries, for every role the model names, 17 in all; TC-22 covers the roles it does not name. Further tests cover a target that is not a status, the two final statuses, and a whole life with reassignment, a hold, a resolution, a reopening and a close.

**Boundary values (TC-13, TC-25).** The field limits that DEC-017 fixes are tested at 1, 2, the maximum less one, the maximum, and the maximum plus one: title 200 characters, description 4,000 and location 300. Lengths are counted in characters as PostgreSQL counts them, so a title of 199 letters and one emoji is accepted. That case was added after the boundary suite found that the first version counted an emoji twice, which #131 fixed (968a44f).

**Equivalence partitions (TC-26, TC-37).** Each way a client can send a bad value is one partition, with one representative: blank, missing, the wrong type, an array or an object where one id belongs, an inactive category, a control character in text. Each must be refused with an error on its own field and nothing saved.

**Negative and unauthorised cases (TC-09, TC-11, TC-23).** Every endpoint is called without a session and must answer 401 and write nothing. Failed sign-ins of every kind must give the same answer.

**API testing at the handler boundary.** The API suites (#121) call the real route handlers behind the real authentication middleware, with a signed session cookie for each role, over an in-memory store that evaluates the policy's query conditions and whose transactions roll back. Only the store changes when they run against PostgreSQL (TC-32).

**End-to-end journeys (TC-33, TC-34).** The two journeys the service exists for are driven in a browser with Playwright (#123, #138): a requester submits a request and follows it, and staff take a request from New to Closed with three people each in their own session. They use visible labels and roles, so they fail when what a user sees changes.

## 33.2 Critical scenarios and results

| **Scenario** | **Records** | **Result at 15 October 2026** | **Evidence** |
|----|----|----|----|
| Every role and function through its endpoint | TC-22 | 61 checks pass: 48 cells through their endpoint, 12 at the permission check, and the coverage check; 3 todo for endpoints not yet built | #147 at 9fea651, rebased on main at d1af49a |
| Every status pair through the endpoint | TC-24 | 169 of 169 pass | #147 at 9fea651, rebased on main at d1af49a |
| Field limits and input partitions through the endpoint | TC-25, TC-26, TC-37 | Pass | #147 at 9fea651, rebased on main at d1af49a |
| Calls without a session | TC-23 | Pass | #147 at 9fea651, rebased on main at d1af49a |
| The API suites against PostgreSQL | TC-32 | Blocked: the persistence adapter does not exist (#109) | |
| A requester submits and follows a request | TC-33 | Blocked until staging; passes against a local stand-in of the API | #138 |
| Staff take a request from New to Closed | TC-34 | Blocked until staging; passes against a local stand-in of the API | #138 |

There is no CI run (#110), TC-32 has not run because there is no persistence adapter, and TC-33 and TC-34 have not run against staging (#122). The results above are therefore the M3 evidence for these scenarios.

## 33.3 What the results show

At the handler boundary every built endpoint enforces its Access Matrix cells, every status change outside the model is refused without a write, and no malformed input reaches the store. The end-to-end journeys show that the client follows the server's contract, because the stand-in implements that contract. They do not yet show the real server, its database or its hosting together, which is what TC-32 and the staging run of TC-33 and TC-34 are for, and what s36 weighs if they have not run by submission.

# 34. Performance and Reliability

M3 asks for one small performance exercise that the team can design and interpret (M3 brief s13). The full method is in `docs/quality/performance/README.md` (#124, #139), and each run's raw result, with the environment it ran in, is written to `docs/quality/performance/results/`.

## 34.1 What is measured, and why

**The staff queue (NFR-001, Must).** Staff and Coordinators work from the queue all day, and it reads more data than any other screen. The Coordinator's queue holds every request (FR-013), the largest scope any user has, so it is measured as the Coordinator. Target: the 95th percentile of 20 retrievals of the first page under 2.0 seconds, with 5,000 requests stored.

**Request submission (NFR-002, Must).** A requester who waits too long submits again, and the municipality receives duplicates. Target: the 95th percentile of 20 submissions under 3.0 seconds, from submit to acknowledgement.

**A small concurrent run.** Ten clients read the first queue page in a loop for 30 seconds, to show whether the queue slows or fails under concurrent reads. No requirement sets a target for concurrent use, so none is invented: NFR-001's single-user target is shown beside the result for comparison only.

## 34.2 Workload, data and method

The 5,000 requests are submitted through the API as a seeded Requester, so each gets its reference and its first history row as a real request does. They are spread across the active categories and the three urgency levels, and the Coordinator then rejects one in ten and assigns three in ten, rotating through each category's staff, so the queue holds New, Assigned and Rejected requests.

Each time is taken from just before the request is sent until the whole answer has been read, with Node's high-resolution timer. That is the server's time plus the network between the measuring machine and staging. It does not include the time the browser takes to draw the screen. The 95th percentile is taken by the nearest rank, so the value reported is one that was measured. A run is reported as invalid, and given no verdict, if any operation failed, if an NFR-001 answer was not exactly the first page of the queue, or if it took fewer than the 20 operations the requirements state. Otherwise the unrounded 95th percentile is compared with the target. The tests in `perf/test/lib.test.js` hold these rules in place (TC-35).

## 34.3 Results

No run against the system was possible in M3. There is no staging environment (#122), and the server on main does not yet serve the queue or submission, because the routes and the persistence adapter are not built. NFR-001 and NFR-002 are therefore not measured, and s36 records that.

Before staging exists the scripts were run against the local stand-in of the API used for the client screens, to check the scripts; the system itself was not measured. Those results were written outside the repository and are not evidence. NFR-001 marked its own run invalid, because the stand-in returns the whole queue where NFR-001 times one page, which is the check in s34.2 working as intended. The follow-ups in #150 (in review) make a run wait for the host's health check, record network errors as failed calls, and mark every result as not evidence unless the server names the release it runs.

## 34.4 What this does not show

**Municipal production scale.** 5,000 requests is NFR-001's baselined volume. A municipality accumulates far more over years, and has more staff than ten clients represent.

**Dates spread over time.** The seeded requests are all submitted on the day of the run, so sorting and filtering by date across months is not exercised.

**Writes and reads together.** The concurrent run only reads. Contention between staff changing requests and the queue being read is not measured.

**The screen.** Times are for the API's answer.

**Other hosts and networks.** A result holds for the staging host and the network path recorded with it. A free-tier host that sleeps after a period without requests can answer its first request more slowly than the warm-up shows (s24).

# 35. Defects and Quality Interpretation

The Defect Register records the main defects found during Milestone 3 and links each one to the requirement or evidence it affected, its impact, its fix and any regression evidence.

Several defects were found in the controlled project artefacts rather than only in the running software. These included an incomplete User model in ADR-007 and incorrect permissions in the Access Matrix. The permission defects affected actions such as assigning requests, accepting unassigned requests, rejecting requests and setting priority. These findings were corrected through the controlled change process and are recorded in the Defect Register under #125.

The project also records technical debt separately from defects. Current technical debt includes the controlled fixture re-export, the deferred production database, temporary Prisma advisory overrides and the Manager-assisted password-reset limitations. These items are not treated as completed defects because they are known limitations or work that has deliberately been deferred.

The quality evidence shows that review and testing are finding real problems before release. A passing build or unit test result is therefore not treated as enough evidence by itself. Integration, security, performance and review findings are also considered before a change is accepted.

Where a defect has been fixed, the related test or review evidence should be used to show that the problem has not returned. Any open defect or technical-debt item that can still affect release readiness must remain visible in the registers and be considered again in the final release decision in s36.

Evidence: Technical Debt Register and Defect Register under #125, controlled Access Matrix correction under #136, and the related review and test evidence in the repository.

# 36. Release Readiness

This section brings the evidence of s27 to s35 together into one judgement, as the M3 brief asks in s15. It is written as at 16 October 2026, the day of submission.

**Gate summary.** The design evidence is strong: the services enforce the Access Matrix, the status model and the input rules, and every new test was shown able to fail (s32.2). The integration evidence is weak: nothing has yet run against PostgreSQL, on a deployed server, or through CI.

**Blockers.** Four gaps would each stop a release on their own:

**1.** **No integrated build.** The bootstrap (#90) has merged, but the routes are not wired into it and the persistence adapter does not exist, and the schema (#140) is a draft. Main serves only its health check.

**2.** **No CI test gate.** No workflow builds the application or runs its tests (#110), and the ruleset requires no status check, so neither a failing test nor a failing secret scan blocks a merge.

**3.** **No deployed candidate.** There is no staging environment (#122), so neither critical journey (TC-33, TC-34) nor the performance exercise (TC-35) has run on the integrated system.

**4.** **No verification against PostgreSQL.** The API suites have not run against the database (TC-32), so its conditional writes, constraints and id handling are unverified.

**Accepted limitations.** These do not block a release. The Manager-assisted password reset is recorded as TD-004 in the Technical Debt Register, which is in a draft with changes requested (#144). Two further limitations are not yet recorded there and are to be added under #125: rate limiting by address on the public reset endpoint, and a check against common passwords. Production-scale performance is also not shown, and M3 does not ask for it.

## 36.1 Release Evidence Summary

| **Evidence area** | **Result** | **Interpretation** | **Concern or action** |
|----|----|----|----|
| Build and CI | Partial. One workflow runs on every pull request: the secret scan (#87), which passes. No workflow builds the application or runs its tests (#110 not started). The ruleset on main requires two approvals, linear history and no force pushes, and no status check | A committed secret fails the scan, which reviewers see, but no check is required, so a failing check does not block a merge. The only blocking gate is the two-approval rule | Make the secret scan, and the build and tests once #110 adds them, required status checks in the ruleset. Until then the suites and the strict catalogue check are run by hand, and each pull request records its run |
| Automated regression | Pass on main at d1af49a (15 October 2026): 132 server, 34 client and 13 performance-script tests, and the RSK-01 test against PostgreSQL. On #147's branch, rebased on main, 385 server tests pass with 3 todo for endpoints not yet built | The critical rules are protected at component level and at the HTTP boundary, and each new test was shown able to fail (s32.2) | They run together only once the pull requests merge and CI runs them (#110) |
| API and integration | Pass at the handler boundary (TC-21 to TC-26, TC-37). Blocked against PostgreSQL (TC-32) | Every built endpoint enforces its Access Matrix cells, every move outside the status model is refused without a write, and no malformed input reaches the store | Run TC-32 once the persistence adapter exists (#109, #140). The database's conditional writes and the id rule are untested until then |
| System and end to end | Blocked. TC-33 and TC-34 pass against a local stand-in of the API; the system itself has not run them | The client follows the server's contract. Nothing yet shows the integrated system completing a journey | Release-blocking until one journey completes on a deployed candidate (#122) |
| Static and security | Secret scan: passes on every pull request. npm audit: 0 vulnerabilities on main's lockfile (15 October 2026), with two overrides for advisories Prisma 7 has not fixed (RSK-12). No static-analysis tool is configured | No secret is committed. The dependency advisories are mitigated by the overrides; there is no upstream fix yet | Add a static check with the CI workflow (#110). Remove the overrides when Prisma fixes issue #30295 |
| Performance | Not measured. The scripts and their method are ready and tested (TC-35) | There is no evidence yet against NFR-001 or NFR-002 | Run on staging with the seeded 5,000 requests (#122, #109); record the limitation if it cannot run |
| Known defects | Defects found in M3 review and testing are fixed in their pull requests with a regression test, for example the character count (968a44f), a NUL character causing a server error (0efac6a), and the assignee id's form (c84b7c1). The Access Matrix defect is corrected under CR-002 (#136). The Defect Register is in #144, a draft with changes requested | No open defect is known to block a release; the blockers above are gaps in integration | Record each defect, its fix and its regression test in the Defect Register (#125) |
| Acceptance evidence | Not yet recorded. CR-006's five RTM columns, which give each acceptance criterion its tests, evidence and status, wait for Darius Mushi's answer on #126 | The test catalogue traces each designed case to its requirements, but no criterion has a recorded status yet | Add and fill the CR-006 columns once CR-006 is agreed, from the catalogue's records |

## 36.2 Classification

**At 16 October 2026: NOT READY.** The brief defines NOT READY as one or more important gates, critical behaviours or release-blocking risks unresolved. Four are unresolved: no integrated build, no CI test gate, no deployed candidate on which a critical journey has completed, and no verification against the database. The evidence for each module on its own is strong, but a release is the integrated system, and that has not yet run.

**What would change it.** CONDITIONALLY READY needs, at least, #140 merged, the persistence adapter built and the services wired into the running server; TC-32 passing against PostgreSQL; a CI workflow that runs the tests and blocks a merge on failure (#110); and TC-33 completing on a simulated staging environment (#122). The performance exercise, the CR-006 statuses and the open drafts would then be stated as conditions.

**At submission: NOT READY, and no release candidate is tagged.** Between 13 and 16 October, #90, #129, #131 and #154 merged, so the bootstrap, the request and workflow services, CR-004 and DEC-017 are on main. None of the four blockers closed: the services are still not wired to a database, nothing is deployed, CI runs no tests, and TC-32 has not run. Tagging a release candidate would claim an integrated build that does not exist, so the submission is main at d1af49a, named as such.

## 36.3 Residual Risks

Testing does not show that no defect exists. These are the uncertainties that remain after M3's verification, each from the Risk Register or the evidence above.

| **Residual risk** | **Why it remains** | **Current mitigation** | **Next action and owner** |
|----|----|----|----|
| The services behave differently against PostgreSQL than against the in-memory store (RSK-21) | The schema is a draft (#140) and the persistence adapter does not exist, so TC-32 has not run | The services state their store contract, including conditional writes and comparing the stored code hash as read; the API suites check the behaviour at the HTTP boundary | Run TC-32 once the adapter exists. Jean Smit |
| The queue and submission are slower on the hosted service than NFR-001 and NFR-002 allow (RSK-02, RSK-18) | There is no staging environment, so neither has been measured; a free-tier host can sleep and answer its first request slowly (s24) | Scripts and method ready and tested (TC-35); the queue reads one page | Run the measurements on staging (#122). Jean Smit |
| The application does not install or run on the BC Desktop campus machines (RSK-30) | The campus check has not been run; CI never tests the campus image | npm ci from a committed lockfile; the engines field to limit Node to version 24 (#90) | Run the campus check when lab access allows and record it on #64. Darius Mushi |
| A dependency advisory affects the build (RSK-12) | Prisma 7 pins two packages with high-severity advisories that no 7.x release has fixed | npm overrides, with npm audit reporting 0 vulnerabilities | Remove the overrides when Prisma fixes issue #30295; add npm audit to CI (#110). Darius Mushi |
| A reset code is guessed by many requests from one address | The public reset endpoint has no rate limit by address | A code is withdrawn after five wrong tries on its account, and every check is a deliberately slow argon2 comparison | Add rate limiting by address, and record it in the Technical Debt Register (#125, #144), where it is not yet entered. Jean Smit |

# 37. Final Product and Release

The Final Project concludes the same project: sections 1 to 36 are kept as written, so the M1 commitment, the M2 decisions and the M3 evidence and classification stay readable as they stood, and this section and those after it record what was finally delivered (Final brief, s1 and s8). Where an earlier section is overtaken, the position here is the final one.

## 37.1 Final submission information

| **Item** | **Value** |
|----|----|
| Team | Jean Smit - 600368 \| Tristan Roets - 601764 \| Darius Mushi - 577982 |
| GitHub repository | https://github.com/PVY-Smit/civicconnect |
| Final commit and tag | [To be completed under #128: the tag v1.0.0, its commit on main, and the date it was made] |
| PED version | v4.0 Final |
| Final RTM | `docs/requirements/CivicConnect_M1_Registers.xlsx`, sheet RTM: columns O to S (CR-006, approved 18 October 2026) give each requirement's test cases, expected result, execution evidence, defects, and the status of each of its acceptance criteria. s38.2 summarises it |
| Product access | The product runs in the simulated production environment described in s41 and `docs/deployment/simulated-production.md`, at https://localhost:8443 on the presenting member's machine. It is demonstrated live from that environment at the release tag. Seeded accounts for each role are configured there and are not published |
| Date submitted | [To be completed under #128] |

## 37.2 The final product

CivicConnect is one Node.js 24 application with one PostgreSQL 16 database, as ADR-001 and ADR-002 decided. The final version integrates every module M2 designed. In M3, main held the services but served only its health check (s36.2). The Final release serves all of them through one entry point, over the database, with the built client from the same origin.

| **Module (ADR-001)** | **In the final product** | **Requirements** | **Evidence** |
|----|----|----|----|
| identity-access | Sign-in, signed sessions, the permission check, the Manager-assisted reset, and limits on failed sign-ins and resets | FR-001, FR-002, FR-004 | TC-08 to TC-11, TC-36, TC-44 |
| authorisation-policy | All 60 Access Matrix cells and the request scope for every query | FR-002, FR-012, FR-013 | TC-01, TC-02, TC-22 |
| request-capture | Submission, validation and the keyed reference (DEC-017) | FR-005 to FR-009 | TC-12 to TC-14, TC-25, TC-26, TC-37 |
| request-access | The requester's list and detail, and the staff detail with the moves the server allows | FR-010 to FR-012, FR-020 | TC-15 |
| queue | The scoped staff queue with search, filters, sorts and paging | FR-013, FR-014 | TC-29, TC-40 |
| workflow-status | Assignment, acceptance, status changes, priority and action entries | FR-015 to FR-021 | TC-05 to TC-07, TC-16 to TC-21, TC-24 |
| audit | One audit entry per changed field, in the change's transaction, append-only in the database | FR-025, FR-026, NFR-011 | TC-04, TC-18 |
| notification | The four FR-029 indications, derived from saved history (ADR-008) | FR-029 | TC-41 |
| reporting | Counts, the breakdown and the overdue list, in the actor's scope | FR-022 to FR-024 | TC-30, TC-42 |
| administration | Accounts with a setup code, deactivation, and the category list | FR-003, FR-027, FR-028 | TC-31, TC-43 |
| persistence | The named operations over Prisma that every module's store contract states (s30.4) | ADR-007 | TC-32 |

Every row is verified end to end as well as by module. TC-32 runs the API against PostgreSQL, from submission to closure, including scope, concurrency, audit, the queue, notifications, reports, administration and the reset. The browser journeys TC-33 and TC-34 run the two critical journeys through the real server. TC-45 checks every screen for accessibility.

## 37.3 What changed between M3 and the final version

| **Change** | **Pull request** | **Effect** |
|----|----|----|
| The schema and seed (#140), the persistence adapter, and every route wired into the server | #155 | Closes the M3 blocker "no integrated build" (s36.2) |
| The staff queue, notifications and reports drafts (#141 to #143), finished with their review findings fixed | #155 | FR-013, FR-014, FR-022 to FR-024 and FR-029 are in the product |
| User and category administration, which was not started in M3 | #155 | FR-003, FR-027 and FR-028 are in the product |
| Two defects the stand-in had hidden: the staff detail carried no moves, and a rejection's reason never reached the requester | #155 | Found by TC-34 against the real server; FR-020 is met (s39.1) |
| Limits on failed sign-ins and resets, security headers, and a health check that probes the database | #155 | Closes the missing rate limit s28.2 and s36 record |
| Simulated production: HTTPS, a least-privilege database role, a runbook, a smoke check, and a tested backup and restore | #155 | The deployment state in s41 |
| The M3 review follow-ups to the client, the performance scripts, the journeys and the reset | #149, #150, #152, #153 | Merged 17 October 2026 |
| [To be completed under #128: the API suites (#147), the catalogue follow-ups (#151), PED v3.0 (#145), CI (#110) and the registers (#144), each with its merge or its status at the tag] | | |

# 38. M1 Scope to Final Delivery

## 38.1 The in-scope commitments

The M1 scope baseline (s6, the Scope Baseline sheet) committed thirteen in-scope items. Each is accounted for here, with its requirements' final status in s38.2.

| **M1 item** | **Requirements** | **Final status** | **Conclusion** |
|----|----|----|----|
| SC-I-01 Authenticated access with four roles | FR-001 to FR-004 | IMPLEMENTED, with FR-004 PARTIALLY IMPLEMENTED | Every role signs in and is held to its permissions. The reset is Manager-assisted instead of a self-service link, because email is deferred (SC-D-01) |
| SC-I-02 Submission with a controlled category, description, location and urgency | FR-005 to FR-009 | IMPLEMENTED | Delivered as committed |
| SC-I-03 A unique, human-readable reference | FR-008 | IMPLEMENTED | CC- and eight digits through a keyed permutation of the sequence (DEC-017) |
| SC-I-04 Requester visibility of their own requests and history | FR-010 to FR-012 | IMPLEMENTED | Delivered as committed |
| SC-I-05 Staff queue with search, filter and sort | FR-013, FR-014 | IMPLEMENTED | Delivered as committed |
| SC-I-06 Assignment and acceptance | FR-015 | IMPLEMENTED | Delivered as committed |
| SC-I-07 Controlled status transitions | FR-016, FR-018 to FR-020 | IMPLEMENTED | Delivered as committed |
| SC-I-08 Internal and requester-visible entries | FR-017 | IMPLEMENTED | Delivered as committed |
| SC-I-09 Coordinator-owned prioritisation | FR-021 | IMPLEMENTED | Delivered as committed |
| SC-I-10 Management counts by category and status | FR-022 to FR-024 | IMPLEMENTED, with one FR-022 criterion Partially met | The counts are verified; the overdue target is configuration, not defined in the status model, and the organisation sets its value (FEC-02) |
| SC-I-11 Append-only audit trail | FR-025, FR-026 | IMPLEMENTED | Enforced in the application and by the database's privileges |
| SC-I-12 Category maintenance and user deactivation | FR-027, FR-028 | IMPLEMENTED | Delivered as committed |
| SC-I-13 In-application notification | FR-009, FR-029 | IMPLEMENTED | Delivered as committed |

## 38.2 Final status of every M1 acceptance criterion

This is the final RTM's status (the RTM sheet, columns O to S, CR-006), summarised by requirement. CR-006 was approved on the condition that completion is counted per acceptance criterion, since some requirements hold several criteria in one row (#126). Each requirement's criterion is therefore split into its GIVEN clauses or sentences, giving 69 criteria from the 42 requirements: 56 functional and 13 non-functional. Each criterion's own status, with its evidence, is in the RTM's column S. Met counts 1.0, Partially met 0.5 and Not met 0.0 (Final brief, Scope Completion Calculation). No change request removed or changed a criterion, so every one is in the denominator.

| **Requirement** | **M1 priority** | **Final status** | **Criteria** | **Evidence** | **Conclusion or reason for variance** |
|----|----|----|----|----|----|
| FR-001 Authentication | Must | IMPLEMENTED | 3 of 3 | TC-08, TC-09, TC-10, TC-11, TC-23, TC-27, TC-32, TC-33 |  |
| FR-002 Role-based access | Must | IMPLEMENTED | 1 of 1 | TC-01, TC-11, TC-22, TC-32 |  |
| FR-003 Account creation | Must | IMPLEMENTED | 2 of 2 | TC-43, TC-32, TC-31 |  |
| FR-004 Credential reset | Should | PARTIALLY IMPLEMENTED | 1 of 2 | TC-36, TC-32, TC-44 | same message whether or not the account exists: Partially met, every failed reset gets one answer and a dummy check (TC-36), but there is no self-service reset request, because the reset is Manager-assisted; a reset link is single-use and expires: Partially met, the Manager-issued code that replaces the link is single-use, expires after 24 hours and is withdrawn after five wrong tries (TC-36, TC-32); there is no link. Not changed through a change request (PED s29 item 6) |
| FR-005 Submission | Must | IMPLEMENTED | 2 of 2 | TC-14, TC-15, TC-32, TC-33 |  |
| FR-006 Controlled category | Must | IMPLEMENTED | 2 of 2 | TC-13, TC-26, TC-43, TC-32 |  |
| FR-007 Validation | Must | IMPLEMENTED | 1 of 1 | TC-13, TC-25, TC-26, TC-37, TC-32, TC-33 |  |
| FR-008 Unique reference | Must | IMPLEMENTED | 4 of 4 | TC-12, TC-32, TC-33 |  |
| FR-009 Acknowledgement | Must | IMPLEMENTED | 1 of 1 | TC-14, TC-33 |  |
| FR-010 Requester's list | Must | IMPLEMENTED | 1 of 1 | TC-15, TC-33, TC-32 |  |
| FR-011 Detail and history | Must | IMPLEMENTED | 2 of 2 | TC-03, TC-15, TC-32, TC-34 |  |
| FR-012 Record isolation | Must | IMPLEMENTED | 1 of 1 | TC-02, TC-15, TC-22, TC-23, TC-32 |  |
| FR-013 Work queue | Must | IMPLEMENTED | 2 of 2 | TC-40, TC-22, TC-32, TC-34 |  |
| FR-014 Search, filter, sort | Must | IMPLEMENTED | 1 of 1 | TC-40, TC-29, TC-32 |  |
| FR-015 Assignment and acceptance | Must | IMPLEMENTED | 3 of 3 | TC-16, TC-22, TC-37, TC-32, TC-34 |  |
| FR-016 Permitted transitions | Must | IMPLEMENTED | 2 of 2 | TC-05, TC-06, TC-07, TC-24, TC-32 |  |
| FR-017 Action entries | Must | IMPLEMENTED | 2 of 2 | TC-20, TC-32, TC-34 |  |
| FR-018 Resolution summary | Must | IMPLEMENTED | 2 of 2 | TC-17, TC-32, TC-34 |  |
| FR-019 Closing | Should | IMPLEMENTED | 3 of 3 | TC-17, TC-22, TC-32, TC-34 |  |
| FR-020 Rejection with reason | Should | IMPLEMENTED | 2 of 2 | TC-17, TC-15, TC-32 |  |
| FR-021 Urgency and priority | Must | IMPLEMENTED | 4 of 4 | TC-19, TC-22, TC-32, TC-34 |  |
| FR-022 Management counts | Must | PARTIALLY IMPLEMENTED | 1.5 of 2 | TC-42, TC-30, TC-32 | overdue uses the single organisation-wide target defined in the status model: Partially met, one organisation-wide target is used, but it is configuration (OVERDUE_TARGET_DAYS), because the Status Model register defines none (FEC-02) |
| FR-023 Breakdown | Should | IMPLEMENTED | 1 of 1 | TC-42, TC-30, TC-32 |  |
| FR-024 Overdue list | Should | IMPLEMENTED | 1 of 1 | TC-42, TC-32 |  |
| FR-025 Audit entries | Must | IMPLEMENTED | 1 of 1 | TC-04, TC-18, TC-24, TC-32 |  |
| FR-026 No audit edit or delete | Must | IMPLEMENTED | 3 of 3 | TC-04, TC-22, TC-32 |  |
| FR-027 Category maintenance | Should | IMPLEMENTED | 2 of 2 | TC-43, TC-31, TC-32 |  |
| FR-028 User deactivation | Could | IMPLEMENTED | 2 of 2 | TC-43, TC-09, TC-32 |  |
| FR-029 Notification | Must | IMPLEMENTED | 1 of 1 | TC-41, TC-32 |  |
| NFR-001 Queue performance | Must | IMPLEMENTED | 1 of 1 | TC-35 |  |
| NFR-002 Submission performance | Must | IMPLEMENTED | 1 of 1 | TC-35 |  |
| NFR-003 Availability | Should | NOT IMPLEMENTED | 0 of 1 | TC-44 | 98% availability, assessed monthly: Not met, the probe target exists (TC-44), but no month of hosted service exists to measure |
| NFR-004 Password storage | Must | IMPLEMENTED | 1 of 1 | TC-36, TC-38 |  |
| NFR-005 Negative access matrix | Must | IMPLEMENTED | 1 of 1 | TC-01, TC-22, TC-32 |  |
| NFR-006 HTTPS | Must | IMPLEMENTED | 1 of 1 | TC-44, smoke check |  |
| NFR-007 Secret scanning | Must | IMPLEMENTED | 1 of 1 | s30.3 |  |
| NFR-008 Personal data | Must | PARTIALLY IMPLEMENTED | 0.5 of 1 | s38 | only the three kinds of personal information, each justified, access governed: Partially met, access is governed and tested (TC-01, TC-22); the inventory justifying each field is in #144, not merged |
| NFR-009 First-time usability | Should | NOT IMPLEMENTED | 0 of 1 | none | 4 of 5 first-time users within 3 minutes: Not met, the moderated task test was not run |
| NFR-010 Accessibility | Should | IMPLEMENTED | 1 of 1 | TC-45 |  |
| NFR-011 Audit completeness | Must | IMPLEMENTED | 1 of 1 | TC-18, TC-32 |  |
| NFR-012 Tests gate every merge | Must | PARTIALLY IMPLEMENTED | 0.5 of 1 | s31 | tests gate every merge: Partially met, the workflow runs every suite (#156); it gates a merge only once it is a required check on main |
| NFR-013 Zero running cost | Must | PARTIALLY IMPLEMENTED | 0.5 of 1 | s41 | zero running cost, limits documented, cost beyond projected: Partially met, zero cost and the free-tier limits documented (s24); the cost beyond the educational context is not projected |

## 38.3 Scope Completion Percentage

| **Criteria** | **Count** | **Sum of final values** |
|----|----|----|
| Functional (FR-001 to FR-029) | 56 | 54.5 |
| Non-functional (NFR-001 to NFR-013) | 13 | 9.5 |
| All approved M1 criteria | 69 | 64 |

Scope Completion Percentage = 64 / 69 x 100 = **92.8 percent**, in the brief's 90 to 100 percent band. [To be completed under #128: recalculated at the tag, after #147, #157 and #156 merge and NFR-008, NFR-012 and NFR-013 are final]

Every functional criterion is met except three, which are half met: FR-004's two and FR-022's second. Five non-functional criteria are not fully met. Each is set out in s38.4.

## 38.4 Criteria not fully met

**Must-have criteria.**

**FR-022, the target's source.** The counts use one organisation-wide response target, as the criterion asks, but the target is configuration (`OVERDUE_TARGET_DAYS`, 10 days in simulated production), because the Status Model register defines none. The organisation's real value is FEC-02's open question. *Consequence:* overdue counts are only as right as the configured value; the counts themselves are verified (TC-42).

[To be completed under #128: NFR-008, NFR-012 and NFR-013, each with its final status and reason at the tag]

**Should-have criteria.**

**FR-004, the reset.** A Manager issues a one-time code instead of the user requesting a link, because the email channel is deferred (SC-D-01). The code keeps what the criterion protects: it works once, expires, and every failure gets one answer. There is no self-service request and no link, and no change request changed the criterion (s29, item 6), so both criteria count as Partially met. *Consequence:* a user who forgets their password needs a Manager; two seeded Managers mean a Manager can always be reset.

**NFR-003, availability.** The target is 98 percent of service hours, assessed monthly. With no hosted service running for a month (s41), it cannot be measured, so it is Not met. The health check it would probe answers 503 when the database is unreachable (TC-44).

**NFR-009, first-time usability.** The moderated test with five first-time users was not run, so it is Not met. *Consequence:* whether residents can submit unaided is unknown, which s41 names as a reason not to go live.

## 38.5 Deferred and out-of-scope items

These were outside the committed scope at M1 and stayed outside it. They are not failed commitments, and none was quietly added or dropped.

| **Item** | **M1 status** | **Final status** | **Conclusion** |
|----|----|----|----|
| SC-D-01 Email or SMS notification | Deferred | Still deferred | The in-application indication (FR-029) meets the commitment. A channel needs a background worker the free tier does not give (FEC-03), and its absence is why the reset is Manager-assisted (FR-004) |
| SC-D-02 Attachments | Deferred | Still deferred | Storage, scanning and cost were never resolved |
| SC-D-03 Per-category targets | Deferred | Still deferred | One organisation-wide target, as configuration (FR-022) |
| SC-D-04 Analytics and export | Deferred | Still deferred | The counts and breakdown meet the management need |
| SC-D-05 Multi-site separation | Deferred | Still deferred | The scope rule in the policy is the one place it would change (FEC-01) |
| SC-D-06 Bulk import | Deferred | Still deferred | Depends on SC-O-01 |
| SC-O-01 to SC-O-06 | Out of scope | Out of scope | Migration, channel integration, native apps, payments, anonymous submission and vendor SLAs remained excluded |

## 38.6 Controlled and uncontrolled change

Every change to the baseline went through change control (s29) except one. FR-004's reset became Manager-assisted in M3, agreed on #109 and #146 and recorded as TD-004 and in s28.2, but no change request changed the criterion. It is therefore counted against the unchanged criterion, as Partially met, and not treated as an approved change. CR-002 changed the Access Matrix, and CR-004 the bootstrap's merge conditions; neither changed an acceptance criterion. DEC-017 fixed what the baseline left open without changing any criterion.

# 39. M3 Issues to Final Closure

## 39.1 Defects

The Defect Register (#125) holds each defect with how it was found, its fix and its regression test. [To be completed under #128: the Defect Register's final rows from Tristan Roets, with DEF-001 to DEF-005 from M3 and the defects found in the Final]

The Final's defects were found by running the product as a whole, which the stand-in of M3 could not do:

| **Defect** | **Found by** | **Fix** | **Regression test** |
|----|----|----|----|
| A rejection's reason never reached the requester (FR-020) | TC-34 against the real server | #155 | TC-15, TC-32 |
| The staff detail carried no moves, so the staff screen offered no actions | TC-34 against the real server | #155 | TC-15 |
| The account-event check constraint refused the administration events | TC-32 | #155, a migration | TC-32 |
| The queue's date fields showed no focus ring on their calendar button (NFR-010) | TC-45 | #155 | TC-45 |

## 39.2 The M3 blockers and failed checks

s36.2 classified the M3 candidate NOT READY on four blockers. Their final status:

| **M3 blocker** | **Final status** | **Evidence** |
|----|----|----|
| No integrated build | Resolved | Every module served through one entry point over PostgreSQL (s37.2), TC-32 |
| No CI test gate | [To be completed under #128: resolved if #110 is a required check on main at the tag] | |
| No deployed candidate on which a critical journey has completed | Resolved in simulated production | TC-33 and TC-34 pass against it over HTTPS (s41) |
| No verification against PostgreSQL | Resolved | TC-32, and the journeys against the database |

## 39.3 Residual risks

The Risk Register holds each risk's final status. [To be completed under #128: the final status of each risk from its owner, with Tristan Roets's fifteen from Tristan Roets's closure and the others from Jean Smit and Darius Mushi]

## 39.4 Technical debt

| **Debt** | **Final status** |
|----|----|
| No rate limit by address on sign-in and the reset (s28.2, s36) | Repaid in #155 (TC-44) |
| [To be completed under #128: TD-001 to TD-004 and the debt found in the Final, from the Technical Debt Register] | |

# 40. Final Acceptance Evidence

## 40.1 Critical requirements traced to the final product

The final trace, from the stakeholder's need to the final outcome (Final brief, s9), for three requirements on which the platform's purpose depends.

**FR-012, record isolation.** *Need:* a requester's report about their street or property is not seen by another requester (STK-01, RSK-05). *Criterion:* requester A cannot retrieve B's request by any route. *Decision:* ADR-006 applies the scope in the query, so a request outside it is never loaded. *Implementation:* `scopedWhere` in the policy, used by every lookup in request-access, the workflow, the queue and the reports. *Evidence:* TC-02 and TC-15 at component level, TC-23 for calls without a session, TC-32 through PostgreSQL, where another requester and Staff outside the category get exactly the answer a missing reference gets. *Status:* Met.

**FR-016, permitted transitions.** *Need:* every request moves through one agreed model, so its status means the same to everyone (FEC-02). *Criterion:* every allowed move succeeds for an authorised role and every other move is refused. *Decision:* ADR-005's declarative table, tested against the Status Model register. *Implementation:* `transition-table.js` and the workflow service, with the conditional update that refuses a move made from a state that has changed. *Evidence:* TC-05 against the register, TC-24 through the endpoint for every pair, TC-32 for two concurrent moves of which exactly one is written. *Status:* Met.

**FR-025, the audit trail.** *Need:* the municipality can show who changed what and when (STK-04, NFR-011). *Criterion:* each change of status, assignee or priority creates exactly one complete audit entry. *Decision:* ADR-001 rule 3, the entry in the change's transaction, and ADR-007's audit immutability. *Implementation:* `audit.js` builds the entries and the persistence module writes them in the same transaction; the application's database role cannot update or delete them. *Evidence:* TC-18, TC-32 row by row through PostgreSQL, and the role's refusal in simulated production (s41.2). *Status:* Met.

## 40.2 Re-verification at the final version

[To be completed under #128: the runs at the tag. The server, client and performance-script tests; the catalogue's strict check; TC-32 against PostgreSQL; the smoke check, TC-33, TC-34 and TC-45 against simulated production at the tag; npm audit; and the full-history Gitleaks scan]

# 41. Final Deployment and Go-Live Decision

## 41.1 Final deployment state

**Simulated production.** The final release runs in a production-like environment separate from development, with release identification, production-like configuration, controlled secrets and deployment verification, as the Final brief describes for that state. It is not deployed to a hosted production service. The decision and its evidence follow.

## 41.2 The simulated production environment

| **Brief asks for** | **What the environment has** | **Evidence** |
|----|----|----|
| Separated from development | A fresh clone at the release tag, its own database used by nothing else, its own address, and its own secrets | `docs/deployment/simulated-production.md` |
| Release identification | `RELEASE` set to the tag, shown by `/health` | Smoke check |
| Production-like configuration | `NODE_ENV=production`; HTTPS only, with plain HTTP redirected and HSTS; Secure cookies; the server connecting as `civicconnect_app`, which has no DELETE anywhere and only SELECT and INSERT on the audit, history, entry and event tables | Smoke check; as `civicconnect_app`, UPDATE and DELETE on `audit_entries` are refused with permission denied |
| Controlled secrets | Generated for this environment, held outside every working tree, never used elsewhere | Runbook, step 2 |
| Deployment verification | A backup before each deployment; the smoke check (seven checks) and the journeys after it | 17 October 2026: smoke check 7 of 7, TC-33, TC-34 and TC-45 pass, as the restricted role, over HTTPS |
| Recovery | A backup restored into an empty database matched the original row for row, and served the journeys | `tools/backup.mjs`, 17 October 2026 |

The rehearsals found two deployment faults, both now handled in the runbook. Under `NODE_ENV=production`, `npm ci` skips the build tools. A running server holds its native modules open, so the install must follow stopping it.

## 41.3 The go-live decision: no-go for hosted production

The team does not release to a hosted production service. The product is integrated and verified (s37, s40), so remaining at simulated production is a decision on the evidence below. The blocking concerns:

| **Blocking concern** | **Requirement or risk** | **Likely consequence of releasing** | **What must be resolved before go-live** |
|----|----|----|----|
| The free-tier host DEC-010 chose sleeps after 15 minutes idle and takes about a minute to wake (s24) | NFR-002, NFR-003, RSK-02 | The first requester after a quiet period waits about a minute to submit, twenty times NFR-002's limit, and may submit twice (STK-01) | A host that does not sleep within service hours, which has a cost (NFR-013) |
| No production database was decided. Render's free PostgreSQL, the one evaluated, expires 30 days after creation, is deleted 14 days later, and has no automated backups (s24, DEC-010) | ADR-007, RSK-20, NFR-008 | Every request, with the personal information in it, is lost when the database expires or fails | A managed database with backups and a tested restore, and its cost agreed |
| The cost beyond the educational context is not agreed with the sponsor | NFR-013, CON-03 | A service the municipality cannot fund is withdrawn after go-live | The projected cost recorded and accepted |
| [To be completed under #128: CI as a merge gate (NFR-012), if it is not a required check at the tag] | NFR-012 | | |
| First-time usability is unmeasured | NFR-009 | Residents who cannot complete a submission return to the phone and WhatsApp channels the platform exists to replace | The five-participant task test |

Releasing on the free tier would meet the deadline at the cost of the stakeholders the platform serves: requesters who wait or give up, and an organisation whose records can be lost. The product is ready to deploy. What is missing is a production environment that meets NFR-002, NFR-003 and NFR-013.

## 41.4 What would change the decision

A paid host that stays awake in service hours, a managed PostgreSQL 16 database with automated backups, the projected cost accepted by the sponsor, and the usability test passed. With those, the release at the tag would deploy by the same runbook, with a certificate from the host in place of the self-signed one.

# 42. Project Reflection and Conclusion

## 42.1 The original problem

M1 described an organisation whose service requests arrived through email, telephone calls, WhatsApp messages, spreadsheets and paper records, with no single controlled record, no accountability for who held a request, and residents who could not see what had happened to their report (s3). The final product addresses each of those directly: one controlled record per request with an unguessable reference; a queue that shows every request in the staff member's scope; assignment, status and priority changes that are each audited; and a requester who sees their request's history and is notified of each change that concerns them. What it does not yet do is reach a resident by email or SMS (SC-D-01), or run where residents can reach it (s41).

## 42.2 Scope

[To be completed under #128: the Scope Completion Percentage from s38.3 and what it shows]

## 42.3 Quality

The strongest evidence is the integrated product verified end to end: TC-32 through PostgreSQL and the three browser journeys through the real server, each shown to fail when the behaviour it guards is broken. Every behaviour that decides who sees what, how a request moves, and whether a change is recorded is tested at more than one level. What remains uncertain is everything the environment decides: behaviour on a hosted service, availability over a month, and real users' first experience.

## 42.4 Engineering decisions and their consequences

**ADR-001, the modular monolith.** Each module was built and tested against a stated store contract while the database was still a draft. That let the modules be finished in parallel in M3, and it made integration in the Final mostly a matter of writing the persistence adapter once; the services ran unchanged against PostgreSQL. The cost was visible too: building against an in-memory store and a stand-in API hid two defects until the real server ran (s39.1). The team would keep the decision and integrate earlier.

**ADR-006, authorisation as a policy with query scopes.** One module decides every permission and every scope, so the queue, the reports and the notifications, added late, inherited correct scoping by calling `scopedWhere`. The one gap, reports ignoring a Manager's scope, was found in review and closed by the same call. It also kept CR-002's correction to four cells a change to data rather than code.

**ADR-007, data and persistence.** [To be completed under #128: Tristan Roets's paragraph]

**ADR-008, notifications.** [To be completed under #128: Tristan Roets's paragraph]

## 42.5 Team and project execution

What most affected delivery was integration timing, and behind it review capacity. The two-approval rule (DEC-012) worked as a control: reviews changed the bootstrap four times and found real defects in every module. With three members it also meant one member's absence stopped every merge, which is RSK-04 and RSK-07 materialising, and it is why the M3 candidate was not integrated. The Final integrated every module once another member took over the schema, with its author's commits kept and the result reviewed by its author (#155).

## 42.6 Future work

If the project continued: host it on a paid service with a managed database and automated backups (s41.4); run the usability test (NFR-009) and measure availability for a month (NFR-003); add the email channel (SC-D-01), which also gives a self-service reset (FR-004); and move the failure limits to a shared store before running a second instance (RSK-26).

## 42.7 Conclusion

[To be completed under #128: one evidence-based paragraph on what the project achieved and what remains, written once the percentage and the final runs are in]
