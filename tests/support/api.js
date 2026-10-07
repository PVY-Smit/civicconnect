// A harness for the API suites (#121): the real route handlers of #111 to #113 behind the real
// authentication middleware, over an in-memory store.
//
// Each call carries a real signed session cookie, or none, and goes through authenticate before its
// handler, in the order the server will wire them. The store evaluates the query conditions the
// authorisation policy produces and its transactions really roll back, so what these suites check is the
// behaviour at the HTTP boundary: status codes, bodies, and what was or was not written. The same suites
// run against PostgreSQL once the persistence adapter (#108, #109) is wired; only this file changes.

import { createIdentityAccess } from "../../src/modules/identity-access/http.js";
import { COOKIE_NAME, issueToken } from "../../src/modules/identity-access/session.js";
import { createSubmissionHandler } from "../../src/modules/request-capture/http.js";
import { createReferenceFormatter } from "../../src/modules/request-capture/reference.js";
import { createRequestAccessHandlers } from "../../src/modules/request-access/http.js";
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
      // The column is an integer; the adapter converts the id the validator returns as a string (#108).
      categoryId: Number(data.categoryId),
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

  const users = { findById: async (id) => Object.values(USERS).find((u) => String(u.id) === String(id)) ?? null };
  const categories = { activeIds: async () => [...ACTIVE_CATEGORY_IDS] };
  return { state, insert, requests, store, users, categories };
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

  const call = (user, handler, { body, reference } = {}) =>
    run([identity.authenticate, handler], { headers: { cookie: cookieFor(user) }, body, params: { reference } });

  const api = {
    submit: (user, body) => call(user, submit, { body }),
    listMine: (user) => call(user, access.listMine),
    detail: (user, reference) => call(user, access.detail, { reference }),
    move: (user, reference, to, change = {}) => call(user, workflow.status, { reference, body: { to, ...change } }),
    priority: (user, reference, priority) => call(user, workflow.priority, { reference, body: { priority } }),
    entry: (user, reference, body, visibility) => call(user, workflow.actionEntry, { reference, body: { body, visibility } }),
    // A function whose own endpoint is not built yet (#115, #117) is reached through the permission check
    // its route will use, in front of a handler that only answers 200.
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
