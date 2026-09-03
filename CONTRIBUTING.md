# How we work

These rules come from the SEN381 CivicConnect Master Project Brief, section 9, and from
the Team Working Agreement in PED v1.0 section 12.1. They are mandatory engineering
controls, not preferences.

## Branch protection

`main` is protected and represents the controlled product state.

- No direct pushes to `main`, including by repository administrators.
- Every substantive change enters through a Pull Request.
- Two approvals are required, from members other than the author. Self-approval is not accepted.
- Approvals are dismissed when new commits are pushed, so an approval always refers to what is merged.
- Linear history is required, so the controlled history stays readable as evidence.

This applies to documents as much as to code. The PED and the registers are controlled
artefacts and change the same way.

## Branch naming

    <type>/<issue-number>-<short-description>

`type` is one of `docs`, `feat`, `fix`, `test`, `chore`, `refactor`, `security`.

Examples: `docs/14-scope-baseline`, `feat/27-request-submission`, `test/31-status-transitions`.

## Commit messages

    <type>: <what changed and why, in one line>

    <optional body: reasoning, trade-off, or what was rejected>

    Refs: #<issue>, FR-005, RSK-03

Reference the requirement, risk or decision identifier the change relates to. That is what
makes the history traceable rather than merely present.

## One issue per Pull Request

If a reviewer cannot hold the change in their head, it is too large. Split it. An approval
that does not reflect meaningful review may receive no credit.

## Definition of done

A change is done when all of the following are true.

- It is linked to an issue and to a requirement identifier where one applies.
- Every register the change affects is updated in the same Pull Request. If a requirement
  changed, the RTM row changed with it.
- Checks pass.
- Two members other than the author have approved.
- The author merges after approval.

## Review checklist

Master Brief section 9.1. A reviewer evaluates:

- alignment with the requirement and its acceptance criteria
- correctness and design consistency
- maintainability and technical debt
- security and privacy implications
- tests and regression impact
- dependency changes
- documentation and traceability impact
- whether the change belongs in the controlled baseline

A reviewer who cannot tell what the change is for asks rather than approves.

## Review turnaround

A Pull Request receives a first review within 24 hours on a working day. Two review windows
each week are held open by all three members.

This matters more than it looks. With three members and two required approvals, every merge
needs both other members, so one unavailable person blocks all controlled change. This is
recorded as RSK-04 and FEC-07 in the registers. Where an absence is known in advance,
front-load merges before it. Where it is not, record that the merge was blocked and what it
cost, rather than bypassing the control.

## Secrets

No credential, key or token is committed, ever. Configuration needed to run locally is
shared outside the repository. A template with placeholder values is committed as
`.env.example` and nothing else.

If a secret is committed, treat it as compromised and rotate it. Rewriting history does not
undo exposure.

## AI-assisted work

Permitted as an engineering assistant. Material contributions are recorded in the AI Usage
Register in `docs/requirements/` at the time the work is done, not reconstructed later.

No member approves AI-assisted work they cannot explain without the assistant. AI-assisted
changes carry the same branch, review and test controls as anything else.

## Evidence

Repository history is assessed evidence. It must show authentic progression over time.
Bulk uploads or activity reconstructed shortly before an assessment do not demonstrate a
controlled engineering process and may receive limited or no credit.

The practical consequence: commit as you work, not at the end.
