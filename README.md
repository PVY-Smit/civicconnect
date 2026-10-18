# CivicConnect

Community Service Request Management Platform.
SEN381 Software Engineering 381 integrated team project, academic year 2026.

## What this repository is

This repository is the project's engineering control and evidence environment, not a
file store for finished work. Requirements, risks, decisions and document revisions are
changed here, through Pull Requests, in the same way code is.

## Team

| Member | Student number |
|---|---|
| Jean Smit | 600368 |
| Tristan Roets | 601764 |
| Darius Mushi | 577982 |

## Controlled artefacts

| Artefact | Location |
|---|---|
| Project Engineering Document (PED) v1.0 | `docs/PED/` |
| Requirements, RTM, Risk Register, Decision Log, Forward Considerations, AI Usage Register, Change Requests | `docs/requirements/CivicConnect_M1_Registers.xlsx` |
| Architecture and ADRs (from M2) | `docs/architecture/`, `docs/decisions/` |
| Quality, security and deployment evidence (from M3) | `docs/quality/`, `docs/security/`, `docs/deployment/` |

The PED is a single evolving document. It advances to v2.0 at Milestone 2, v3.0 at
Milestone 3 and v4.0 at Milestone 4. It is not recreated per milestone.

## Working rules

See `CONTRIBUTING.md`. In short: no direct commits to `main`, one issue per Pull Request,
two approvals from members other than the author, and registers updated in the same Pull
Request as the change that affects them.

## Milestone status

| Milestone | Focus | Status |
|---|---|---|
| M1 | Engineering Foundation and Requirements Baseline | In progress |
| M2 | Architecture, Design and Engineering Decisions | Not started |
| M3 | Controlled Construction, Integration, Quality and Release Readiness | Not started |
| M4 | Final Product, Project Success and Engineering Defence | Not started |



## Local development setup

### Prerequisites
- Node.js 24 LTS (`node -v` must report v24.x; ADR-002)
- PostgreSQL 16, running locally, with an empty database

### Steps
1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `PORT`, `REFERENCE_KEY` and `SESSION_SECRET`
   (each at least 32 characters). Never commit `.env`.
2. Run, in this order:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm test
```

`prisma generate` builds the client into `src/generated/`, which is git-ignored because it
is derived from `prisma/schema.prisma`. `npm test` needs a reachable database, because the
RSK-01 test writes a User and reads it back.

`npm test` also runs TC-32 (`tests/api-postgres.test.js`), the API against that database. It makes its
own users, category and requests, and removes them afterwards.

### Running the application

1. Set the four `SEED_*_PASSWORD` values in `.env`, then seed the accounts, three categories and three
   requests. Running it again adds nothing:

```bash
npx prisma db seed
```

2. Build the client once, then start the server. It serves the API under `/api` and the built client
   from `client/dist`, on `PORT`:

```bash
npm ci --prefix client
npm run build --prefix client
npm run dev
```

The seeded accounts are `requester@`, `staff@`, `coordinator@`, `manager@` and `manager2@civicconnect.test`,
with the passwords from `.env`. `SEED_VOLUME=5000` with `ALLOW_DESTRUCTIVE_SEED=true` seeds 5,000
requests for the NFR-001 measurement; it needs a database with no requests, so run
`npx prisma migrate reset` first. It refuses to run with `NODE_ENV=production`.
