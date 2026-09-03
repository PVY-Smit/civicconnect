# Setting up the CivicConnect repository

Total time: about ten minutes. Local git is already initialised on `main` in this folder.

---

## 1. Create the empty repository on GitHub

On github.com, New repository.

- Name: `civicconnect`
- Private
- Do **not** initialise with a README, .gitignore or licence. This folder already has them,
  and an initialised remote will only cause a merge you do not need.

Then add Tristan and Darius as collaborators with write access:
Settings, Collaborators and teams, Add people.

## 2. First commit, then connect the remote and push

From inside this folder:

    git add .
    git commit -m "docs: add M1 engineering baseline, repository structure and working rules"

    git remote add origin https://github.com/<your-username>/civicconnect.git
    git push -u origin main

## 3. Turn on branch protection - do this immediately after the first push

Settings, Rules, Rulesets, New branch ruleset. Or Settings, Branches, Add branch protection
rule on older layouts.

Target: `main`. Enforcement: Active.

Enable:

- [ ] Require a pull request before merging
- [ ] Required approvals: **2**
- [ ] Dismiss stale pull request approvals when new commits are pushed
- [ ] Require linear history
- [ ] Block force pushes
- [ ] Do not allow bypassing the above settings (include administrators)

That last one matters. A protection rule that administrators can bypass is not a control,
and the bypass shows in the history.

## 4. Enable secret scanning

Settings, Advanced Security (or Code security and analysis).

- [ ] Secret scanning: on
- [ ] Push protection: on

This is NFR-007 and RSK-11.

## 5. Create the project board and the first issues

Projects, New project, Board.

Raise one issue per real piece of work. Suggested first set, drawn from the M1 editing
guide:

- Confirm response target that defines "overdue" with the client (FEC-02, SC-D-03)
- Confirm expected request volume and retention period (FEC-04, FEC-06)
- Agree Part B judgements as a team and record the outcome (PED s10.1, DEC-001 to DEC-012)
- Complete AI Usage Register rows - Tristan
- Complete AI Usage Register rows - Darius
- Complete GitHub governance evidence column in the registers workbook
- Baseline sign-off review (PED s16)

## 6. Record the evidence back into the workbook

Open `docs/requirements/CivicConnect_M1_Registers.xlsx`, GitHub Governance sheet, and fill
the Evidence column with links: repository URL, the ruleset page, the secret scanning
setting, the board, the PR template file, an example review comment.

That sheet is the M1 evidence for the 4-mark governance criterion. Links to live settings
beat screenshots wherever a link exists.

---

## What happens after this

From here, every change to the PED or the registers goes through a branch and a Pull
Request like code. That feels heavy for a document edit. It is also the entire point - most
of the M1 evidence is documentation, and documentation changed outside the controlled
process produces no evidence at all.

One practical warning. Once two approvals are required and there are three of you, every
merge needs both other members. Agree the 24-hour review turnaround in `CONTRIBUTING.md`
before you switch protection on, not after the first time it blocks you.
