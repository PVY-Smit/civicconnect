// HTTP boundary for the workflow service. Runs behind authenticate (#111), so req.actor is set.
//
// Status codes: 401 without a signed-in actor; 404 when the request is outside the actor's scope or does not exist (one body for both,
// FR-012); 403 when the actor may see it but not do this; 409 when the move is not in the status model
// or the request changed underneath; 422 when the move needs input it did not get (a guard); 400 when a
// field is invalid.

import { NOT_FOUND } from "../request-access/http.js";
import { changeStatus, recordActionEntry, setPriority } from "./service.js";

const STATUS_FOR = { "not-signed-in": 401, "not-found": 404, "not-authorised": 403, "not-in-model": 409, conflict: 409, "guard-failed": 422, invalid: 400, "unknown-status": 400 };

function fail(res, result) {
  const status = STATUS_FOR[result.code] ?? 400;
  if (status === 401) return res.status(401).json({ error: "Sign in to continue." });
  if (status === 404) return res.status(404).json({ error: NOT_FOUND });
  if (result.errors) return res.status(status).json({ errors: result.errors });
  return res.status(status).json({ error: result.message ?? "The change was refused." });
}

export function createWorkflowHandlers(deps) {
  async function status(req, res) {
    const { to, ...change } = req.body ?? {};
    const result = await changeStatus({ actor: req.actor, reference: req.params?.reference, to, change }, deps);
    return result.ok ? res.status(200).json(result.request) : fail(res, result);
  }

  async function priority(req, res) {
    const result = await setPriority({ actor: req.actor, reference: req.params?.reference, priority: req.body?.priority }, deps);
    return result.ok ? res.status(200).json(result.request) : fail(res, result);
  }

  async function actionEntry(req, res) {
    const { body, visibility } = req.body ?? {};
    const result = await recordActionEntry({ actor: req.actor, reference: req.params?.reference, body, visibility }, deps);
    return result.ok ? res.status(201).json(result.entry) : fail(res, result);
  }

  return { status, priority, actionEntry };
}
