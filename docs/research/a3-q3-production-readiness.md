# A3 Q3 --- Production Readiness, Deployment and Operational Evidence

## Production readiness

Production readiness is broader than whether an application builds,
passes functional tests, or runs on a developer machine. A production
system also needs controlled configuration, repeatable deployment,
recovery options, useful operational telemetry, and evidence that
qualities such as reliability, performance, scalability, cost and
supportability have been considered.

## Environment strategy and configuration parity

Development, test/staging and production environments serve different
purposes, but uncontrolled differences between them create deployment
risk. The Twelve-Factor App recommends keeping development and
production as similar as possible, particularly around backing services,
because gaps between environments can allow defects to appear only after
deployment (Wiggins, 2017a).

Parity does not mean every environment must have identical capacity,
credentials or data. Production can require stronger security and more
resources. The important point is that differences should be
intentional, documented and controlled. Useful pre-release evidence can
include documented environment differences, compatible runtime/database
versions, a representative staging deployment, and smoke or integration
results from that environment.

Deploy-specific configuration should also be separated from application
code. Twelve-Factor guidance treats values such as database handles,
credentials and deploy-specific hostnames as configuration rather than
source code (Wiggins, 2017b).

## Secrets and production configuration

Sensitive values such as passwords, API keys, tokens and certificates
should not be committed as normal source-code configuration. OWASP
identifies hard-coded or poorly controlled secrets as an exposure risk
and recommends controlled storage, access, auditing and rotation (OWASP,
no date c).

Possible approaches range from environment-scoped secret storage to
dedicated secret-management services. GitHub Actions, for example,
supports repository, organisation and environment-level secrets (GitHub,
no date). This is an example of a candidate mechanism only; it is **not** a
CivicConnect M3 selection.

Stronger secret-management mechanisms can improve control but also add
setup and operational complexity. M3 must still decide what is
proportionate to CivicConnect's actual deployment environment and
secrets.

## Release and deployment

A successful build proves that an artefact can be produced. It does not
prove that the artefact can be deployed safely and used in its target
environment. Deployment can still fail because of configuration,
permissions, missing dependencies, database changes or environment
differences.

Repeatable automated deployment can reduce variation from manual steps.
Microsoft recommends predictable deployment practices, versioned
artefacts, quality controls and mechanisms for detecting unhealthy
releases (Microsoft, 2025b; Microsoft, 2026b). Automation is not proof
of safety by itself because an automated process can repeatedly apply an
incorrect configuration.

Useful pre-release evidence can include a versioned artefact, repeatable
deployment procedure, successful staging deployment and post-deployment
smoke checks. After release, health evidence should show whether the
deployed version is actually serving users correctly.

## Failure, rollback and recovery

Production readiness should assume that releases can fail. Possible
responses include rollback to a known working state or rolling forward
with a correction. Database migrations and other stateful changes can
make rollback more difficult because an older application version may no
longer be compatible with changed data (Microsoft, 2026b).

Backups are also weak evidence if restoration has never been tested.
NIST contingency-planning guidance treats backup and recovery as part of
restoring operations after disruption and relates recovery planning to
system requirements and allowable disruption (Swanson et al., 2010).
Stronger evidence therefore includes a documented recovery process and
evidence from a restore test.

M3 must still decide which failure cases require rollback or
roll-forward, what CivicConnect data must be recoverable, and what
recovery evidence is proportionate.

## Operations and observability

Logs, metrics, monitoring and alerts provide different operational
evidence. Logs can preserve detailed events and diagnostics. Metrics
provide quantitative trends such as latency, traffic, errors and
resource saturation. Alerts turn selected conditions into a prompt for
action. Google SRE identifies latency, traffic, errors and saturation as
four important monitoring signals for user-facing systems (Ewaschuk,
2016).

Collecting telemetry alone is insufficient. Microsoft recommends
interpreting and correlating telemetry against workload health and
defining meaningful alerts (Microsoft, 2026a). An alert that nobody can
act on, or logs that are collected but never used during diagnosis,
provide limited operational value.

## Operational quality and trade-offs

Reliability, performance, scalability, cost and supportability can all
affect a production-readiness decision. These concerns also trade off
against one another. Additional redundancy can improve resilience but
increase cost. More telemetry can improve diagnosis while increasing
storage and operational overhead. Scaling can protect performance but
make cost less predictable. Microsoft's Well-Architected guidance treats
operational excellence, reliability, performance and cost as related
concerns rather than independent guarantees (Microsoft, 2025a).

A3 therefore does not conclude that any particular platform, scaling
approach or monitoring product is suitable for CivicConnect. M3 must
compare actual implementation evidence and project constraints.

## Production-Readiness Evidence Matrix

| Concern | Risk if ignored | Evidence before release | Evidence to observe after release |
|---|---|---|---|
| Environment parity and configuration | Works in development but fails in production due to different runtimes, dependencies or settings | Documented environment differences; compatible versions; staging deployment; smoke/integration results | Configuration drift; environment-specific incidents; deployment failures |
| Secrets and sensitive configuration | Credentials leak through source, logs or excessive access | Secrets absent from normal source; access scope documented; controlled storage/injection | Unauthorised/failed access; rotation events; secret-related incidents |
| Repeatable release/deployment | Manual variation causes missed steps, wrong versions or inconsistent releases | Versioned artefact; repeatable deployment process; staging result; release checks | Deployment success/failure; running version; post-deployment health |
| Data compatibility and rollback | Failed release cannot safely be reversed or leaves incompatible data | Rollback/roll-forward procedure; migration and compatibility testing | Failed migrations; recovery events; data-integrity errors |
| Backup and recovery | Data/service cannot be restored despite backups existing | Backup procedure; restore procedure; evidence from a recovery test | Backup failures; restore-test results; recovery time |
| Logs and diagnostics | Failures happen but the team cannot determine why | Logging on important paths/errors; suitable context and access | Error patterns; repeated exceptions; incident diagnostic evidence |
| Metrics, monitoring and alerts | Degradation is missed, or noisy alerts produce no useful action | Defined health indicators; meaningful alert conditions; response expectation | Latency, traffic, errors, saturation; alert frequency; incidents |
| Reliability, performance, scalability, cost and supportability | System becomes slow, unavailable, too expensive or difficult to support | Relevant performance/capacity evidence; cost constraints; support expectations | Response times; failures; resource use; usage growth; cost; support incidents |

The matrix separates pre-release evidence from evidence that must
continue after release. A release gate only gives evidence at a point in
time; production can expose workload, configuration and failure
conditions that were not represented beforehand.

## Critical question

**Why can software that passes functional tests and runs successfully on
a developer's machine still be unready for production?**

Functional tests demonstrate only the behaviours and conditions that
were tested. They do not prove that production configuration is correct,
secrets are controlled, deployment is repeatable, database changes are
recoverable, backups can be restored, realistic demand can be handled,
or failures can be detected and diagnosed.

Production readiness therefore requires complementary evidence for
environments, deployment, recovery, observability and operational
qualities. A green functional test result is useful evidence, but it is
not complete release evidence.

## Research-to-M3 boundary

This research identifies candidate evidence and questions. M3 must still
decide, against CivicConnect's actual implementation and controlled
evidence:

- how closely development, staging and production need to match;
- how production configuration and secrets should be controlled;
- which release and deployment controls are proportionate;
- what rollback, roll-forward, backup and recovery evidence is required;
- which operational signals need logs, metrics, monitoring or alerts; and
- what reliability, performance, scalability, cost and supportability
  expectations are appropriate.

No deployment platform, monitoring product, secret-management product or
release strategy is selected by this A3 research.

## References

Ewaschuk, R. (2016) *Monitoring Distributed Systems*. Google Site
Reliability Engineering. Available at:
https://sre.google/sre-book/monitoring-distributed-systems/ (Accessed:
21 September 2026).

GitHub (no date) *Secrets reference*. GitHub Docs. Available at:
https://docs.github.com/en/actions/reference/security/secrets (Accessed:
21 September 2026).

Microsoft (2025a) *Microsoft Azure Well-Architected Framework*. Microsoft
Learn. Available at:
https://learn.microsoft.com/en-us/azure/well-architected/pillars
(Accessed: 21 September 2026).

Microsoft (2025b) *Operational Excellence design principles*. Microsoft
Learn. Available at:
https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/principles
(Accessed: 21 September 2026).

Microsoft (2026b) *Architecture strategies for safe deployment
practices*. Microsoft Learn. Available at:
https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments
(Accessed: 21 September 2026).

Microsoft (2026a) *Architecture strategies for designing a monitoring
system*. Microsoft Learn. Available at:
https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/observability
(Accessed: 21 September 2026).

OWASP (no date c) *Secrets Management Cheat Sheet*. OWASP Cheat
Sheet Series. Available at:
https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
(Accessed: 21 September 2026).

Swanson, M., Bowen, P., Phillips, A.W., Gallup, D. and Lynes, D. (2010)
*Contingency Planning Guide for Federal Information Systems*. NIST
Special Publication 800-34 Rev. 1. Available at:
https://doi.org/10.6028/NIST.SP.800-34r1 (Accessed: 21 September
2026).

Wiggins, A. (2017a) *The Twelve-Factor App: Dev/prod parity*. Available
at: https://12factor.net/dev-prod-parity (Accessed: 21 September 2026).

Wiggins, A. (2017b) *The Twelve-Factor App: Config*. Available at:
https://12factor.net/config (Accessed: 21 September 2026).

## AI Research & Verification Record --- Tristan Roets

| Team member | AI tool / use | Purpose | Output used? | How independently verified | What was changed/rejected |
|---|---|---|---|---|---|
| Tristan Roets | ChatGPT (OpenAI, GPT-5.6 Sol), 21 September 2026 | Research structure, drafting and candidate-source identification for Q3 | Working draft used subject to review | Claims mapped to Twelve-Factor, OWASP, GitHub Docs, Microsoft Learn, Google SRE and NIST sources listed above | Tool-specific suggestions were not accepted as CivicConnect decisions; wording remains conditional so M3 retains the project decisions |
