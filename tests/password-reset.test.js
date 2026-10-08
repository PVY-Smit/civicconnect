// Tests for the Manager-assisted password reset (FR-004, NFR-004, #111).
//
// The store and the hash are fakes, as in tests/identity-access.test.js: the hash is "hash:<value>", and
// verifySecret records which stored hash it was asked to check, so the tests can show the dummy-hash check
// runs when there is no usable account. The store's completeReset is conditional on the code hash, as the
// persistence adapter's will be. The PostgreSQL versions are under #121.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CODE_ALPHABET,
  CODE_LIFETIME_HOURS,
  generateCode,
  issueResetCode,
  normaliseCode,
  PASSWORD_MAX,
  PASSWORD_MIN,
  RESET_FAILURE,
  resetPassword,
} from "../src/modules/identity-access/reset.js";
import { createIdentityAccess } from "../src/modules/identity-access/http.js";
import { signIn } from "../src/modules/identity-access/sign-in.js";

const NOW = Date.UTC(2026, 9, 8, 8, 0, 0);
const HOUR = 60 * 60 * 1000;
const DUMMY = "hash:__dummy__";
const SECRET = "test-secret-that-is-at-least-32-characters";

const MANAGER = { id: 4, role: "Manager", categoryIds: [10] };
const actorFor = (role, id = 9) => ({ id, role, categoryIds: [] });

function fakeStore(list) {
  const users = list.map((u) => ({ resetCodeHash: null, resetCodeExpiresAt: null, ...u }));
  const writes = [];
  const findByEmailCalls = [];
  return {
    users,
    writes,
    findByEmailCalls,
    async findById(id) {
      return users.find((u) => String(u.id) === String(id)) ?? null;
    },
    async findByEmail(email) {
      findByEmailCalls.push(email);
      return users.find((u) => u.email === email) ?? null;
    },
    async setResetCode(id, fields) {
      writes.push({ op: "setResetCode", id, fields });
      Object.assign(users.find((u) => u.id === id), fields);
    },
    async completeReset(id, { expectResetCodeHash, passwordHash }) {
      const u = users.find((x) => x.id === id);
      if (!u || u.resetCodeHash !== expectResetCodeHash) return 0;
      writes.push({ op: "completeReset", id });
      Object.assign(u, { passwordHash, resetCodeHash: null, resetCodeExpiresAt: null });
      return 1;
    },
  };
}

const USERS = () => [
  { id: 1, email: "rea@example.org", name: "Rea", role: "Requester", active: true, passwordHash: "hash:old password" },
  { id: 2, email: "gone@example.org", name: "Gone", role: "Staff", active: false, passwordHash: "hash:whatever1" },
  { id: 4, email: "max@example.org", name: "Max", role: "Manager", active: true, passwordHash: "hash:manager pw" },
];

function deps(store, { at = NOW } = {}) {
  const verifyCalls = [];
  const clock = { now: at };
  return {
    clock,
    verifyCalls,
    d: {
      users: store,
      hashSecret: async (value) => `hash:${value}`,
      verifySecret: async (hash, value) => {
        verifyCalls.push(hash);
        return hash === `hash:${value}`;
      },
      dummyHash: DUMMY,
      now: () => clock.now,
    },
  };
}

async function issued(store, d, userId = 1) {
  const r = await issueResetCode({ actor: MANAGER, userId }, d);
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.code;
}

// ---- issuing a code ----

test("FR-004: a Manager gets a one-time code in the agreed form, and only its hash is stored", async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  const r = await issueResetCode({ actor: MANAGER, userId: "1" }, d);
  assert.equal(r.ok, true);
  assert.match(r.code, new RegExp(`^[${CODE_ALPHABET}]{4}-[${CODE_ALPHABET}]{4}$`));
  assert.equal(r.expiresAt.getTime(), NOW + CODE_LIFETIME_HOURS * HOUR);
  assert.equal(store.users[0].resetCodeHash, `hash:${normaliseCode(r.code)}`);
  assert.ok(!JSON.stringify(store.users).includes(r.code), "the code itself is never stored");
  assert.equal(store.users[0].passwordHash, "hash:old password", "issuing a code does not touch the password");
});

test("FR-002, FR-004: only a role with manageUsers can issue a code, and a refusal stores nothing", async () => {
  for (const role of ["Requester", "Staff", "Coordinator"]) {
    const store = fakeStore(USERS());
    const r = await issueResetCode({ actor: actorFor(role), userId: 1 }, deps(store).d);
    assert.equal(r.code, "not-authorised", role);
    assert.equal(store.writes.length, 0, role);
  }
  const store = fakeStore(USERS());
  assert.equal((await issueResetCode({ actor: null, userId: 1 }, deps(store).d)).code, "not-signed-in");
  assert.equal(store.writes.length, 0);
});

test("a code is not issued for an account that does not exist or is deactivated (FR-028)", async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  assert.equal((await issueResetCode({ actor: MANAGER, userId: 99 }, d)).code, "not-found");
  assert.equal((await issueResetCode({ actor: MANAGER, userId: 2 }, d)).code, "inactive");
  assert.equal(store.writes.length, 0);
});

test("codes come only from the alphabet without look-alikes, and do not repeat", () => {
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const c = generateCode();
    assert.match(c, /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
    seen.add(c);
  }
  assert.equal(seen.size, 2000);
  for (const ch of "01OIL") assert.ok(!CODE_ALPHABET.includes(ch), ch);
});

// ---- using a code ----

test("FR-004: the code sets the new password, which then signs in, and the code is cleared", async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  const code = await issued(store, d);
  assert.deepEqual(await resetPassword({ email: "rea@example.org", code, newPassword: "a new passphrase" }, d), { ok: true });
  assert.equal(store.users[0].passwordHash, "hash:a new passphrase");
  assert.equal(store.users[0].resetCodeHash, null);
  assert.equal(store.users[0].resetCodeExpiresAt, null);
  const verifyPassword = async (hash, pw) => hash === `hash:${pw}`;
  assert.equal((await signIn({ email: "rea@example.org", password: "a new passphrase" }, { users: store, verifyPassword, dummyHash: DUMMY })).ok, true);
  assert.equal((await signIn({ email: "rea@example.org", password: "old password" }, { users: store, verifyPassword, dummyHash: DUMMY })).ok, false);
});

test("FR-004: a code works once", async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  const code = await issued(store, d);
  assert.equal((await resetPassword({ email: "rea@example.org", code, newPassword: "first new one" }, d)).ok, true);
  const again = await resetPassword({ email: "rea@example.org", code, newPassword: "second new one" }, d);
  assert.deepEqual(again, { ok: false, code: "reset-failed", message: RESET_FAILURE });
  assert.equal(store.users[0].passwordHash, "hash:first new one");
});

test("FR-004: a code expires after its lifetime, and works until then", async () => {
  const store = fakeStore(USERS());
  const { d, clock } = deps(store);
  const code = await issued(store, d);
  clock.now = NOW + CODE_LIFETIME_HOURS * HOUR;
  assert.equal((await resetPassword({ email: "rea@example.org", code, newPassword: "too late now" }, d)).ok, false, "at the expiry time");
  clock.now = NOW + CODE_LIFETIME_HOURS * HOUR - 1;
  assert.equal((await resetPassword({ email: "rea@example.org", code, newPassword: "just in time" }, d)).ok, true, "a moment before it");
});

test("FR-004: issuing a new code replaces the old one", async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  const first = await issued(store, d);
  const second = await issued(store, d);
  assert.notEqual(first, second);
  assert.equal((await resetPassword({ email: "rea@example.org", code: first, newPassword: "with the old code" }, d)).ok, false);
  assert.equal((await resetPassword({ email: "rea@example.org", code: second, newPassword: "with the new code" }, d)).ok, true);
});

test("the code is accepted however the user types it: lower case, spaces, with or without the hyphen", async () => {
  for (const shape of [(c) => c.toLowerCase(), (c) => c.replace("-", ""), (c) => ` ${c.replace("-", " ")} `]) {
    const store = fakeStore(USERS());
    const { d } = deps(store);
    const code = await issued(store, d);
    assert.equal((await resetPassword({ email: " REA@example.org ", code: shape(code), newPassword: "typed loosely" }, d)).ok, true, shape(code));
  }
});

test("FR-004: every failure gets the same answer, and the code is checked even when there is no usable account", async () => {
  const cases = {
    "unknown email": async () => ({ email: "nobody@example.org", code: "ABCD-EFGH" }),
    "deactivated account": async () => ({ email: "gone@example.org", code: "ABCD-EFGH" }),
    "deactivated after the code was issued (FR-028)": async (store, d) => {
      const code = await issued(store, d);
      store.users[0].active = false;
      return { email: "rea@example.org", code };
    },
    "no code issued": async () => ({ email: "max@example.org", code: "ABCD-EFGH" }),
    "wrong code": async (store, d) => (await issued(store, d), { email: "rea@example.org", code: "ABCD-EFGH" }),
    "expired code": async (store, d, clock) => {
      const code = await issued(store, d);
      clock.now += CODE_LIFETIME_HOURS * HOUR + 1;
      return { email: "rea@example.org", code };
    },
    "no email": async () => ({ email: "", code: "ABCD-EFGH" }),
    "no code": async (store, d) => (await issued(store, d), { email: "rea@example.org", code: "" }),
  };
  const answers = new Set();
  for (const [label, make] of Object.entries(cases)) {
    const store = fakeStore(USERS());
    const { d, verifyCalls, clock } = deps(store);
    const input = await make(store, d, clock);
    verifyCalls.length = 0;
    const r = await resetPassword({ ...input, newPassword: "a valid password" }, d);
    answers.add(JSON.stringify(r));
    assert.equal(verifyCalls.length, 1, `${label}: one code check, so the time taken does not reveal the account`);
    assert.ok(!store.writes.some((w) => w.op === "completeReset"), `${label}: nothing written`);
  }
  assert.deepEqual([...answers], [JSON.stringify({ ok: false, code: "reset-failed", message: RESET_FAILURE })]);
});

test("the new password's length is checked first, before any lookup, so its message reveals nothing", async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  const code = await issued(store, d);
  for (const [pw, ok] of [
    ["x".repeat(PASSWORD_MIN - 1), false],
    ["x".repeat(PASSWORD_MIN), true],
  ]) {
    const fresh = fakeStore(USERS());
    const f = deps(fresh).d;
    const c = await issued(fresh, f);
    assert.equal((await resetPassword({ email: "rea@example.org", code: c, newPassword: pw }, f)).ok, ok, `${pw.length} characters`);
  }
  for (const pw of ["", undefined, 42, "\u{1F600}".repeat(PASSWORD_MIN - 1), "x".repeat(PASSWORD_MAX + 1)]) {
    store.findByEmailCalls.length = 0;
    const r = await resetPassword({ email: "nobody@example.org", code, newPassword: pw }, d);
    assert.equal(r.code, "invalid", JSON.stringify(pw));
    assert.ok(r.errors.newPassword);
    assert.equal(store.findByEmailCalls.length, 0, "no lookup is made");
  }
  assert.equal((await resetPassword({ email: "rea@example.org", code, newPassword: "x".repeat(PASSWORD_MAX) }, d)).ok, true, "the maximum is allowed");
});

test("a code replaced between the check and the write is refused, so it cannot be used twice at once", async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  const code = await issued(store, d);
  const realComplete = store.completeReset.bind(store);
  store.completeReset = async (id, args) => {
    store.users[0].resetCodeHash = "hash:SOMEONE-ELSE"; // another use, or a new code, lands first
    return realComplete(id, args);
  };
  assert.equal((await resetPassword({ email: "rea@example.org", code, newPassword: "racing for it" }, d)).ok, false);
  assert.equal(store.users[0].passwordHash, "hash:old password");
});

// ---- the routes ----

function routes(store, at = NOW) {
  const ia = createIdentityAccess({
    users: store,
    verifyPassword: async (hash, pw) => hash === `hash:${pw}`,
    hashPassword: async (pw) => `hash:${pw}`,
    dummyHash: DUMMY,
    secret: SECRET,
    secure: false,
    now: () => at,
  });
  const call = async (handler, req) => {
    const res = { statusCode: null, body: undefined, ended: false };
    res.status = (c) => ((res.statusCode = c), res);
    res.json = (b) => ((res.body = b), res);
    res.end = () => ((res.ended = true), res);
    await handler(req, res);
    return res;
  };
  return { ia, call };
}

test("POST /api/users/:id/reset-code answers 200 with the code and expiry, 403, 404 or 409", async () => {
  const store = fakeStore(USERS());
  const { ia, call } = routes(store);
  const ok = await call(ia.issueResetCode, { actor: MANAGER, params: { id: "1" } });
  assert.equal(ok.statusCode, 200);
  assert.deepEqual(Object.keys(ok.body).sort(), ["code", "expiresAt"]);
  assert.equal((await call(ia.issueResetCode, { actor: actorFor("Coordinator"), params: { id: "1" } })).statusCode, 403);
  assert.equal((await call(ia.issueResetCode, { actor: MANAGER, params: { id: "99" } })).statusCode, 404);
  assert.equal((await call(ia.issueResetCode, { actor: MANAGER, params: { id: "2" } })).statusCode, 409);
  assert.equal((await call(ia.issueResetCode, { params: { id: "1" } })).statusCode, 401);
});

test("POST /api/auth/reset answers 204, 400 with the password's error, or 400 with the one generic message", async () => {
  const store = fakeStore(USERS());
  const { ia, call } = routes(store);
  const { body } = await call(ia.issueResetCode, { actor: MANAGER, params: { id: "1" } });
  const short = await call(ia.resetPassword, { body: { email: "rea@example.org", code: body.code, newPassword: "short" } });
  assert.equal(short.statusCode, 400);
  assert.ok(short.body.errors.newPassword);
  const wrong = await call(ia.resetPassword, { body: { email: "rea@example.org", code: "ABCD-EFGH", newPassword: "long enough" } });
  assert.deepEqual([wrong.statusCode, wrong.body], [400, { error: RESET_FAILURE }]);
  const nobody = await call(ia.resetPassword, { body: { email: "nobody@example.org", code: body.code, newPassword: "long enough" } });
  assert.deepEqual([nobody.statusCode, nobody.body], [400, { error: RESET_FAILURE }], "the same body for an account that does not exist");
  const done = await call(ia.resetPassword, { body: { email: "rea@example.org", code: body.code, newPassword: "long enough" } });
  assert.equal(done.statusCode, 204);
  assert.equal(done.ended, true);
  assert.equal((await call(ia.resetPassword, {})).statusCode, 400, "no body at all");
});
