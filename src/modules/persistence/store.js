// The persistence module's named operations over PostgreSQL (ADR-001 rule 5, ADR-007, DEC-011).
//
// Each service states the store it needs (sign-in.js, reset.js, submit.js, views.js, service.js), and its
// tests run against an in-memory store that follows that statement. This is the same contract over Prisma,
// so the services run unchanged against the database.
//
// Ids. PostgreSQL holds them as BIGINT and Prisma returns them as bigint, which JSON cannot carry, so every
// id leaves this module as a decimal string and enters it as a string or a number. The policy's scopes
// compare ids with ===, which works because every id the services see came from here as a string. An id
// that is not a positive integer can match no row, so it becomes NO_ROW instead of an error (FR-012: a
// malformed id answers the same as one that does not exist).
//
// Writes that depend on what was read are conditional, as each service's contract says: the update names
// the values the decision was made against, and writes nothing if another request changed them first.

const ID_KEYS = new Set(["id", "requesterId", "categoryId", "assigneeId", "authorId", "actorId", "requestId", "userId"]);
const NO_ROW = -1n;
const PRIORITY_RANK = Object.freeze({ Low: 1, Medium: 2, High: 3 });

export function toDbId(value) {
  if (typeof value === "bigint") return value;
  const text = typeof value === "number" && Number.isSafeInteger(value) ? String(value) : value;
  return typeof text === "string" && /^[1-9]\d{0,18}$/.test(text) ? BigInt(text) : NO_ROW;
}

// A where clause from the policy (ADR-006) or a service, with each id value made a bigint. Only plain
// objects and arrays are walked: AND, OR, { in: [...] } and the field conditions the policy builds.
export function toDbWhere(where) {
  if (Array.isArray(where)) return where.map(toDbWhere);
  if (where === null || typeof where !== "object" || where instanceof Date) return where;
  const out = {};
  for (const [key, value] of Object.entries(where)) {
    if (ID_KEYS.has(key) && value !== null && typeof value !== "object") out[key] = toDbId(value);
    else if (ID_KEYS.has(key) && value && Array.isArray(value.in)) out[key] = { ...value, in: value.in.map(toDbId) };
    else out[key] = toDbWhere(value);
  }
  return out;
}

// A row as the services see it: every bigint a string, nested rows included.
export function fromDb(row) {
  if (Array.isArray(row)) return row.map(fromDb);
  if (typeof row === "bigint") return String(row);
  if (row === null || typeof row !== "object" || row instanceof Date) return row;
  const out = {};
  for (const [key, value] of Object.entries(row)) out[key] = fromDb(value);
  return out;
}

// A user with the category ids FR-015 and the policy's Staff scope need.
const withCategoryIds = (user) => {
  if (!user) return null;
  const { categories, ...rest } = fromDb(user);
  return { ...rest, categoryIds: (categories ?? []).map((c) => c.categoryId) };
};

const accountEvent = (event) => ({
  userId: toDbId(event.userId),
  actorId: event.actorId == null ? null : toDbId(event.actorId),
  type: event.type,
  at: event.at,
  expiresAt: event.expiresAt ?? null,
});

// Raised inside requests.create when the category was deactivated after the submission's check (FR-027).
export class InactiveCategoryError extends Error {}

export function createStore(prisma) {
  const users = {
    async findByEmail(email) {
      return withCategoryIds(await prisma.user.findUnique({ where: { email }, include: { categories: true } }));
    },

    async findById(id) {
      const dbId = toDbId(id);
      if (dbId === NO_ROW) return null;
      return withCategoryIds(await prisma.user.findUnique({ where: { id: dbId }, include: { categories: true } }));
    },

    // FR-015: the active Staff authorised for a category, for the Coordinator's choice of assignee.
    async assignableStaff(categoryId) {
      const rows = await prisma.user.findMany({
        where: { role: "Staff", active: true, categories: { some: { categoryId: toDbId(categoryId) } } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
      return fromDb(rows);
    },

    // The queue's assignee filter (FR-014): every active Staff member, by name.
    async activeStaff() {
      return fromDb(await prisma.user.findMany({ where: { role: "Staff", active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }));
    },

    // reset.js: sets the code, its expiry and a failure count of 0, replacing any earlier code.
    async setResetCode(id, { resetCodeHash, resetCodeExpiresAt }, { event }) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: toDbId(id) },
          data: { resetCodeHash, resetCodeExpiresAt, resetFailedAttempts: 0 },
        }),
        prisma.accountEvent.create({ data: accountEvent(event) }),
      ]);
    },

    // reset.js: only while the account still holds that code hash. The count is added in the database, so
    // two wrong tries at once both count, and the code is cleared in the same statement at the limit.
    async recordResetFailure(id, { expectResetCodeHash, maxAttempts }, { eventIfWithdrawn }) {
      await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw`
          UPDATE users
             SET reset_failed_attempts = reset_failed_attempts + 1,
                 reset_code_hash = CASE WHEN reset_failed_attempts + 1 >= ${maxAttempts} THEN NULL ELSE reset_code_hash END,
                 reset_code_expires_at = CASE WHEN reset_failed_attempts + 1 >= ${maxAttempts} THEN NULL ELSE reset_code_expires_at END,
                 updated_at = now()
           WHERE id = ${toDbId(id)} AND reset_code_hash = ${expectResetCodeHash}
       RETURNING reset_code_hash IS NULL AS withdrawn`;
        if (rows.length === 1 && rows[0].withdrawn && eventIfWithdrawn) {
          await tx.accountEvent.create({ data: accountEvent(eventIfWithdrawn) });
        }
      });
    },

    // reset.js: only while the account still holds that code hash. Returns the rows written.
    async completeReset(id, { expectResetCodeHash, passwordHash }, { event }) {
      return prisma.$transaction(async (tx) => {
        const { count } = await tx.user.updateMany({
          where: { id: toDbId(id), resetCodeHash: expectResetCodeHash },
          data: {
            passwordHash,
            resetCodeHash: null,
            resetCodeExpiresAt: null,
            resetFailedAttempts: 0,
            sessionVersion: { increment: 1 },
          },
        });
        if (count === 1) await tx.accountEvent.create({ data: accountEvent(event) });
        return count;
      });
    },
  };

  const categories = {
    async activeIds() {
      const rows = await prisma.category.findMany({ where: { active: true }, select: { id: true } });
      return rows.map((r) => String(r.id));
    },

    // FR-006: the controlled list a Requester chooses from.
    async listActive() {
      return fromDb(await prisma.category.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }));
    },
  };

  const requests = {
    // ADR-007's request creation transaction: the category is checked again inside it, the next value of
    // the reference sequence is taken and formatted (DEC-017), and the request is inserted with its first
    // status history row, null to New.
    async create(data, { formatReference }) {
      return prisma.$transaction(async (tx) => {
        const categoryId = toDbId(data.categoryId);
        const category = await tx.category.findFirst({ where: { id: categoryId, active: true }, select: { id: true } });
        if (!category) throw new InactiveCategoryError("The category is no longer active.");
        const [{ value }] = await tx.$queryRaw`SELECT nextval('request_reference_seq') AS value`;
        const saved = await tx.request.create({
          data: {
            reference: formatReference(value),
            requesterId: toDbId(data.requesterId),
            categoryId,
            title: data.title,
            description: data.description,
            location: data.location,
            reportedUrgency: data.reportedUrgency,
            status: data.status,
            priority: data.priority ?? null,
            statusHistory: { create: { fromStatus: null, toStatus: data.status, actorId: toDbId(data.requesterId) } },
          },
          select: { reference: true, createdAt: true },
        });
        return saved;
      });
    },

    async findMany({ where, orderBy }) {
      return fromDb(await prisma.request.findMany({ where: toDbWhere(where), orderBy, include: { category: true } }));
    },

    // The staff queue (queue/service.js): one page and the total that match, read in one transaction so
    // they agree. Sorting by priority puts High before Medium before Low, and a request with no priority
    // last either way, since it has not been triaged yet (FR-021). PostgreSQL would sort the words
    // alphabetically, so for those two sorts the matching ids are ordered here and the page is read by id.
    async findQueue({ where, sort, skip, take }) {
      const dbWhere = toDbWhere(where);
      const include = { category: true, assignee: { select: { id: true, name: true } } };
      return prisma.$transaction(async (tx) => {
        const total = await tx.request.count({ where: dbWhere });
        let rows;
        if (sort === "priority_desc" || sort === "priority_asc") {
          const keys = await tx.request.findMany({ where: dbWhere, select: { id: true, priority: true, createdAt: true } });
          const sign = sort === "priority_desc" ? 1 : -1;
          keys.sort((a, b) => {
            const ra = PRIORITY_RANK[a.priority] ?? null;
            const rb = PRIORITY_RANK[b.priority] ?? null;
            if (ra === null || rb === null) return (ra === null) - (rb === null) || b.createdAt - a.createdAt;
            return sign * (rb - ra) || b.createdAt - a.createdAt;
          });
          const ids = keys.slice(skip, skip + take).map((k) => k.id);
          const found = await tx.request.findMany({ where: { id: { in: ids } }, include });
          const byId = new Map(found.map((r) => [r.id, r]));
          rows = ids.map((id) => byId.get(id));
        } else {
          const field = sort.startsWith("updated") ? "updatedAt" : "createdAt";
          const direction = sort.endsWith("_asc") ? "asc" : "desc";
          rows = await tx.request.findMany({ where: dbWhere, include, orderBy: [{ [field]: direction }, { id: direction }], skip, take });
        }
        return { rows: fromDb(rows), total };
      });
    },

    async findOne({ where, entryWhere }) {
      const row = await prisma.request.findFirst({
        where: toDbWhere(where),
        include: {
          category: true,
          statusHistory: { orderBy: { createdAt: "asc" } },
          actionEntries: { where: toDbWhere(entryWhere ?? {}), orderBy: { createdAt: "asc" } },
        },
      });
      return row ? fromDb(row) : null;
    },
  };

  // service.js: one transaction for a change, its status history row and its audit entries (ADR-001 rule 3).
  // If the function throws, Prisma rolls every write back.
  const store = {
    transaction(fn) {
      return prisma.$transaction(async (tx) =>
        fn({
          async updateRequest({ id, expect }, data) {
            const { count } = await tx.request.updateMany({ where: toDbWhere({ id, ...expect }), data: toDbWhere(data) });
            return count === 1;
          },
          async appendStatusHistory({ requestId, fromStatus, toStatus, actorId, reason }) {
            await tx.requestStatusHistory.create({
              data: { requestId: toDbId(requestId), fromStatus, toStatus, actorId: toDbId(actorId), reason: reason ?? null },
            });
          },
          // FR-026: append only. This module offers no update or delete of an audit entry.
          async appendAudit({ requestId, actorId, fieldChanged, previousValue, newValue }) {
            await tx.auditEntry.create({
              data: {
                requestId: toDbId(requestId),
                actorId: toDbId(actorId),
                fieldChanged,
                previousValue: previousValue == null ? null : String(previousValue),
                newValue: newValue == null ? null : String(newValue),
              },
            });
          },
          async appendActionEntry({ requestId, authorId, body, visibility }) {
            return fromDb(
              await tx.actionEntry.create({
                data: { requestId: toDbId(requestId), authorId: toDbId(authorId), body, visibility },
                select: { createdAt: true },
              }),
            );
          },
        }),
      );
    },
  };

  return { users, categories, requests, store };
}
