# SEN381 Assignment 2: Darius Mushi Contribution

**Project:** CivicConnect\
**Contributor:** Darius Mushi\
**Section:** Task 4, section 4.2: Continuous Integration and quality gates

The text is the version merged into the A2 submission on 15 September 2026. Citation letters follow the submission's consolidated reference list, so a letter can be absent here where that entry is cited only in another member's section.

## 4.2 Continuous Integration and quality gates

### What CI is, and how it differs from version control

Fowler (2024) defines Continuous Integration as a software development practice in which each member of a team integrates their changes into the codebase at least daily, with every integration verified by an automated build, including tests, to detect integration errors as quickly as possible. Version control alone only stores changes; it says nothing about whether the result still builds or still passes its tests. CivicConnect already has version control and branch protection (CON-08, DEC-012), but currently has no automated build or test execution at all. By Fowler's definition, the repository practises controlled version control and does not yet practise Continuous Integration.

CI is also distinct from an automated deployment pipeline. OWASP's CI/CD Security Cheat Sheet separates continuous integration, which focuses on build and testing automation, from continuous delivery and deployment, which promote built code toward staging or production environments (OWASP, no date b). This section covers the CI half, a build-and-test gate on the Pull Request, and does not propose automated deployment.

### What should trigger it

The primary merge-gating trigger should be every push to a Pull Request. This is consistent with the OWASP recommendation of automatic scanning upon each code push (OWASP, 2022), and with CON-08, which already routes every substantive change through a Pull Request. A second verification run should occur when changes reach `main`, following Fowler's (2024) practice that every push to mainline should trigger a build, to confirm that the protected branch remains buildable and testable. CI then adds automated verification to a gate that already exists, without requiring a new workflow.

### What a repeatable build requires

A repeatable build must be able to run from a clean checkout with no manual setup step (Fowler, 2024). This is relevant to DEC-008, because it becomes a concrete criterion for the still-undecided technology stack: whichever stack is chosen must support a deterministic, automated build-and-test process that requires no developer-machine-specific manual steps. Because DEC-008 has not yet been baselined and the technology stack has not yet been selected, this recommendation remains provisional. It constrains what any candidate stack must support, and leaves the choice of stack to DEC-008.

### What checks belong in the pipeline, and which should block or warn

| Check | Should it block a merge? | Reasoning |
|---|---|---|
| Build/compilation | **Block** | A change that does not build cannot be evaluated at all, consistent with Fowler's (2024) practice of making the build self-testing. |
| Must-priority automated tests | **Block** | NFR-012 is already baselined: automated tests covering every Must-priority functional requirement must pass on every Pull Request before merge is permitted. CI enforces that requirement automatically, where today it relies on memory. |
| Secret scanning | **Block** | NFR-007 already sets a target of zero findings from secret scanning. The OWASP CI/CD Security Cheat Sheet states that secrets should never be hardcoded in code repositories (OWASP, no date b), and CICD-SEC-6 explains that a secret pushed to a repository stays in the commit history even after it is deleted from the branch (OWASP, 2022). A leaked credential should be treated as a merge-blocking finding, which enforces the secret-scanning mitigation for RSK-11. |
| Lint/static analysis | **Warn initially** | Useful for catching style and simple defect patterns early, but a team of three students should not lose merge velocity to non-critical style findings while the codebase and conventions are still forming. Specific rules can be escalated to blocking once the team agrees they matter. |
| Dependency and vulnerability scanning | **Warn initially, block on high/critical severity** | Serves RSK-12, whose mitigation calls for automated dependency and vulnerability checking and makes dependency-ecosystem maturity a criterion in DEC-008. A graduated response avoids blocking every merge on a low-severity transitive finding while still surfacing serious risk. |

### Secrets and configuration handling

OWASP recommends using tools such as git-leaks or git-secrets to detect secrets, striving to prevent secrets from ever being committed, and ongoing monitoring to detect any deviations (OWASP, no date b). CICD-SEC-6 adds automatic scanning upon each code push and periodic scans of the repository and its past commits (OWASP, 2022). The cheat sheet also states that, in addition to being encrypted at rest, secrets must not be disclosed or persisted in cleartext as a consequence of their use in the CI/CD pipeline (OWASP, no date b). OWASP does not prescribe whether a detected secret should block or warn. **Our recommendation is to block.** Given RSK-11 and NFR-007's zero-credential-finding target, a leaked secret is compromised when it is pushed, so treating detection as advisory would undercut the requirement the check exists to enforce. This is consistent with CivicConnect's existing controls: `.gitignore` and `.env.example` (NFR-007) establish the prevention side, while CI adds automated monitoring. Secrets should be consumed through the platform's native secret store and must not be printed in build output.

### Results visible to reviewers

Check results, including build pass or fail, test pass or fail, and blocking findings, should appear on the Pull Request as status checks that a reviewer can see before approving. CI then becomes part of the review that CivicConnect's review checklist already requires, where its results are hard to ignore.

### Why automation does not replace human review

CivicConnect's own M1 evidence already shows this. In Pull Request #18, a reviewer found that the PED's mirror of the AI Usage Register still held placeholder content for a completed team member's row while the source workbook held the finished version. Seven of the register's eight cells therefore disagreed between two controlled copies of the same artefact. It was a consistency and evidence problem. Both copies were structurally valid while still disagreeing, so a compiler or automated test suite would not necessarily have identified it.

In Pull Request #25, two reviewers independently caught the version history table asserting that the M1 engineering gate had already been "baselined" while the document's own Baseline Sign-off section was entirely unfilled. This was an internal contradiction between what one part of the deliverable claimed and what another part recorded. Again, the defect was structural and evidentiary, and finding it required a human reader to cross-reference different parts of the artefact.

Published research points the same way. In a review of modern code review research, Yang et al. (2026) report earlier findings that static analysis tools such as PMD address only about 16% of the issues identified in manual reviews (Singh et al., 2017, cited in Yang et al., 2026), and that only about 1% of review comments address security issues (Bacchelli and Bird, 2013, cited in Yang et al., 2026). Automated and human review catch different, only partly overlapping classes of problems, so CI cannot substitute for human review. The Master Project Brief requires approval to reflect meaningful review, and states that rubber-stamping may receive no credit (Belgium Campus ITversity, 2026). FEC-07 records the same point, and RSK-04 and RSK-14 describe the review pressures behind it. This is consistent with the research: automated checks should narrow what a reviewer needs to spend attention on, and a reviewer is still needed.

## References

Belgium Campus ITversity (2026) *SEN381 CivicConnect Master Project Brief*, version 1.1. Software Engineering 381. Belgium Campus ITversity.

Fowler, M. (2024) *Continuous integration*. 18 January. Available at: https://martinfowler.com/articles/continuousIntegration.html (Accessed: 15 September 2026).

OWASP (2022) *CICD-SEC-6: Insufficient credential hygiene*. OWASP Top 10 CI/CD Security Risks. Available at: https://github.com/OWASP/www-project-top-10-ci-cd-security-risks/blob/main/CICD-SEC-06-Insufficient-Credential-Hygiene.md (Accessed: 15 September 2026).

OWASP (no date b) *CI/CD security cheat sheet*. OWASP Cheat Sheet Series. Available at: https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html (Accessed: 15 September 2026).

Yang, Z., Gao, C., Guo, Z., Li, Z., Liu, K., Xia, X. and Zhou, Y. (2026) 'A roadmap on modern code review: challenges and opportunities', arXiv preprint arXiv:2405.18216v2. Available at: https://arxiv.org/abs/2405.18216v2 (Accessed: 15 September 2026).

## AI assistance note for the team register

Taken from section 8 of the A2 submission, which records the review and typesetting of this section. Darius Mushi's own entry for this section is still to be supplied: the submitted section 8 carries placeholders in his row, so nothing is recorded here on his behalf.

| Date | Student | Tool | Engineering task | AI contribution | Verification | Decision | Issues found |
|---|---|---|---|---|---|---|---|
| 15 Sept 2026 | Jean Smit | Claude (Anthropic), Claude Code | A2 review and typesetting of Task 4, section 4.2 (Darius Mushi) | Checked the section against every cited source, register entry, pull request and commit it relies on; typeset it; corrected citations and register references; removed two paragraphs outside the section's topic; made light wording edits | Every cited page fetched and each attributed claim searched for in it; the arXiv authors and version checked on arXiv; the PR #18 and PR #25 claims checked against the review records and commit history; every identifier checked against the M1 registers workbook; Master Project Brief s9 read directly; citations reconciled in both directions; a change list prepared for the author | Accepted after revision; every change is listed for the author | The arXiv paper was attributed to Wang et al. and is by Yang et al.; its 16% and 1% figures come from earlier studies and became secondary citations. A recommendation to scan every push was attributed to the OWASP cheat sheet and comes from CICD-SEC-6, which was dated 2025 and whose link no longer resolved; it is now dated 2022 and linked to OWASP's own copy. References to DEC-008 and RSK-08 did not match the register and were corrected. One paragraph contained what reads as pasted assistant output; it and the paragraph before it were outside the section's topic and were removed. |
