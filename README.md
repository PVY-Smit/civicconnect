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



## 💻 Local Developer Environment Installation & Setup (#66)

Follow these steps sequentially to clone, configure, and verify your local sandbox environment:

### 1. Engine & Environment Verification
Ensure your local host machine satisfies the system runtime version engine constraints baselined in ADR-002:
*   Verify your active Node.js execution engine (`node -v` must return `>=24`).

### 2. Environment Configuration Profile
Construct an active configuration credentials file named **`.env`** directly in the root directory of the repository. Populate it with your target local or remote PostgreSQL connection string parameters:
```env
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>?schema=public"
```

### 3. Core Ecosystem Initialization
Execute these commands sequentially in your terminal daemon to initialize third-party package dependencies, compile the local Prisma Client configurations, and trigger local verification sweeps:
```bash
# Install local node modules
npm install

# Compile engine database schemas and generate Prisma Client hooks
npm run prisma:generate

# Execute the local automated integration testing suite
npm test
```
