# End-to-end journeys

The browser journeys for #123: TC-33 and TC-34 in `docs/quality/test-catalogue.md`. They act as real users
and drive the client as those users would, by visible labels and roles, against a deployed CivicConnect:
staging (#122), with the seed data (#109).

| Journey | File | What it shows |
|---|---|---|
| Setup | `journeys/sign-in.setup.js` | Each seeded user signs in through the form and lands on their start screen: the Requester on My requests, the Coordinator and Staff on the queue (FR-001). The signed-in state is saved for the journeys |
| TC-33 | `journeys/requester-submits-and-follows.spec.js` | A requester signs in, is refused an empty form with all five fields named, submits, gets a reference in the agreed format, and finds the request in their list and its detail (FR-001, FR-005 to FR-011) |
| TC-34 | `journeys/staff-new-to-closed.spec.js` | A requester submits with Low urgency; the Coordinator finds it in the queue, sets the priority to High, with both values kept and the requester shown only their own, and assigns it; the Staff member starts work, adds an internal note and a visible update, and resolves it; the Coordinator closes it; the history shows each step and who made it; the requester sees the outcome and the visible update but not the internal note (FR-011, FR-013 to FR-021, FR-025) |

Each run creates its own requests with unique titles, so the journeys do not depend on earlier runs or on
each other.

## Before the journeys

1. **Waiting for the host.** `support/wait-for-host.js` checks the host's health check, `/health` (#90),
   every 2 s until it answers 200, for up to 3 minutes (`E2E_HOST_TIMEOUT_S` changes this). A free-tier host
   that has gone idle takes a while to wake. Without the wait, the first journey would fail on its first
   page for a reason unrelated to the journey. A host that does not answer in time stops the run with a
   message naming the address, the checks made and the last answer.
2. **Signing in once.** The setup steps sign each role in through the form and save the signed-in state
   to `.auth/` (ignored by git). The journeys start from that state and never type a password.

## Running them

Playwright is a separate package here, so it is never a dependency of the application (RSK-12). It is
pinned exactly, as ADR-002 pins the application's packages.

```bash
cd e2e
npm ci
npx playwright install chromium
npm test
```

`npx playwright install chromium` downloads the browser build this Playwright version needs, once per
machine. The run reads its target and accounts from the environment, never from the repository (NFR-007):

| Variable | Meaning |
|---|---|
| `E2E_BASE_URL` | The CivicConnect instance to test, for example the staging URL |
| `E2E_REQUESTER_EMAIL`, `E2E_REQUESTER_PASSWORD` | A seeded Requester |
| `E2E_COORDINATOR_EMAIL`, `E2E_COORDINATOR_PASSWORD` | A seeded Coordinator |
| `E2E_STAFF_EMAIL`, `E2E_STAFF_PASSWORD` | A seeded Staff member |
| `E2E_STAFF_NAME` | That Staff member's name as the assign list shows it |
| `E2E_CATEGORY` | An active category's name, one the Staff member is authorised for (FR-015) |
| `E2E_MANAGER_EMAIL`, `E2E_MANAGER_PASSWORD` | A seeded Manager, read only by the accessibility journey for the users and categories screens |
| `E2E_IGNORE_HTTPS_ERRORS` | `true` only against a target with a self-signed certificate, such as simulated production |
| `E2E_HOST_TIMEOUT_S` | Optional: how long to wait for the host's health check, in seconds (180 unless set) |

The package needs Node 24 or later (`engines`), the same as the application. A campus machine with an
older Node is the kind of difference RSK-30 records. `e2e/node_modules/` is ignored by the repository's
`.gitignore`, whose `node_modules/` pattern matches at any depth.

On a failure, `test-results/` holds the trace and screenshots, and `playwright-report/` the HTML report
(`npx playwright show-report`). Neither is committed.

## Credentials and what a run keeps

A Playwright trace records every value typed into a form, and every request with its headers. So:
- **No password is in a trace or report.** Only the setup steps type a password. They run with no trace,
  screenshot or video, set both in `playwright.config.js` and in the setup file itself, so even
  `--trace on` records nothing of them. A run with `--trace on` against the stand-in was searched for the
  three passwords: none in `test-results/` or `playwright-report/`.
- **The session cookie is in the journeys' traces and in `.auth/`.** It signs its user in for one working
  day, until it expires or the password is reset (FR-004). Treat a trace from a real run like the account:
  - use accounts that exist only on staging, with passwords used nowhere else;
  - never upload `.auth/`;
  - while the repository is public, do not upload `test-results/` or `playwright-report/` as CI
    artifacts, because anyone signed in to GitHub can download a public repository's artifacts. Reproduce a CI failure
    locally with its trace instead, or upload only once artifact access is restricted.

## Staging data

Each journey run adds two requests to staging, and they count in the queue and in the management reports
like any others. Their titles start with `E2E journey:` (`JOURNEY_PREFIX` in `support/app.js`), so they can
be found, excluded when reading a report, or removed. The performance scripts measure a queue of 5,000
requests (`docs/quality/performance/README.md`). Run them on a freshly seeded staging database before the
journeys run there, or on a separate copy, so journey requests do not change the dataset they measure.

## In CI

Once the CI workflow (#110) and staging (#122) exist, the journeys run as their own job, and only where
`E2E_BASE_URL` and the account variables are set as secrets: a pull request from a fork, or a repository
without them, skips the job rather than showing a red build for missing configuration. Run without a
target, `playwright.config.js` stops at once with "Set E2E_BASE_URL to the CivicConnect instance to test".
With `CI` set, a failed journey is retried once and the retry is traced, so a flaky step is reported as
flaky, not passed, and a real failure is shown with its trace. The trace stays on the runner: see
"Credentials and what a run keeps" before uploading it.

## Writing a step

Status changes come in two kinds on the staff screen, and `support/app.js` has a helper for each, so a
step says which it makes: `move` for a move with no inputs (Start work is sent by its own button), and
`moveWithInputs` for a move that opens a form and is sent by its "Confirm" button (Assign, Resolve, Close).

## What staging must provide

The seed data (#109) needs one active Requester, Coordinator and Staff member with known passwords, and an
active category the Staff member is authorised for. Their credentials are set as secrets where the
journeys run, never in a file in the repository.
