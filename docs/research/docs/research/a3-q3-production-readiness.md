
# A3 Q3 --- Production Readiness, Deployment and Operational Evidence

> **Working research draft for Issue #76.** A3 researches candidate
> approaches and evidence. It does not select CivicConnect M3
> deployment, monitoring, secret-management, recovery or release
> decisions.

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
and recommends controlled storage, access, auditing and rotation (OWASP
Foundation, 2026).

Possible approaches range from environment-scoped secret storage to
dedicated secret-management services. GitHub Actions, for example,
supports repository, organisation and environment-level secrets (GitHub,
2026). This is an example of a candidate mechanism only; it is **not** a
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
releases (Microsoft, 2026a; Microsoft, 2026b). Automation is not proof
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
defining meaningful alerts (Microsoft, 2026c). An alert that nobody can
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
concerns rather than independent guarantees (Microsoft, 2025).

A3 therefore does not conclude that any particular platform, scaling
approach or monitoring product is suitable for CivicConnect. M3 must
compare actual implementation evidence and project constraints.

## Production-Readiness Evidence Matrix

  -------------------------------------------------------------------------------------
  Concern              Risk if ignored   Evidence before release Evidence to observe
                                                                 after release
  -------------------- ----------------- ----------------------- ----------------------
  Environment parity   Works in          Documented environment  Configuration drift;
  and configuration    development but   differences; compatible environment-specific
                       fails in          versions; staging       incidents; deployment
                       production due to deployment;             failures
                       different         smoke/integration       
                       runtimes,         results                 
                       dependencies or                           
                       settings                                  

  Secrets and          Credentials leak  Secrets absent from     Unauthorised/failed
  sensitive            through source,   normal source; access   access; rotation
  configuration        logs or excessive scope documented;       events; secret-related
                       access            controlled              incidents
                                         storage/injection       

  Repeatable           Manual variation  Versioned artefact;     Deployment
  release/deployment   causes missed     repeatable deployment   success/failure;
                       steps, wrong      process; staging        running version;
                       versions or       result; release checks  post-deployment health
                       inconsistent                              
                       releases                                  

  Data compatibility   Failed release    Rollback/roll-forward   Failed migrations;
  and rollback         cannot safely be  procedure; migration    recovery events;
                       reversed or       and compatibility       data-integrity errors
                       leaves            testing                 
                       incompatible data                         

  Backup and recovery  Data/service      Backup procedure;       Backup failures;
                       cannot be         restore procedure;      restore-test results;
                       restored despite  evidence from a         recovery time
                       backups existing  recovery test           

  Logs and diagnostics Failures happen   Logging on important    Error patterns;
                       but the team      paths/errors; suitable  repeated exceptions;
                       cannot determine  context and access      incident diagnostic
                       why                                       evidence

  Metrics, monitoring  Degradation is    Defined health          Latency, traffic,
  and alerts           missed, or noisy  indicators; meaningful  errors, saturation;
                       alerts produce no alert conditions;       alert frequency;
                       useful action     response expectation    incidents

  Reliability,         System becomes    Relevant                Response times;
  performance,         slow,             performance/capacity    failures; resource
  scalability, cost    unavailable, too  evidence; cost          use; usage growth;
  and supportability   expensive or      constraints; support    cost; support
                       difficult to      expectations            incidents
                       support                                   
  -------------------------------------------------------------------------------------

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

-   how closely development, staging and production need to match;
-   how production configuration and secrets should be controlled;
-   which release and deployment controls are proportionate;
-   what rollback, roll-forward, backup and recovery evidence is
    required;
-   which operational signals need logs, metrics, monitoring or alerts;
    and
-   what reliability, performance, scalability, cost and supportability
    expectations are appropriate.

No deployment platform, monitoring product, secret-management product or
release strategy is selected by this A3 research.

## References

Ewaschuk, R. (2016) *Monitoring Distributed Systems*. Google Site
Reliability Engineering. Available at:
https://sre.google/sre-book/monitoring-distributed-systems/ (Accessed:
21 September 2026).

GitHub (2026) *Secrets reference*. GitHub Docs. Available at:
https://docs.github.com/en/actions/reference/security/secrets (Accessed:
21 September 2026).

Microsoft (2025) *Microsoft Azure Well-Architected Framework*. Microsoft
Learn. Available at:
https://learn.microsoft.com/en-us/azure/well-architected/pillars
(Accessed: 21 September 2026).

Microsoft (2026a) *Operational Excellence design principles*. Microsoft
Learn. Available at:
https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/principles
(Accessed: 21 September 2026).

Microsoft (2026b) *Architecture strategies for safe deployment
practices*. Microsoft Learn. Available at:
https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/safe-deployments
(Accessed: 21 September 2026).

Microsoft (2026c) *Architecture strategies for designing a monitoring
system*. Microsoft Learn. Available at:
https://learn.microsoft.com/en-us/azure/well-architected/operational-excellence/observability
(Accessed: 21 September 2026).

OWASP Foundation (2026) *Secrets Management Cheat Sheet*. OWASP Cheat
Sheet Series. Available at:
https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
(Accessed: 21 September 2026).

Swanson, M., Bowen, P., Phillips, A.W., Gallup, D. and Lynes, D. (2010)
*Contingency Planning Guide for Federal Information Systems*. NIST
Special Publication 800-34 Rev. 1. Available at:
https://doi.org/10.6028/NIST.SP.800-34rev1 (Accessed: 21 September
2026).

Wiggins, A. (2017a) *The Twelve-Factor App: Dev/prod parity*. Available
at: https://12factor.net/dev-prod-parity (Accessed: 21 September 2026).

Wiggins, A. (2017b) *The Twelve-Factor App: Config*. Available at:
https://12factor.net/config (Accessed: 21 September 2026).

## AI Research & Verification Record --- Tristan Roets

  -------------------------------------------------------------------------------------------
  Team member AI tool /   Purpose            Output      How independently What was
              use                            used?       verified          changed/rejected
  ----------- ----------- ------------------ ----------- ----------------- ------------------
  Tristan     ChatGPT     Research           Working     Claims mapped to  Tool-specific
  Roets       (OpenAI,    structure,         draft used  Twelve-Factor,    suggestions were
              GPT-5.6     drafting and       subject to  OWASP, GitHub     not accepted as
              Sol), 21    candidate-source   review      Docs, Microsoft   CivicConnect
              September   identification for             Learn, Google SRE decisions; wording
              2026        Q3                             and NIST sources  remains
                                                         listed above;     conditional so M3
                                                         final             retains the
                                                         source/citation   project decisions
                                                         reconciliation    
                                                         still requires    
                                                         student/team      
                                                         review            

  -------------------------------------------------------------------------------------------
