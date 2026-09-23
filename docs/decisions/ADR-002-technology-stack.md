# ADR-002: Technology stack

- **Status:** Proposed. Awaiting two approvals under issue #59.
- **Date:** Drafted 19 September 2026 by Darius Mushi (three drafts). Finalised 23 September 2026 by
  Jean Smit at Darius's request.
- **Decision Log entry:** DEC-008, recorded in M1 as deferred to M2.
- **Drivers:** ASR-04 and ASR-05 in `docs/architecture/asr-quality-drivers.md` (#56), with ASR-06 as a
  bound on complexity, which is how #56 assigns drivers to DEC-008. Team capability is weighed through
  the rule in RSK-01's baselined mitigation.

## Context

DEC-008 was deferred to M2 with eight stated evidence conditions. Each is answered here:

| Evidence M1 required | Where it is answered |
|---|---|
| Requirement and architecture fit | Hard gates 2 and 4, and the driver comparison |
| Realistic learning curve for these three members | Team capability, applied through RSK-01 |
| Availability and compatibility on the BC Desktop platform | Gate 3. Still open, and a condition of this decision |
| Dependency ecosystem maturity | The dependency comparison |
| Testing and automation support | The ASR-04 row and gate 1 |
| Deployment compatibility | DEC-010 (#60). The runtime the host must provide is stated under Later consequences |
| Free-tier limits and likely operational cost | DEC-010 (#60). Neither candidate requires a paid component |
| Lock-in and unavailability consequences | The lock-in comparison |

ADR-001 (#57) fixed the architecture: one deployable application, modules communicating in process
through declared interfaces, one relational database, and every call entering through the
application's own server-side entry point. Both candidates below satisfy it without modification.

Assignment 2 Task 2 assumed PostgreSQL for the reference sequence FR-008 needs. Both candidates keep
PostgreSQL, so neither departs from what A2 assumed.

## Constraints

- **CON-02** four assessed milestones alongside other modules, so engineering time is bounded and
  uneven.
- **CON-03** free or low-cost services only, with no budget for paid tiers or paid tooling.
- **CON-05** security is a lifecycle-wide responsibility, and the system holds personal information.
- **CON-06** three students with prior exposure to programming, databases and web development, and
  limited exposure to controlled team engineering at this scale. The register states that an
  unfamiliar stack converts schedule into learning time.
- **CON-07** the campus cannot guarantee that a chosen language, framework or platform is installed,
  available or supported on BC Desktop.
- **CON-08** protected main, with two approvals from members other than the author.

## Alternatives considered

A candidate is a complete working set: runtime, framework, persistence, and the build, dependency and
test tooling. Versions, release dates and licences were checked against the npm registry and PyPI on
23 September 2026.

**A. Node.js, Express and PostgreSQL**

| Component | Version | Released | Licence |
|---|---|---|---|
| Node.js (LTS, Krypton) | 24.21.0 | 7 Sept 2026 | MIT |
| Express | 5.2.1 | 1 Dec 2025 | MIT |
| React and React DOM | 19.3.0 | 9 Sept 2026 | MIT |
| Vite (React build tool) | 8.3.0 | 10 Sept 2026 | MIT |
| Prisma CLI, Prisma Client, PostgreSQL adapter | 7.10.0 | 25 Aug 2026 | Apache-2.0 |
| pg (PostgreSQL driver used by the adapter) | 8.23.0 | 8 Aug 2026 | MIT |
| argon2 (password hashing) | 0.45.1 | 21 Jul 2026 | MIT |
| node-cron (in-process scheduling) | 4.6.0 | 5 Jul 2026 | ISC |
| Test runner | `node:test`, built into Node | Stable since Node 20 | MIT |

Prisma 7 requires a driver adapter for every database, so `@prisma/adapter-pg` and `pg` are required
parts of the set. React's own guidance makes a build tool the first step of a React
application and lists Vite first among three.

**B. Django and PostgreSQL**

| Component | Version | Released | Licence |
|---|---|---|---|
| Python | 3.12 or later, which Django 6.1 requires | | PSF |
| Django | 6.1.1 | 2 Sept 2026 | BSD-3-Clause |
| psycopg (PostgreSQL driver) | 3.3.6 | 18 Sept 2026 | LGPL-3.0-only |
| django-apscheduler, with APScheduler | 0.7.0, with 3.11.3 | 28 Sept 2024, 28 Jun 2026 | MIT |
| argon2-cffi, if Argon2id is chosen | 25.1.0 | 3 Jun 2025 | MIT |
| Test runner | `manage.py test`, built into Django | | BSD-3-Clause |

B is compared in its server-rendered template form, which is Django's lowest-dependency form. With a
React client it would carry A's frontend toolchain as well as its own, and comparing against that form
would understate Django's dependency advantage.

**Named and not evaluated in depth: PHP and MySQL.** Jean Smit uses PHP and MySQL daily, on a
hand-rolled framework. No other member reported PHP exposure, and a documented framework would be new
to all three, so on RSK-01's rule it ranks no higher than A. It is recorded as the fallback if both
candidates fail gate 3.

## Hard gates applied

1. **Builds and runs the tests from a clean checkout with no manual step.** Both pass, given a
   PostgreSQL service in CI. A: `npm ci`, then a test script that runs `prisma generate` and
   `node --test`. B: `pip install -r requirements.txt`, then `python manage.py test`.
2. **A supported relational store the team can run free during assessment.** Both use PostgreSQL. The
   host is chosen under DEC-010 (#60).
3. **Runs on the machines all three members actually have (CON-07).** **Open for both.** Documentation
   cannot close it. Someone has to install and run the stack on a BC Desktop machine. For A, Node also
   publishes a Windows zip archive that runs without installation, which is the fallback if the campus
   image lacks Node. That fallback is itself untested on campus.
4. **Enforces authorisation on the server (NFR-005, FR-002).** Both pass. Express middleware and
   Django's view pipeline each support a single enforcement point, which ADR-001 rules 1 and 2
   require.
5. **Licensing permits this use.** Both pass. Every component in A is MIT, ISC or Apache-2.0. B is BSD,
   MIT and PSF, with one exception: psycopg is LGPL-3.0-only. The LGPL permits use of the library
   unmodified, which is how this project would use it.

No candidate is disqualified. Gate 3 remains a condition of the decision below.

## Comparison against the drivers

**The measurable drivers.** ASR-01 to ASR-05 each carry a measurable target, and #56 records ASR-06 as
a bound that is not scored alongside them.

| Driver and its measurable target | A | B | Differentiates? |
|---|---|---|---|
| ASR-01 server-side authorisation (NFR-005) | Express middleware | Django view pipeline and decorators | No |
| ASR-02 responsiveness (NFR-001, NFR-002) | Depends on queries and indexes | Depends on queries and indexes | No |
| ASR-03 one immutable audit entry per change (NFR-011) | Prisma interactive transactions | `transaction.atomic()` | No |
| ASR-04 changeability, measured by NFR-012 on every pull request | `node:test`, built in and headless | `manage.py test`, built in and headless | No, on its measurable target. See the review evidence below |
| ASR-05 free tier at the committed availability (NFR-013, NFR-003) | Decided by the host under DEC-010 | Decided by the host under DEC-010 | No, at stack level |

All five are level on their measurable targets. An earlier draft read ASR-04 as favouring B because
Django ships more built-in components. That argument concerns the number of dependencies, which is what
RSK-12 covers, so it is weighed below under that risk.

**ASR-04's own evidence.** #56 lists CON-08 and RSK-04 as evidence for ASR-04. Every change needs two
approvals from the members who did not write it. A reviewer who cannot read the language can check that
tests pass, and cannot judge the change itself. That bears on B, where no member has Python web
exposure.

**Team capability, through RSK-01.** RSK-01 is Critical at 20, and its baselined mitigation says to
make team capability an explicitly weighted criterion, to run a timeboxed proof of concept covering
authentication, one persisted entity and one automated test before committing, and to prefer a stack
in which at least two of three members have prior exposure. The members' own accounts:

| Member | A. Node and Express | B. Django |
|---|---|---|
| Darius Mushi | Express backend experience from a prior module | No Django or Python web experience |
| Jean Smit | Backend Node with Express. JavaScript and TypeScript with Node tooling, including Playwright for automated browser tests. MySQL daily, shallow PostgreSQL | No Python web experience |
| Tristan Roets | JavaScript for frontend work only. Has not built an Express server or any backend project | No Django or Python web experience |

Tristan also reports that his database and testing experience is limited to coursework. That applies
to both candidates equally.

"Prior exposure" can be read two ways, and this record applies both:

| Reading | A | B |
|---|---|---|
| The backend framework | 2 of 3 | 0 of 3 |
| The language | 3 of 3 | 0 of 3 |

**A meets RSK-01's preference on both readings, and B meets it on neither**, so the decision does not
depend on which reading the team adopts. The framework reading is the one Tristan gave. Jean Smit, who
finalised this record, is one of the two members counted for A on that reading. The drafts recorded
him as not having written an Express server, and he corrected that on 23 September 2026. The proof of
concept is still required before committing, because RSK-01's mitigation requires it whichever stack
is chosen.

**Dependency ecosystem maturity (RSK-12).**

| | A | B |
|---|---|---|
| Direct packages the team adds and must justify | Ten: express, react, react-dom, vite, prisma, @prisma/client, @prisma/adapter-pg, pg, argon2, node-cron | Three or four: django, psycopg, django-apscheduler, and argon2-cffi if Argon2id is chosen |
| Weakest cell | Prisma is between major versions. On npm the `prisma` CLI's `latest` tag is `8.0.0-rc.15` while `@prisma/client` is at 7.10.0, so an unpinned install mixes a release candidate with the stable client | django-apscheduler's last release was 28 September 2024, and it declares support only up to Django 5.1. Its compatibility with Django 6.1 is unverified |
| Support window | Node 24 is supported until 30 April 2028 | Django 6.1 is supported until December 2027 |

B needs fewer packages, and that is a real advantage. Transitive dependency counts were not measured for
either candidate.

**Lock-in and unavailability.** The data stays in standard PostgreSQL under both candidates, which is
the portability RSK-02's mitigation asks for. Under A, the Prisma schema and migration history are
Prisma-specific, although each migration is kept as a SQL file. Under B, models and migrations are
Django-specific. If a registry is unavailable, both depend on a committed lockfile and cached packages
for a clean build. Neither candidate differs materially here.

## Decision

**Candidate A: Node.js 24 LTS, Express 5, PostgreSQL through Prisma 7, and React 19 built with Vite,
at the versions pinned above.** Password hashing uses argon2. In-process scheduling, if needed, uses
node-cron. Tests run on Node's built-in `node:test`.

The decision is conditional. Two things must happen before #64 (bootstrap) starts, and if either fails,
this record is revisited through controlled change:

1. **Gate 3 closes.** The stack is installed and run on a BC Desktop machine, or the Node zip archive is
   shown to work there.
2. **The RSK-01 proof of concept passes.** It covers authentication, one persisted entity and one
   automated test, within a timebox the team agrees and records on #64.

Prisma is pinned exactly at 7.10.0 for all three packages, the CLI included. Upgrading to Prisma 8 is a
separate decision, taken after Prisma 8 is released as stable.

## Rationale

The five measurable drivers are level. What separates the candidates is two register entries that
point in opposite directions:

- **RSK-12 (Medium, 8) favours B.** B needs three or four direct packages against A's ten.
- **RSK-01 (Critical, 20) favours A.** Its baselined mitigation prefers a stack in which at least two
  of three members have prior exposure. A meets that on both readings, and B meets it on neither.

RSK-01 decides it. It is the highest-scored risk on the register, and its preference was baselined in
M1 before any candidate was named, so applying it does not amount to choosing on familiarity after the
fact. RSK-12's own mitigation also applies to A without change: lockfiles, automated dependency and
vulnerability checks from the first construction pull request, and a justification for each new
dependency in the pull request that adds it. No mitigation of comparable strength exists for B's
capability gap, because RSK-01's own mitigation treats choosing a stack nobody knows as the thing to
avoid.

Master Project Brief s18.1 warns against choosing on familiarity rather than evidence. Beyond
familiarity, the evidence here is:

- the baselined RSK-01 rule;
- ASR-04's review evidence under CON-08, which asks whether two members can judge each other's changes;
- django-apscheduler's maturity, the weakest dependency on either side.

**How the drafts reached this.** The first draft chose A on the basis that ASR-06 was the heaviest
driver. That came from an error in the comparison framework the author was given, and #56 says the
opposite. The third draft corrected that and chose B, reading ASR-04 as favouring Django. It did not
have RSK-01's baselined mitigation in front of it, which was a second omission in the same framework.
This version applies both corrections. The reversals are recorded because the reasoning at each step is
part of the evidence for the final choice.

## Trade-offs accepted

- **More dependencies to justify and maintain.** Ten direct packages against three or four. Each one is
  justified in the pull request that introduces it, as RSK-12 requires, and #67 adds the automated
  checks.
- **No built-in password hasher.** argon2 implements Argon2id, which the OWASP Password Storage Cheat
  Sheet recommends at a minimum of 19 MiB of memory, an iteration count of 2 and 1 degree of
  parallelism. Recording the configured parameters makes NFR-004's inspection evidence concrete.
- **No built-in migrations.** Prisma Migrate supplies them: `prisma migrate dev` in development and
  `prisma migrate deploy` in CI and production, at the pinned 7.x line.
- **B's smaller dependency surface is given up.** That is the direct cost of weighting RSK-01 above
  RSK-12, and it is recorded here so the choice can be revisited if RSK-12 materialises.

## Risks created

Proposed to the Risk Register under #68, where the owner assigns the identifiers:

1. **Prisma version drift.** An unpinned install mixes the Prisma 8 release candidate with the Prisma 7
   client. Mitigation: exact pins, a committed lockfile, and `npm ci` in CI. Related to RSK-12.
2. **Duplicate scheduled jobs.** node-cron runs inside the application process, so two running
   instances fire every job twice. Mitigation: DEC-010 must run exactly one instance while scheduling is
   in use. Related to FEC-03 and RSK-02.

Updates proposed to existing risks under #68:

- **RSK-01:** record that the preference for two of three members with prior exposure is met on both
  readings, and that the proof of concept is still outstanding. Whether the score changes once the proof
  of concept passes is the owner's assessment. Owner: Tristan Roets.
- **RSK-12:** record the dependency list and pins above as the baseline the first construction pull
  request inherits. Owner: Darius Mushi.
- **RSK-02:** unchanged by this decision. It is decided under DEC-010.

## Evidence

- M1 registers: DEC-008, NFR-001 to NFR-005, NFR-011, NFR-012, NFR-013, CON-02, CON-03, CON-05 to
  CON-08, RSK-01, RSK-02, RSK-04, RSK-12, FEC-03.
- `docs/architecture/asr-quality-drivers.md` (#56) for ASR-01 to ASR-06 and their evidence.
- ADR-001 (#57) for the architecture every candidate must satisfy.
- Team capability as reported by each member to the team, September 2026.
- npm registry and PyPI package metadata for every version, release date and licence above, and the
  django-apscheduler classifiers (accessed 23 September 2026).
- Node.js release schedule, github.com/nodejs/Release, and the Node.js test runner documentation,
  nodejs.org/api/test.html, which records the runner as stable from Node 20 (accessed 23 September
  2026).
- Django Software Foundation, *Download* page, djangoproject.com/download, for the 6.1 support dates;
  *Password management in Django* and *Migrations*, docs.djangoproject.com/en/6.1 (accessed 19 and 23
  September 2026).
- Prisma, *Upgrade to Prisma ORM 7*, prisma.io/docs/guides/upgrade-prisma-orm/v7, for the driver
  adapter requirement (accessed 23 September 2026).
- React, *Build a React app from scratch*, react.dev/learn/build-a-react-app-from-scratch (accessed 23
  September 2026).
- OWASP, *Password Storage Cheat Sheet*, cheatsheetseries.owasp.org (accessed 19 September 2026).
- node-cron, npmjs.com/package/node-cron, for the ISC licence and the zero-dependency design (accessed
  19 September 2026).

## Later consequences

- **DEC-011 (#58)** inherits Prisma's schema and migration model. It must confirm that the
  database-native sequence and unique constraint A2 Task 2 recommended for FR-008 can be expressed,
  using a hand-edited SQL migration where the schema language cannot express them.
- **DEC-010 (#60)** must choose a host that runs Node 24 and one PostgreSQL database inside a free tier,
  and must allow exactly one always-on instance if scheduling is used (FEC-03).
- **#64 (bootstrap)** fixes JavaScript or TypeScript and any frontend test tooling, each justified in
  its pull request under RSK-12. It cannot start until both conditions under Decision are met.
- **#67 (checks)** runs `npm ci` against the lockfile and `node --test` on every pull request, which is
  NFR-012's evidence.
- **Node 24** enters maintenance on 20 October 2026 and remains supported until 30 April 2028, which
  covers the project.
- **If gate 3 or the proof of concept fails**, this record is revisited through controlled change. B
  remains the evaluated alternative and its evidence stays in this record. RSK-01's contingency, which
  reduces committed scope to Must-priority requirements through a change request, applies whichever
  stack is chosen.
- **The Decision Log row for DEC-008** is updated after #46 merges, since the workbook is binary and one
  pull request should change it at a time. The RTM technology column follows under #54.
