// A harness for the API suites (#121): the real route handlers of #111 to #117 behind the real
// authentication middleware, over an in-memory store.
//
// Each call carries a real signed session cookie, or none, and goes through authenticate before its
// handler, in the order the server will wire them. The store evaluates the query conditions the
// authorisation policy produces and its transactions really roll back, so what these suites check is the
// behaviour at the HTTP boundary: status codes, bodies, and what was or was not written. The same
// operations run against PostgreSQL through the persistence adapter in TC-32 (tests/api-postgres.test.js).

import { createAdministrationHandlers } from "../../src/modules/administration/http.js";
import { createIdentityAccess } from "../../src/modules/identity-access/http.js";
import { COOKIE_NAME, issueToken } from "../../src/modules/identity-access/session.js";
import { createSubmissionHandler } from "../../src/modules/request-capture/http.js";
import { createReferenceFormatter } from "../../src/modules/request-capture/reference.js";
import { createRequestAccessHandlers } from "../../src/modules/request-access/http.js";
import { createReportHandlers } from "../../src/modules/reports/http.js";
import { createWorkflowHandlers } from "../../src/modules/workflow-status/http.js";

const SECRET = "api-suite-session-secret-of-at-least-32-chars";
const NOW = Date.UTC(2026, 9, 7, 9);
const formatReference = createReferenceFormatter("api-suite-reference-key-of-at-least-32-chars");

// Category 10 and 11 are active; 12 exists but is deactivated (FR-006).
export const CATEGORIES = Object.freeze({ 10: "Street lighting", 11: "Water and sanitation", 12: "Retired category" });
export const ACTIVE_CATEGORY_IDS = Object.freeze([10, 11]);

export const USERS = Object.freeze({
  requester: { id: 1, name: "Rea Requester", role: "Requester", active: true, categoryIds: [] },
  otherRequester: { id: 2, name: "Otto Requester", role: "Requester", active: true, categoryIds: [] },
  coordinator: { id: 3, name: "Cora Coordinator", role: "Coordinator", active: true, categoryIds: [] },
  manager: { id: 4, name: "Max Manager", role: "Manager", active: true, categoryIds: [10] },
  staff: { id: 5, name: "Sam Staff", role: "Staff", active: true, categoryIds: [10] },
  staffElsewhere: { id: 6, name: "Tess Technician", role: "Staff", active: true, categoryIds: [11] },
  staffSecond: { id: 8, name: "Sipho Staff", role: "Staff", active: true, categoryIds: [10] },
  staffInactive: { id: 9, name: "Ina Inactive", role: "Staff", active: false, categoryIds: [10] },
});

// One signed-in user per role, each with category 10 in scope where the role is scoped by category.
export const BY_ROLE = Object.freeze({
  Requester: USERS.requester,
  Staff: USERS.staff,
  Coordinator: USERS.coordinator,
  Manager: USERS.manager,
});

export const VALID_SUBMISSION = Object.freeze({
  title: "Streetlight out",
  description: "The light outside number 14 has been off for a week.",
  categoryId: 10,
  location: "14 Oak Street",
  reportedUrgency: "Medium",
});

// Ids are compared as text. The persistence adapter turns every id into a string on the way out, so the
// services always compare like with like, and this store matches either form the harness uses. What it
// cannot show is the database's own types: a string where PostgreSQL holds a bigint, or a bigint in a
// JSON answer. TC-32 runs these operations against PostgreSQL for exactly that.
function evaluate(where, record) {
  return Object.entries(where ?? {}).every(([field, cond]) => {
    if (field === "AND") return cond.every((w) => evaluate(w, record));
    if (field === "OR") return cond.some((w) => evaluate(w, record));
    if (cond && typeof cond === "object" && "in" in cond) return cond.in.map(String).includes(String(record[field]));
    return String(record[field]) === String(cond);
  });
}

function memoryStore() {
  const state = { requests: [], audit: [], seq: 0 };
  const at = (n) => new Date(NOW + n * 60_000);
  const withCategory = (r) => ({ ...structuredClone(r), category: { name: CATEGORIES[r.categoryId] } });

  function insert(data) {
    state.seq += 1;
    const created = at(state.seq);
    const row = {
      id: state.seq,
      reference: formatReference(state.seq),
      assigneeId: null,
      priority: null,
      resolutionSummary: null,
      ...data,
      createdAt: created,
      updatedAt: created,
      statusHistory: [{ fromStatus: null, toStatus: "New", createdAt: created }],
      actionEntries: data.actionEntries ?? [],
    };
    state.requests.push(row);
    return row;
  }

  const requests = {
    async create(data) {
      const row = insert(data);
      return { reference: row.reference, createdAt: row.createdAt };
    },
    async findMany({ where }) {
      return state.requests.filter((r) => evaluate(where, r)).map(withCategory);
    },
    async findOne({ where, entryWhere }) {
      const r = state.requests.find((row) => evaluate(where, row));
      if (!r) return null;
      const out = withCategory(r);
      if (entryWhere) out.actionEntries = out.actionEntries.filter((e) => evaluate(entryWhere, e));
      return out;
    },
  };

  const tx = {
    async updateRequest({ id, expect }, data) {
      const row = state.requests.find((r) => r.id === id);
      if (!row || !Object.entries(expect).every(([k, v]) => (row[k] ?? null) === (v ?? null))) return 0;
      Object.assign(row, data, { updatedAt: at(++state.seq) });
      return 1;
    },
    async appendStatusHistory({ requestId, fromStatus, toStatus, actorId, reason }) {
      state.requests.find((r) => r.id === requestId).statusHistory.push({ fromStatus, toStatus, actorId, reason, createdAt: at(++state.seq) });
    },
    async appendAudit(entry) {
      state.audit.push(entry);
    },
    async appendActionEntry({ requestId, authorId, body, visibility }) {
      const saved = { authorId, body, visibility, createdAt: at(++state.seq) };
      state.requests.find((r) => r.id === requestId).actionEntries.push(saved);
      return saved;
    },
  };

  const store = {
    async transaction(fn) {
      const snapshot = structuredClone(state);
      try {
        return await fn(tx);
      } catch (error) {
        Object.assign(state, snapshot);
        throw error;
      }
    },
  };

  // Users and categories as the administration module's store states them (#115).
  state.users = Object.values(USERS).map((u) => ({ ...u, email: `${u.name.split(" ")[0].toLowerCase()}@civicconnect.test` }));
  state.categories = Object.entries(CATEGORIES).map(([id, name]) => ({ id: Number(id), name, active: ACTIVE_CATEGORY_IDS.includes(Number(id)) }));
  state.events = [];
  const userById = (id) => state.users.find((u) => String(u.id) === String(id)) ?? null;
  const users = {
    findById: async (id) => userById(id),
    findByEmail: async (email) => state.users.find((u) => u.email === email) ?? null,
    listAll: async () => state.users.map((u) => ({ ...u, categoryNames: u.categoryIds.map((c) => CATEGORIES[c]) })),
    create: async ({ name, email, role, categoryIds }, { event }) => {
      const user = { id: 100 + state.users.length, name, email, role, active: true, categoryIds: categoryIds.map(Number) };
      state.users.push(user);
      state.events.push({ ...event, userId: user.id });
      return { id: user.id, name };
    },
    deactivate: async (id, { event }) => {
      const user = userById(id);
      if (!user?.active) return 0;
      user.active = false;
      state.events.push(event);
      return 1;
    },
    countOpenAssigned: async (id) =>
      state.requests.filter((r) => String(r.assigneeId) === String(id) && ["New", "Assigned", "In Progress", "On Hold"].includes(r.status)).length,
    setResetCode: async (id, fields, { event }) => {
      Object.assign(userById(id), fields);
      state.events.push(event);
    },
  };
  const categories = {
    activeIds: async () => state.categories.filter((c) => c.active).map((c) => c.id),
    listAll: async () => state.categories.map((c) => ({ ...c, requestCount: state.requests.filter((r) => r.categoryId === c.id).length })),
    findByName: async (name) => state.categories.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? null,
    create: async (name) => {
      const c = { id: 20 + state.categories.length, name, active: true };
      state.categories.push(c);
      return c;
    },
    rename: async (id, name) => {
      const c = state.categories.find((x) => String(x.id) === String(id));
      if (c) c.name = name;
      return c ?? null;
    },
    deactivate: async (id) => {
      const c = state.categories.find((x) => String(x.id) === String(id));
      if (c) c.active = false;
      return c ?? null;
    },
  };
  // Management reporting (#117): the requests the where clause selects, with their category and assignee.
  const reportRows = async ({ where }) =>
    state.requests.filter((r) => evaluate(where, r)).map((r) => ({ ...withCategory(r), assignee: r.assigneeId ? userById(r.assigneeId) : null }));
  const reports = { forSummary: reportRows, openRequests: reportRows };
  return { state, insert, requests, store, users, categories, reports };
}

function fakeRes() {
  const res = { statusCode: null, body: undefined, headers: {} };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  res.end = () => res;
  res.setHeader = (name, value) => ((res.headers[name.toLowerCase()] = value), res);
  return res;
}

// Runs the chain in order; a step that answers without calling next ends it, as Express does.
async function run(chain, req) {
  const res = fakeRes();
  for (const step of chain) {
    let next = false;
    await step(req, res, () => {
      next = true;
    });
    if (!next) break;
  }
  return { status: res.statusCode, body: res.body };
}

const cookieFor = (user) => (user ? `${COOKIE_NAME}=${issueToken(user.id, { secret: SECRET, now: NOW })}` : undefined);

export function createApi() {
  const db = memoryStore();
  const identity = createIdentityAccess({
    users: db.users,
    verifyPassword: async () => false,
    dummyHash: "unused",
    secret: SECRET,
    secure: false,
    now: () => NOW,
  });
  const submit = createSubmissionHandler({ categories: db.categories, requests: db.requests, formatReference });
  const access = createRequestAccessHandlers({ requests: db.requests });
  const workflow = createWorkflowHandlers({ requests: db.requests, users: db.users, store: db.store });
  const admin = createAdministrationHandlers({ users: db.users, categories: db.categories, hashSecret: async (s) => `hashed:${s}`, now: () => NOW });
  const report = createReportHandlers({ reports: db.reports, overdueTargetDays: 10, now: () => new Date(NOW) });

  const call = (user, handler, { body, reference, id, query } = {}) =>
    run([identity.authenticate, handler], { headers: { cookie: cookieFor(user) }, body, params: { reference, id }, query: query ?? {} });

  const api = {
    submit: (user, body) => call(user, submit, { body }),
    listMine: (user) => call(user, access.listMine),
    detail: (user, reference) => call(user, access.detail, { reference }),
    move: (user, reference, to, change = {}) => call(user, workflow.status, { reference, body: { to, ...change } }),
    priority: (user, reference, priority) => call(user, workflow.priority, { reference, body: { priority } }),
    entry: (user, reference, body, visibility) => call(user, workflow.actionEntry, { reference, body: { body, visibility } }),
    // Management reporting (#117) and administration (#115).
    reportSummary: (user) => call(user, report.summary),
    overdue: (user) => call(user, report.overdue),
    listUsers: (user) => call(user, admin.listUsers),
    createUser: (user, body) => call(user, admin.createUser, { body }),
    deactivateUser: (user, id) => call(user, admin.deactivateUser, { id }),
    allCategories: (user) => call(user, admin.listAllCategories),
    addCategory: (user, name) => call(user, admin.addCategory, { body: { name } }),
    renameCategory: (user, id, name) => call(user, admin.renameCategory, { id, body: { name } }),
    deactivateCategory: (user, id) => call(user, admin.deactivateCategory, { id }),
    // A function with no endpoint is reached through the permission check alone, in front of a handler
    // that only answers 200. Only editAuditEntry is: FR-026 forbids an endpoint that edits an audit entry.
    guarded: (user, fn) =>
      run([identity.authenticate, identity.requirePermission(fn), (req, res) => res.status(200).json({ reached: true })], {
        headers: { cookie: cookieFor(user) },
      }),
  };

  // A request already in the store, in any state, as the persistence layer would hold it.
  const seed = ({ status = "New", requesterId = USERS.otherRequester.id, categoryId = 10, assigneeId = null, entries = [] } = {}) =>
    db.insert({
      title: "Seeded request",
      description: "Seeded for the API suites.",
      location: "1 Test Street",
      reportedUrgency: "Medium",
      requesterId,
      categoryId,
      status,
      assigneeId,
      actionEntries: entries.map((e, i) => ({ authorId: USERS.staff.id, createdAt: new Date(NOW - (i + 1) * 60_000), ...e })),
    });

  const find = (reference) => db.state.requests.find((r) => r.reference === reference);
  return { api, seed, find, db };
}
