// HTTP boundary for request submission. Runs behind the identity and access module's authenticate
// (#111), so req.actor is always set; the permission check itself is in submitRequest.

import { submitRequest } from "./submit.js";

export function createSubmissionHandler({ categories, requests }) {
  return async function submit(req, res) {
    const result = await submitRequest({ actor: req.actor, input: req.body }, { categories, requests });
    if (result.ok) return res.status(201).json(result.acknowledgement);
    if (result.code === "invalid") return res.status(400).json({ errors: result.errors });
    return res.status(403).json({ error: "You are not authorised to do this." });
  };
}
