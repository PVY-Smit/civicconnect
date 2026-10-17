// HTTP boundary for management reporting (FR-022 to FR-024). Runs behind authenticate (#111).
// The target is checked when the handlers are made, so a server without one does not start.

import { NOT_PERMITTED } from "../identity-access/http.js";
import { assertTargetDays, getOverdueReport, getReportSummary } from "./service.js";

function fail(res, result) {
  if (result.code === "not-signed-in") return res.status(401).json({ error: "Sign in to continue." });
  if (result.code === "not-authorised") return res.status(403).json({ error: NOT_PERMITTED });
  return res.status(400).json({ errors: result.errors });
}

export function createReportHandlers({ reports, overdueTargetDays, now = () => new Date() }) {
  const targetDays = assertTargetDays(overdueTargetDays);

  async function summary(req, res) {
    const result = await getReportSummary({ actor: req.actor, query: req.query ?? {}, now: now(), targetDays }, { reports });
    return result.ok ? res.status(200).json(result.summary) : fail(res, result);
  }

  async function overdue(req, res) {
    const result = await getOverdueReport({ actor: req.actor, now: now(), targetDays }, { reports });
    return result.ok ? res.status(200).json(result.overdue) : fail(res, result);
  }

  return { summary, overdue };
}
