import { getQueue } from "./service.js";

export function createQueueHandler(deps) {
  return async function queue(req, res) {
    const result = await getQueue(
      {
        actor: req.actor,
        query: req.query ?? {},
      },
      deps,
    );

    if (result.ok) {
      return res.status(200).json(result.queue);
    }

    if (result.code === "not-signed-in") {
      return res.status(401).json({
        error: "Sign in to continue.",
      });
    }

    if (result.code === "not-authorised") {
      return res.status(403).json({
        error: "You are not authorised to view the queue.",
      });
    }

    if (result.code === "invalid") {
      return res.status(400).json({
        errors: result.errors,
      });
    }

    return res.status(400).json({
      error: "The queue request could not be processed.",
    });
  };
}
