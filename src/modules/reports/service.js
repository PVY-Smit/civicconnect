import {
  permits,
} from "../authorisation-policy/policy.js";

import {
  validateReportPeriod,
} from "./validation.js";

const OPEN_STATUSES = Object.freeze([
  "New",
  "Assigned",
  "In Progress",
  "On Hold",
]);

function dateStart(value) {
  return value
    ? new Date(`${value}T00:00:00.000Z`)
    : null;
}

function dateEnd(value) {
  return value
    ? new Date(`${value}T23:59:59.999Z`)
    : null;
}

function reportAccess(actor) {
  return (
    actor &&
    permits(actor, "viewManagementCounts")
  );
}

function wholeAgeDays(createdAt, now) {
  const created = new Date(createdAt).getTime();
  const current = new Date(now).getTime();

  return Math.floor(
    (current - created) / 86_400_000,
  );
}

function overdue(
  request,
  overdueTargetDays,
  now,
) {
  return (
    OPEN_STATUSES.includes(request.status) &&
    wholeAgeDays(request.createdAt, now) >
      overdueTargetDays
  );
}

function periodWhere(period) {
  if (!period.from && !period.to) {
    return {};
  }

  const createdAt = {};

  if (period.from) {
    createdAt.gte = dateStart(period.from);
  }

  if (period.to) {
    createdAt.lte = dateEnd(period.to);
  }

  return {
    createdAt,
  };
}

function countStatuses(
  requests,
  overdueTargetDays,
  now,
) {
  return {
    open: requests.filter(
      (request) =>
        OPEN_STATUSES.includes(request.status),
    ).length,

    overdue: requests.filter(
      (request) =>
        overdue(
          request,
          overdueTargetDays,
          now,
        ),
    ).length,

    resolved: requests.filter(
      (request) =>
        request.status === "Resolved",
    ).length,

    closed: requests.filter(
      (request) =>
        request.status === "Closed",
    ).length,
  };
}

function breakdownRows(requests) {
  const counts = new Map();

  for (const request of requests) {
    const category =
      typeof request.category === "string"
        ? request.category
        : request.category?.name ?? "Unknown";

    const key = `${category}\u0000${request.status}`;

    const current = counts.get(key) ?? {
      category,
      status: request.status,
      count: 0,
    };

    current.count += 1;
    counts.set(key, current);
  }

  return [...counts.values()].sort(
    (a, b) =>
      a.category.localeCompare(b.category) ||
      a.status.localeCompare(b.status),
  );
}

export async function getReportSummary(
  {
    actor,
    query = {},
    now = new Date(),
    overdueTargetDays,
  },
  {
    reports,
  },
) {
  if (!actor) {
    return {
      ok: false,
      code: "not-signed-in",
    };
  }

  if (!reportAccess(actor)) {
    return {
      ok: false,
      code: "not-authorised",
    };
  }

  const period = validateReportPeriod(query);

  if (!period.ok) {
    return {
      ok: false,
      code: "invalid",
      errors: period.errors,
    };
  }

  const requests = await reports.forSummary({
    where: periodWhere(period.value),
  });

  return {
    ok: true,
    summary: {
      from: period.value.from,
      to: period.value.to,

      counts: countStatuses(
        requests,
        overdueTargetDays,
        now,
      ),

      overdueTargetDays,

      breakdown: breakdownRows(requests),
    },
  };
}

export async function getOverdueReport(
  {
    actor,
    now = new Date(),
    overdueTargetDays,
  },
  {
    reports,
  },
) {
  if (!actor) {
    return {
      ok: false,
      code: "not-signed-in",
    };
  }

  if (!reportAccess(actor)) {
    return {
      ok: false,
      code: "not-authorised",
    };
  }

  const requests =
    await reports.openRequests();

  const overdueRequests = requests
    .map((request) => ({
      request,
      ageDays: wholeAgeDays(
        request.createdAt,
        now,
      ),
    }))
    .filter(
      ({ request, ageDays }) =>
        OPEN_STATUSES.includes(
          request.status,
        ) &&
        ageDays > overdueTargetDays,
    )
    .sort(
      (a, b) =>
        b.ageDays - a.ageDays,
    )
    .map(
      ({
        request,
        ageDays,
      }) => ({
        reference: request.reference,

        category:
          typeof request.category === "string"
            ? request.category
            : request.category?.name ?? null,

        ageDays,

        assignee: request.assignee
          ? {
              id: request.assignee.id,
              name: request.assignee.name,
            }
          : null,
      }),
    );

  return {
    ok: true,
    overdue: {
      targetDays: overdueTargetDays,
      requests: overdueRequests,
    },
  };
}
