import {
  getRequesterNotifications,
} from "./service.js";

export function createNotificationsHandler(deps) {
  return async function notifications(req, res) {
    const result =
      await getRequesterNotifications(
        {
          actor: req.actor,
        },
        deps,
      );

    if (result.ok) {
      return res.status(200).json({
        notifications: result.notifications,
      });
    }

    if (result.code === "not-signed-in") {
      return res.status(401).json({
        error: "Sign in to continue.",
      });
    }

    if (result.code === "not-authorised") {
      return res.status(403).json({
        error:
          "You are not authorised to view these notifications.",
      });
    }

    return res.status(400).json({
      error:
        "The notifications request could not be processed.",
    });
  };
}
