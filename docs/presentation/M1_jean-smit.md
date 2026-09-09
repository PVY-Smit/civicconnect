# M1 presentation — Jean Smit's segments

Working script for the two segments allocated to me in the close-out plan. Not a controlled
baseline artefact: PED v1.0 and the registers are the controlled outputs, and this is
superseded once the milestone is presented.

Tristan and Darius add their own files alongside this one (`M1_tristan-roets.md`,
`M1_darius-mushi.md`) rather than editing a shared file, so three people can prepare in
parallel without colliding.

**Allocation** (close-out plan s4): I open with problem/stakeholders/scope/constraints and
close with governance/controlled change/the gate. Darius takes requirements, acceptance
criteria and the RTM trace. Tristan takes risk and forward engineering considerations.

**Budget:** 12–15 minutes of team evidence across four segments. Mine are ~4 minutes each.
Individual questioning follows and is not in this budget.

---

## Before I speak

Open and positioned, so no time is lost hunting:

| Tab | On |
|---|---|
| 1 | Registers workbook — Stakeholders sheet |
| 2 | Registers workbook — Scope Baseline sheet |
| 3 | PED v1.0 — s7.1, the constraint chain |
| 4 | GitHub — ruleset "Protect main" |
| 5 | GitHub — Pull Request #18, Files changed not collapsed |
| 6 | Registers workbook — AI Usage Register |
| 7 | PED v1.0 — s16, baseline sign-off |

The brief says slides may guide but must not replace controlled evidence. Everything below
is shown from the live artefact, not from a slide.

---

## Segment 1 — Problem, stakeholders, scope, constraints (~4 min)

Opens the presentation. The job is to answer the milestone's central question — what are we
committing to engineer, for whom, within what constraints — not to narrate the PED.

### Beat 1 — the problem, in one move (~40s)

Do **not** re-read the scenario. The brief says not to rewrite it, and an assessor who wrote
it does not need it read back.

> The organisation does not have a request-handling problem. It has a record problem. A
> request exists across five channels and in none of them completely, so nobody can say what
> was promised, by whom, or whether it happened. Everything in this baseline follows from
> deciding that the system's job is to hold one controlled record of a request's lifecycle.

Then straight into who disagrees about that record.

### Beat 2 — the stakeholder conflict (~90s) — **strongest content, do not rush**

**Show:** Stakeholders sheet, then PED s5.1.

Nine stakeholders, but the one that shaped the baseline is STK-01 against STK-02.

- **STK-01**, a requester ignored across five channels, wants total visibility — including
  who holds the request and what they wrote about it.
- **STK-02**, staff, needs to record candid working notes: site inaccessible, previous repair
  done badly, requester abusive. If those are published, they stop being written.

**The trade-off, stated as a trade-off:** satisfying either side fully destroys the record
the platform exists to create. Full publication produces an empty action log. Full
concealment sends the requester back to the telephone.

**What the baseline does:** splits the artefact instead of picking a side. Every action entry
carries an explicit visibility marking chosen when it is written (FR-017).

**Downstream — say this, it is what separates analysis from a list:** that decision is
DEC-003; it puts a visibility field in the M2 data model, and it creates a case in the M3
negative-test matrix. A stakeholder conflict resolved in M1 becomes a test in M3.

> Answers indicative question 1 directly. If asked "which expectation was hardest to
> reconcile", this *is* the answer — do not invent a second one.

### Beat 3 — scope, defended not listed (~50s)

**Show:** Scope Baseline sheet. Thirteen in, six out, six deferred — say the shape, do not
read the rows.

Defend **one**. Use SC-D-01, email/SMS notification:

- It hurts. FR-029 gives in-application indication only, which is weaker than the stated
  requester need. PED s16.1 limitation 3 says so in writing rather than hiding it.
- It went anyway because it needs an always-on worker or scheduled job — and that is a
  platform capability the team has not yet chosen.

That hands straight into the constraint chain.

### Beat 4 — the constraint chain (~80s) — **the segment's payload**

**Show:** PED s7.1.

One financial constraint, followed honestly through five steps:

```
CON-03  cost: free or low-cost services, no budget to override
   ↓
NFR-003 free tiers idle instances and publish no uptime guarantee,
        so the availability target has to be qualified, not asserted
   ↓
SC-D-01 the same limits restrict always-on workers,
        so notification leaves committed scope
   ↓
DEC-010 background-process support becomes a required criterion
        in the M2 platform decision — not a preference
   ↓
RSK-02  if no affordable platform supports both, the deferral becomes
        permanent and NFR-003 must be revised through change control
```

> One cost constraint changed a quality target, removed a feature from committed scope, added
> a decision criterion for M2, and left a named residual risk with an owner. That is what it
> means to say constraints interact — and every step of it is traceable.

Answers the M1 requirement to explain at least one interaction or ripple effect.

**Hand over to Darius:** "That is what we committed to and why. Darius has how it is written
down so it can be tested."

---

## Segment 4 — Governance, controlled change and the baseline gate (~4 min)

Closes the presentation. The job is to show the controls **operating**, not configured.

### Beat 1 — the repository is a control environment (~50s)

**Show:** live ruleset "Protect main".

- Two approvals required, from members other than the author
- Stale reviews dismissed on push, so an approval always refers to the commit that merges
- Linear history, no force pushes
- **Bypass list empty** — point at this. It binds me, the administrator who created it.

**Show:** PED s12.2, the evidence column.

> Every cell there cites something read back from the live repository, not a claim that the
> setting exists. That distinction is the whole point of the column.

### Beat 2 — the control operating (~70s)

**Show:** Pull Request #18.

- Template in use: linked issue, requirements touched, registers updated, AI declaration,
  and what the reviewer should focus on
- The PR argues for the change and names its own weakest point rather than announcing it

Point at what it says about itself: the AI register row it adds records that Figure 1
understates the decisions FEC-01 and FEC-06 gate. **We found that and wrote it down rather
than quietly correcting the figure.**

> A Pull Request is where a change is argued. That is why review is a control and not a
> formality.

### Beat 3 — AI accountability (~60s)

**Show:** AI Usage Register.

Four rows, each with the verification applied and what was rejected or changed. Use row 3:

- Checked Figure 1 against s11 and the Decision Log, concern by concern
- Found the figure names one gated decision per concern where the Decision Log records two
  for FEC-01 and FEC-06
- Recorded the discrepancy; raised issue #20 for the register half of the fix; left the
  figure as-is because a silent correction before a gate is weaker evidence than a recorded one

> Answers indicative question 9. "AI generated it" is not a defence — the register is where
> accountability stays with the engineer.

### Beat 4 — change control and the gate (~40s)

**Show:** PED s12.4, then s16.

After sign-off, a change to baselined scope, requirements or the status model follows
Master Brief s14: request → impact analysis → decision → authorise → implement → verify →
baseline update. The impact template is already on the Change Requests sheet because a change
request is expected in M3 (RSK-03) — it is planned work, not a surprise.

> Answers indicative questions 2 and 10. The RTM is kept complete precisely so impact analysis
> is a lookup rather than an investigation.

The gate outcome is recorded separately from the mark: accepted, conditionally accepted, or
revision required.

### Beat 5 — name the gaps before being asked (~40s) — **do not skip this**

The brief values honest limitations above claims of completeness. Volunteering these is
stronger than being walked into them, and an assessor can see all three in under a minute.

1. **Repository history is thin and I am not going to pretend otherwise.** Two commits on
   3 September from one author, the controls established on 4 September, and controlled work
   through Pull Requests from 8 September. Work before 4 September predates the controls, and
   the version history in s1 says so rather than implying otherwise.
2. **The two-approval control cost us throughput before it produced anything.** For most of
   the milestone one member's repository invitation sat unaccepted, so nothing could reach two
   approvals and every controlled change queued behind it. That is RSK-04 materialising, and
   FEC-07 records review capacity as a constraint on every controlled change from M2 onward.
   The contingency we wrote says to record the blockage rather than bypass the control, and
   that is what we did.
3. **It then earned its keep.** Review has found real defects, not rubber stamps: the
   registers-updated checklist on one Pull Request was inverted against the actual change; a
   figure defect was recorded inside a register row without being tracked as work, and is now
   issue #27; the two controlled copies of the AI Usage Register disagreed on one member's
   entry; and a governance cell claimed an issue count that had gone stale. Each was corrected
   before merge. Cell C12 cites those reviews as the evidence that the control operates.

> Check the live position before presenting — the number of merged and open Pull Requests
> changes through the day. The argument does not: the control bound us first and caught real
> defects second, which is a working process rather than a decorative one.

---

## Questions I must be able to answer without notes

Any member can be asked about any artefact, so these are not limited to my segments.

| Question | Where I go | The answer in one line |
|---|---|---|
| Hardest stakeholder expectation to reconcile? | s5.1 | STK-01 visibility vs STK-02 candid notes; resolved by per-entry visibility marking (FR-017, DEC-003) |
| Explain one constraint interaction | s7.1 | CON-03 → NFR-003 → SC-D-01 → DEC-010 criterion → RSK-02 |
| Defend one exclusion | s6.4, SC-D-01 | Needs an always-on worker; platform not yet chosen; FR-029 is the weaker interim, and s16.1 admits it |
| Why two approvals from non-authors? | ruleset + CON-08 | Review is a control, not a courtesy; self-approval makes the baseline the author's opinion. With three members it costs throughput — recorded as RSK-04/FEC-07, not hidden |
| Show one AI contribution you changed or rejected | AI register row 1 and row 3 | Row 1: rejected draft decisions that pre-selected a stack, re-recorded as deferred DEC-008–011. Row 3: found and recorded the Figure 1 gating discrepancy |
| A baselined requirement changes tomorrow — what is revisited? | s12.4 + RTM | Change request → impact across RTM, scope, NFRs, status model, risks, and the decisions the requirement gates → authorise → baseline update |
| Client adds a major feature, deadline unchanged? | s12.4 + RSK-03 | Impact analysis first; scope displacement recorded explicitly and approved, not absorbed silently |
| One early shortcut that could become debt? | s16.1 | A single organisation-wide response target instead of per-category (SC-D-03). Cheap now; per-category escalation later means reworking every overdue calculation |
| How will you know CivicConnect succeeded? | s4 | Against the original constraints and stakeholder needs, not whether the URL opens |
| Why does deployment matter in M1 when it is built in M3? | FEC-05, s7.1 | Because the platform decision in M2 closes options: staged rollout and rollback are architectural properties, not configuration added later |

---

## Delivery notes

- **Explain, do not read.** Delivery is marked separately from the evidence.
- **Timing:** 4 minutes each. If running long, Beat 3 of segment 1 compresses to one sentence;
  Beats 2 and 4 do not.
- **Transitions:** hand over by naming what the next person adds, not by saying "over to you".
- **When I do not know:** say so, say where the answer would live, and say what evidence would
  settle it. The brief rewards identifying gaps honestly; it does not reward improvising.
- Point at the artefact on screen while talking about it. Navigating confidently in the live
  artefact is explicitly the difference between high and weak performance in Appendix B.
