// HTTP boundary for the staff queue (FR-013, FR-014). Runs behind authenticate (#111), so req.actor is set.

import { NOT_PERMITTED } from "../identity-access/http.js";
import { permits } from "../authorisation-policy/policy.js";
import { getQueue } from "./service.js";

export function createQueueHandlers({ requests, users }) {
  async function queue(req, res) {
    const result = await getQueue({ actor: req.actor, query: req.query ?? {} }, { requests });
    if (result.ok) return res.status(200).json(result.queue);
    if (result.code === "not-signed-in") return res.status(401).json({ error: "Sign in to continue." });
    if (result.code === "not-authorised") return res.status(403).json({ error: NOT_PERMITTED });
    return res.status(400).json({ errors: result.errors });
  }

  // The queue's assignee filter offers the active Staff by name. Only the people who can see the queue may
  // list them.
  async function staff(req, res) {
    if (!req.actor) return res.status(401).json({ error: "Sign in to continue." });
    if (!permits(req.actor, "viewRequestsInScope")) return res.status(403).json({ error: NOT_PERMITTED });
    return res.status(200).json({ staff: await users.activeStaff() });
  }

  return { queue, staff };
}
