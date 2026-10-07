import {
  permits,
  scopedWhere,
} from "../authorisation-policy/policy.js";

import {
  validateQueueQuery,
} from "./validation.js";

function startOfDay(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfDay(value) {
  return new Date(`${value}T23:59:59.999Z`);
}

function searchCondition(q) {
  if (!q) return null;

  return {
    OR: [
      {
        reference: {
          contains: q,
          mode: "insensitive",
        },
      },
      {
        title: {
          contains: q,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: q,
          mode: "insensitive",
        },
      },
      {
        location: {
          contains: q,
          mode: "insensitive",
        },
      },
    ],
  };
}

function buildFilterWhere(actor, filters) {
  const parts = [];

  const search = searchCondition(filters.q);
  if (search) parts.push(search);

  if (filters.status) {
    parts.push({
      status: filters.status,
    });
  }

  if (filters.categoryId !== null) {
    parts.push({
      categoryId: filters.categoryId,
    });
  }

  if (filters.assigneeId === "none") {
    parts.push({
      assigneeId: null,
    });
  } else if (filters.assigneeId === "me") {
    parts.push({
      assigneeId: actor.id,
    });
  } else if (filters.assigneeId) {
    parts.push({
      assigneeId: Number(filters.assigneeId),
    });
  }

  if (filters.from || filters.to) {
    const createdAt = {};

    if (filters.from) {
      createdAt.gte = startOfDay(filters.from);
    }

    if (filters.to) {
      createdAt.lte = endOfDay(filters.to);
    }

    parts.push({ createdAt });
  }

  return parts.length > 0 ? { AND: parts } : {};
}

function queueItem(row) {
  return {
    reference: row.reference,
    title: row.title,
    category:
      typeof row.category === "string"
        ? row.category
        : row.category?.name ?? null,
    status: row.status,
    priority: row.priority ?? null,
    reportedUrgency: row.reportedUrgency,
    assignee: row.assignee
      ? {
          id: row.assignee.id,
          name: row.assignee.name,
        }
      : null,
    submittedAt: row.submittedAt ?? row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getQueue(
  {
    actor,
    query = {},
  },
  {
    requests,
  },
) {
  if (!actor) {
    return {
      ok: false,
      code: "not-signed-in",
    };
  }

  if (!permits(actor, "viewRequestsInScope")) {
    return {
      ok: false,
      code: "not-authorised",
    };
  }

  const parsed = validateQueueQuery(query);

  if (!parsed.ok) {
    return {
      ok: false,
      code: "invalid",
      errors: parsed.errors,
    };
  }

  const filters = parsed.value;

  const where = scopedWhere(
    actor,
    buildFilterWhere(actor, filters),
  );

  const skip = (filters.page - 1) * filters.pageSize;

  const [rows, total] = await Promise.all([
    requests.findQueue({
      where,
      sort: filters.sort,
      skip,
      take: filters.pageSize,
    }),

    requests.countQueue({
      where,
    }),
  ]);

  return {
    ok: true,
    queue: {
      requests: rows.map(queueItem),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
    },
  };
}
