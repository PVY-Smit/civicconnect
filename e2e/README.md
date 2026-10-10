# End-to-end journeys

The browser journeys for #123: TC-33 and TC-34 in `docs/quality/test-catalogue.md`. Each signs in as real
users and drives the client as they would, by visible labels and roles, against a deployed CivicConnect:
staging (#122), with the seed data (#109).

| Journey | File | What it shows |
|---|---|---|
| TC-33 | `journeys/requester-submits-and-follows.spec.js` | A requester signs in, is refused an empty form with all five fields named, submits, gets a reference in the agreed format, and finds the request in their list and its detail (FR-001, FR-005 to FR-011) |
| TC-34 | `journeys/staff-new-to-closed.spec.js` | A requester submits; the Coordinator finds it in the queue, sets the priority and assigns it; the Staff member starts work, adds an internal note and a visible update, and resolves it; the Coordinator closes it; the history shows each step and who made it; the requester sees the outcome and the visible update but not the internal note (FR-011, FR-013 to FR-021, FR-025) |

Each run creates its own requests with unique titles, so the journeys do not depend on earlier runs or on
each other.

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

On a failure, `test-results/` holds the trace and screenshots, and `playwright-report/` the HTML report
(`npx playwright show-report`). Neither is committed.

## What staging must provide

The seed data (#109) needs one active Requester, Coordinator and Staff member with known passwords, and an
active category the Staff member is authorised for. Their credentials are set as secrets where the
journeys run, never in a file in the repository.
