// The server's one entry point (ADR-001 rule 1). Every call reaches a module through the routes here, and
// every protected route runs the identity and access module's authenticate first (FR-001), then the
// permission check where the route has one (FR-002, NFR-005). The modules take their store as a
// dependency, so this file only connects them; it makes no decision of its own.
//
// createApp() with no dependencies serves only the health check, which is what the health test and
// NFR-003's probe need. src/server.js builds the dependencies from the configuration (src/wiring.js).

import express from "express";
import { createIdentityAccess } from "./modules/identity-access/http.js";
import { InactiveCategoryError } from "./modules/persistence/store.js";
import { createRequestAccessHandlers } from "./modules/request-access/http.js";
import { createSubmissionHandler } from "./modules/request-capture/http.js";
import { createWorkflowHandlers } from "./modules/workflow-status/http.js";

export function createApp(deps) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "64kb" }));

  // NFR-003's availability measurement needs a health endpoint to probe. release names the build that is
  // running, so a measurement can say which release it measured (#150).
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", ...(deps?.release ? { release: deps.release } : {}) });
  });

  if (deps) mountApi(app, deps);

  return app;
}

function mountApi(app, deps) {
  const { users, categories, requests, store } = deps.store;
  const identity = createIdentityAccess({
    users,
    verifyPassword: deps.verifyPassword,
    hashPassword: deps.hashPassword,
    dummyHash: deps.dummyHash,
    secret: deps.sessionSecret,
    secure: deps.secureCookies,
  });
  const access = createRequestAccessHandlers({ requests });
  const submit = createSubmissionHandler({ categories, requests, formatReference: deps.formatReference });
  const workflow = createWorkflowHandlers({ requests, users, store });
  const { authenticate, requirePermission } = identity;

  const api = express.Router();

  // Identity and access (FR-001, FR-002, FR-004)
  api.post("/auth/sign-in", identity.signIn);
  api.post("/auth/sign-out", identity.signOut);
  api.get("/auth/me", authenticate, identity.currentUser);
  api.post("/auth/reset", identity.resetPassword);
  api.post("/users/:id/reset-code", authenticate, requirePermission("manageUsers"), identity.issueResetCode);

  // FR-006: the active categories a Requester chooses from. Maintaining the list (?all=true and the
  // writes) is #115, not built on the server.
  api.get("/categories", authenticate, async (req, res) => {
    if (req.query.all !== undefined) return res.status(501).json({ error: "Category maintenance is not built yet." });
    return res.status(200).json({ categories: await categories.listActive() });
  });

  // Submission and the requester's views (FR-005 to FR-012)
  api.post("/requests", authenticate, submit);
  api.get("/requests/mine", authenticate, access.listMine);
  api.get("/requests/:reference", authenticate, access.detail);

  // The workflow (FR-015 to FR-021, FR-025)
  api.get("/requests/:reference/assignable-staff", authenticate, workflow.assignableStaff);
  api.post("/requests/:reference/status", authenticate, workflow.status);
  api.post("/requests/:reference/priority", authenticate, workflow.priority);
  api.post("/requests/:reference/actions", authenticate, workflow.actionEntry);

  // Anything else under /api is not a route of this release.
  api.use((req, res) => res.status(404).json({ error: "Not found." }));

  app.use("/api", api);

  // The built client, served from the same origin so the session cookie needs no cross-site rules.
  if (deps.clientDir) {
    app.use(express.static(deps.clientDir, { index: false }));
    app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile("index.html", { root: deps.clientDir }));
  }

  // One answer for a failure the routes did not expect, with no detail of the error (NFR-007). A body
  // that is not JSON is the caller's fault, and a category deactivated between the submission's check
  // and its transaction is a field error, as the check itself would have given (FR-027).
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error?.type === "entity.parse.failed") return res.status(400).json({ error: "The request body is not valid JSON." });
    if (error?.type === "entity.too.large") return res.status(413).json({ error: "The request body is too large." });
    if (error instanceof InactiveCategoryError) {
      return res.status(400).json({ errors: { categoryId: "Category must be one of the categories in the list." } });
    }
    (deps.log ?? console.error)(error);
    return res.status(500).json({ error: "Something went wrong. Try again." });
  });
}

export default createApp();
