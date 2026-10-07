import {
  getOverdueReport,
  getReportSummary,
} from "./service.js";

function errorResponse(result, res) {
  if (result.code === "not-signed-in") {
    return res.status(401).json({
      error: "Sign in to continue.",
    });
  }

  if (result.code === "not-authorised") {
    return res.status(403).json({
      error:
        "You are not authorised to view management reports.",
    });
  }

  if (result.code === "invalid") {
    return res.status(400).json({
      errors: result.errors,
    });
  }

  return res.status(400).json({
    error:
      "The report request could not be processed.",
  });
}

export function createReportSummaryHandler(
  deps,
) {
  return async function reportSummary(
    req,
    res,
  ) {
    const result =
      await getReportSummary(
        {
          actor: req.actor,
          query: req.query ?? {},
          overdueTargetDays:
            deps.overdueTargetDays,
        },
        deps,
      );

    if (result.ok) {
      return res
        .status(200)
        .json(result.summary);
    }

    return errorResponse(
      result,
      res,
    );
  };
}

export function createOverdueReportHandler(
  deps,
) {
  return async function overdueReport(
    req,
    res,
  ) {
    const result =
      await getOverdueReport(
        {
          actor: req.actor,
          overdueTargetDays:
            deps.overdueTargetDays,
        },
        deps,
      );

    if (result.ok) {
      return res
        .status(200)
        .json(result.overdue);
    }

    return errorResponse(
      result,
      res,
    );
  };
}
