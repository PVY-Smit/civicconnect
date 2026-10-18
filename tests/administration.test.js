// User and category administration (FR-003, FR-006, FR-027, FR-028), against an in-memory store that
// follows the persistence module's contract. The same operations run against PostgreSQL in TC-32.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addCategory,
  createUser,
  deactivateCategory,
  deactivateUser,
  listUsers,
  renameCategory,
  SETUP_CODE_HOURS,
} from "../src/modules/administration/service.js";
import { createAdministrationHandlers } from "../src/modules/administration/http.js";

const MANAGER = { id: "8", role: "Manager", categoryIds: [] };
const COORDINATOR = { id: "7", role: "Coordinator", categoryIds: [] };
const NOW = Date.UTC(2026, 9, 17, 8);

function fakeStore() {
  const users = new Map([
    ["8", { id: "8", name: "Mo Manager", email: "mo@example.org", role: "Manager", active: true, categoryIds: [] }],
    ["5", { id: "5", name: "Sam Staff", email: "sam@example.org", role: "Staff", active: true, categoryIds: ["10"] }],
  ]);
  const cats = new Map([
    ["10", { id: "10", name: "Roads", active: true }],
    ["11", { id: "11", name: "Water", active: false }],
  ]);
  const events = [];
  const openAssigned = new Map([["5", 2]]);
  let next = 100;
  return {
    events,
    openAssigned,
    users: {
      findById: async (id) => users.get(String(id)) ?? null,
      findByEmail: async (email) => [...users.values()].find((u) => u.email === email) ?? null,
      listAll: async () => [...users.values()].map((u) => ({ ...u, categoryNames: u.categoryIds.map((id) => cats.get(id).name) })),
      create: async (data, { event }) => {
        const user = { id: String(next++), active: true, ...data };
        users.set(user.id, user);
        events.push({ ...event, userId: user.id });
        return { id: user.id, name: user.name };
      },
      deactivate: async (id, { event }) => {
        const user = users.get(String(id));
        if (!user?.active) return 0;
        user.active = false;
        events.push(event);
        return 1;
      },
      countOpenAssigned: async (id) => openAssigned.get(String(id)) ?? 0,
      setResetCode: async (id, fields, { event }) => {
        Object.assign(users.get(String(id)), fields);
        events.push(event);
      },
    },
    categories: {
      activeIds: async () => [...cats.values()].filter((c) => c.active).map((c) => c.id),
      listAll: async () => [...cats.values()],
      findByName: async (name) => [...cats.values()].find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? null,
      create: async (name) => {
        const c = { id: String(next++), name, active: true };
        cats.set(c.id, c);
        return c;
      },
      rename: async (id, name) => {
        const c = cats.get(String(id));
        if (!c) return null;
        c.name = name;
        return c;
      },
      deactivate: async (id) => {
        const c = cats.get(String(id));
        if (!c) return null;
        c.active = false;
        return c;
      },
    },
    hashSecret: async (s) => `hashed:${s}`,
    now: () => NOW,
  };
}

const staffInput = (over = {}) => ({ name: "Tess Technician", email: " Tess@Example.org ", role: "Staff", categoryIds: ["10"], ...over });

test("FR-003: a Manager creates an account with no password and gets a setup code once", async () => {
  const store = fakeStore();
  const result = await createUser({ actor: MANAGER, input: staffInput() }, store);
  assert.equal(result.ok, true);
  assert.deepEqual(result.user, { id: "100", name: "Tess Technician" });
  assert.match(result.setupCode.code, /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
  assert.equal(result.setupCode.expiresAt.getTime(), NOW + SETUP_CODE_HOURS * 60 * 60 * 1000);
  const saved = await store.users.findById("100");
  assert.equal(saved.email, "tess@example.org", "the email is stored as sign-in reads it");
  assert.equal(saved.passwordHash, undefined, "no password is set by the Manager");
  assert.ok(saved.resetCodeHash.startsWith("hashed:"), "only the code's hash is stored");
  assert.deepEqual(store.events.map((e) => e.type), ["account-created", "reset-code-issued"]);
});

test("FR-003: each invalid field gets its own message, and nothing is created", async () => {
  const store = fakeStore();
  const result = await createUser({ actor: MANAGER, input: { name: " ", email: "not-an-email", role: "Admin" } }, store);
  assert.deepEqual(Object.keys(result.errors).sort(), ["email", "name", "role"]);
  assert.equal(store.events.length, 0);
  assert.ok((await createUser({ actor: MANAGER, input: staffInput({ email: "SAM@example.org" }) }, store)).errors.email, "a taken email, ignoring case");
  assert.ok((await createUser({ actor: MANAGER, input: staffInput({ categoryIds: [] }) }, store)).errors.categoryIds, "Staff need a category");
  assert.ok(
    (await createUser({ actor: MANAGER, input: staffInput({ categoryIds: ["11"] }) }, store)).errors.categoryIds,
    "FR-006: an inactive category cannot be given",
  );
  assert.ok((await createUser({ actor: MANAGER, input: staffInput({ name: "Tess\u0000" }) }, store)).errors.name);
});

test("a Requester and a Coordinator are created without categories", async () => {
  const store = fakeStore();
  await createUser({ actor: MANAGER, input: staffInput({ role: "Requester", categoryIds: ["10"] }) }, store);
  assert.deepEqual((await store.users.findById("100")).categoryIds, []);
});

test("only a Manager may administer accounts and categories", async () => {
  const store = fakeStore();
  assert.equal((await createUser({ actor: COORDINATOR, input: staffInput() }, store)).code, "not-authorised");
  assert.equal((await listUsers({ actor: COORDINATOR }, store)).code, "not-authorised");
  assert.equal((await addCategory({ actor: COORDINATOR, name: "Parks" }, store)).code, "not-authorised");
  assert.equal((await deactivateUser({ actor: null, userId: "5" }, store)).code, "not-signed-in");
  assert.equal(store.events.length, 0);
});

test("FR-028: deactivation is refused while open requests are assigned, and for one's own account", async () => {
  const store = fakeStore();
  const busy = await deactivateUser({ actor: MANAGER, userId: "5" }, store);
  assert.deepEqual([busy.code, (await store.users.findById("5")).active], ["conflict", true]);
  assert.equal((await deactivateUser({ actor: MANAGER, userId: "8" }, store)).code, "conflict");
  store.openAssigned.set("5", 0);
  assert.deepEqual(await deactivateUser({ actor: MANAGER, userId: "5" }, store), { ok: true, changed: true });
  assert.equal((await store.users.findById("5")).active, false);
  assert.deepEqual(await deactivateUser({ actor: MANAGER, userId: "5" }, store), { ok: true, changed: false });
  assert.equal((await deactivateUser({ actor: MANAGER, userId: "999" }, store)).code, "not-found");
  assert.deepEqual(store.events.map((e) => e.type), ["account-deactivated"]);
});

test("FR-027: categories are added, renamed and deactivated, with names unique ignoring case", async () => {
  const store = fakeStore();
  const added = await addCategory({ actor: MANAGER, name: "  Parks " }, store);
  assert.deepEqual(added.category, { id: "100", name: "Parks", active: true });
  assert.ok((await addCategory({ actor: MANAGER, name: "roads" }, store)).errors.name);
  assert.ok((await addCategory({ actor: MANAGER, name: "" }, store)).errors.name);
  assert.ok((await addCategory({ actor: MANAGER, name: "x".repeat(201) }, store)).errors.name);
  assert.ok((await renameCategory({ actor: MANAGER, id: "100", name: "Water" }, store)).errors.name, "taken by another category");
  assert.equal((await renameCategory({ actor: MANAGER, id: "100", name: "parks" }, store)).category.name, "parks", "its own name in another case");
  assert.equal((await deactivateCategory({ actor: MANAGER, id: "10" }, store)).category.active, false);
  assert.deepEqual(await store.categories.activeIds(), ["100"], "FR-006: no longer offered");
  assert.equal((await renameCategory({ actor: MANAGER, id: "999", name: "Other" }, store)).code, "not-found");
});

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("handler: the status codes and bodies the screens read", async () => {
  const handlers = createAdministrationHandlers(fakeStore());
  const call = async (name, actor, req = {}) => {
    const res = response();
    await handlers[name]({ actor, ...req }, res);
    return res;
  };
  assert.equal((await call("listUsers", null)).statusCode, 401);
  assert.deepEqual((await call("listUsers", COORDINATOR)).body, { error: "You are not authorised to do this." });
  const created = await call("createUser", MANAGER, { body: staffInput() });
  assert.equal(created.statusCode, 201);
  assert.deepEqual(Object.keys(created.body), ["user", "setupCode"]);
  assert.equal((await call("createUser", MANAGER, { body: {} })).statusCode, 400);
  const refused = await call("deactivateUser", MANAGER, { params: { id: "5" } });
  assert.deepEqual([refused.statusCode, Boolean(refused.body.error)], [409, true]);
  assert.equal((await call("addCategory", MANAGER, { body: { name: "Parks" } })).statusCode, 201);
  assert.equal((await call("deactivateCategory", MANAGER, { params: { id: "404" } })).statusCode, 404);
  const users = await call("listUsers", MANAGER);
  assert.deepEqual(users.body.users.find((u) => u.id === "5").categories, ["Roads"]);
});
