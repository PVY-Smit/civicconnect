# CivicConnect client

The browser client (ADR-002: React 19 built with Vite). The Express application serves the built files
from `client/dist`, so the whole service is one deployable unit (ADR-001).

## Run it

Node 24 or later.

```bash
cd client
npm ci
npm run dev
```

The development server runs on <http://localhost:5173> and forwards every `/api` call to the Express
server on port 3000, so start that too. Set `API_ORIGIN` to forward somewhere else.

```bash
npm run build   # writes client/dist
npm test        # the API wrapper and router tests
```

## How it is organised

- `src/api.js`: the only place that calls the server. A protected call that answers 401 sends the user
  to sign in (FR-001).
- `src/router.js`: the five screens and their paths, and the check that a return address after sign-in
  stays inside the application.
- `src/screens/`: one file per screen. The server validates and authorises everything; the screens show
  its answers and never decide who may see or do something.
- `src/components/`: the page frame, form fields with their errors, and links.

## Accessibility (NFR-010)

Every screen can be used with the keyboard alone: a skip link, real links and buttons, labelled fields,
errors tied to their fields and summarised at the top of the form, and focus moved to the heading when a
screen opens. Text and focus colours meet WCAG 2.2 AA contrast; the figures are in `src/styles.css`.
