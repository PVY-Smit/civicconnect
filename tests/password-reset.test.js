// Tests for the Manager-assisted password reset (FR-004, NFR-004, #111).
//
// The store and the hash are fakes, as in tests/identity-access.test.js: the hash is "hash:<value>", and
// verifySecret records which stored hash it was asked to check, so the tests can show the dummy-hash check
// runs when there is no usable account. The store's writes are conditional on the code hash, as the
// persistence adapter's will be, and its reads return copies, as a database does. The PostgreSQL versions
// are under #121.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CODE_ALPHABET,
  CODE_LIFETIME_HOURS,
  generateCode,
  issueResetCode,
  MAX_LIFETIME_HOURS,
  normaliseCode,
  PASSWORD_MAX,
  PASSWORD_MIN,
  RESET_FAILURE,
  RESET_MAX_ATTEMPTS,
  resetPassword,
  SAME_PASSWORD,
} from "../src/modules/identity-access/reset.js";
import { limitConcurrency, MAX_CONCURRENT_HASHES } from "../src/modules/identity-access/concurrency.js";
import { createIdentityAccess } from "../src/modules/identity-access/http.js";
import { issueToken, readSession } from "../src/modules/identity-access/session.js";
import { signIn } from "../src/modules/identity-access/sign-in.js";

const NOW = Date.UTC(2026, 9, 8, 8, 0, 0);
const HOUR = 60 * 60 * 1000;
const DUMMY = "hash:__dummy__";
const SECRET = "test-secret-that-is-at-least-32-characters";

const MANAGER = { id: 4, role: "Manager", categoryIds: [10] };
const actorFor = (role, id = 9) => ({ id, role, categoryIds: [] });

function fakeStore(list) {
  const users = list.map((u) => ({ resetCodeHash: null, resetCodeExpiresAt: null, resetFailedAttempts: 0, sessionVersion: 0, ...u }));
  const writes = [];
  const events = [];
  const findByEmailCalls = [];
  const copy = (u) => (u ? structuredClone(u) : null);
  const row = (id) => users.find((u) => u.id === id);
  return {
    users,
    writes,
    events,
    findByEmailCalls,
    async findById(id) {
      return copy(users.find((u) => String(u.id) === String(id)));
    },
    async findByEmail(email) {
      findByEmailCalls.push(email);
      return copy(users.find((u) => u.email === email));
    },
    async setResetCode(id, fields, { event }) {
      writes.push({ op: "setResetCode", id, fields });
      Object.assign(row(id), fields, { resetFailedAttempts: 0 });
      events.push(event);
    },
    async recordResetFailure(id, { expectResetCodeHash, maxAttempts }, { eventIfWithdrawn }) {
      const u = row(id);
      if (!u || u.resetCodeHash !== expectResetCodeHash) return 0;
      writes.push({ op: "recordResetFailure", id });
      u.resetFailedAttempts += 1; // count = count + 1, in one step, as the adapter's UPDATE does
      if (u.resetFailedAttempts >= maxAttempts) {
        Object.assign(u, { resetCodeHash: null, resetCodeExpiresAt: null });
        events.push(eventIfWithdrawn);
      }
      return 1;
    },
    async completeReset(id, { expectResetCodeHash, maxAttempts, passwordHash }, { event }) {
      const u = row(id);
      if (!u || u.resetCodeHash !== expectResetCodeHash || !(u.resetFailedAttempts < maxAttempts)) return 0;
      writes.push({ op: "completeReset", id });
      Object.assign(u, { passwordHash, resetCodeHash: null, resetCodeExpiresAt: null, resetFailedAttempts: 0, sessionVersion: u.sessionVersion + 1 });
      events.push(event);
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

const reset = (d, code, newPassword = "a new passphrase", email = "rea@example.org") => resetPassword({ email, code, newPassword }, d);

// A wrong code in the right form, different from the one issued.
const wrongCode = (code) => (normaliseCode(code) === "ABCDEFGH" ? "ABCD-EFGJ" : "ABCD-EFGH");

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

test("issuing a code is recorded with who issued it, for whom and when, and the record holds no code", async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  const r = await issueResetCode({ actor: MANAGER, userId: 1 }, d);
  assert.deepEqual(store.events, [{ type: "reset-code-issued", actorId: 4, userId: 1, at: new Date(NOW), expiresAt: r.expiresAt }]);
  const text = JSON.stringify(store.events);
  assert.ok(!text.includes(r.code) && !text.includes(normaliseCode(r.code)), "neither form of the code is in the record");
});

test("FR-002, FR-004: only a role with manageUsers can issue a code, and a refusal stores nothing", async () => {
  for (const role of ["Requester", "Staff", "Coordinator"]) {
    const store = fakeStore(USERS());
    const r = await issueResetCode({ actor: actorFor(role), userId: 1 }, deps(store).d);
    assert.equal(r.code, "not-authorised", role);
    assert.equal(store.writes.length + store.events.length, 0, role);
  }
  const store = fakeStore(USERS());
  assert.equal((await issueResetCode({ actor: null, userId: 1 }, deps(store).d)).code, "not-signed-in");
  assert.equal(store.writes.length + store.events.length, 0);
});

test("a code is not issued for an account that does not exist or is deactivated (FR-028)", async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  assert.equal((await issueResetCode({ actor: MANAGER, userId: 99 }, d)).code, "not-found");
  assert.equal((await issueResetCode({ actor: MANAGER, userId: 2 }, d)).code, "inactive");
  assert.equal(store.writes.length, 0);
});

test("a code issued before the account was deactivated cannot be used, and no new one can be issued", async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  const code = await issued(store, d);
  store.users[0].active = false;
  assert.equal((await issueResetCode({ actor: MANAGER, userId: 1 }, d)).code, "inactive");
  assert.deepEqual(await reset(d, code), { ok: false, code: "reset-failed", message: RESET_FAILURE });
  assert.equal(store.users[0].passwordHash, "hash:old password");
});

test("a caller can choose the code's lifetime, up to the maximum, for a new account's first password (FR-003)", async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  const r = await issueResetCode({ actor: MANAGER, userId: 1, lifetimeHours: 72 }, d);
  assert.equal(r.expiresAt.getTime(), NOW + 72 * HOUR);
  assert.equal((await issueResetCode({ actor: MANAGER, userId: 1, lifetimeHours: MAX_LIFETIME_HOURS }, d)).ok, true);
  for (const lifetimeHours of [0, -1, MAX_LIFETIME_HOURS + 1, Number.NaN, "24", Infinity]) {
    await assert.rejects(issueResetCode({ actor: MANAGER, userId: 1, lifetimeHours }, d), /lifetime/, String(lifetimeHours));
  }
});

test("a caller who may not issue codes is refused before the lifetime is checked, whatever lifetime they pass", async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  for (const lifetimeHours of [-1, 0, MAX_LIFETIME_HOURS + 1, Number.NaN]) {
    assert.deepEqual(await issueResetCode({ actor: null, userId: 1, lifetimeHours }, d), { ok: false, code: "not-signed-in" }, String(lifetimeHours));
    assert.deepEqual(await issueResetCode({ actor: actorFor("Coordinator"), userId: 1, lifetimeHours }, d), { ok: false, code: "not-authorised" }, String(lifetimeHours));
    await assert.rejects(issueResetCode({ actor: MANAGER, userId: 1, lifetimeHours }, d), /lifetime/, "a Manager still gets the lifetime error");
  }
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
  assert.match(generateCode(undefined), /^[A-Z0-9]{4}-[A-Z0-9]{4}$/, "undefined falls back to crypto.randomInt");
});

// ---- using a code ----

test("FR-004: the code sets the new password, which then signs in, and the code is cleared", async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  const code = await issued(store, d);
  assert.deepEqual(await reset(d, code), { ok: true });
  assert.equal(store.users[0].passwordHash, "hash:a new passphrase");
  assert.equal(store.users[0].resetCodeHash, null);
  assert.equal(store.users[0].resetCodeExpiresAt, null);
  assert.deepEqual(store.events.at(-1), { type: "password-reset", actorId: 1, userId: 1, at: new Date(NOW) });
  const verifyPassword = async (hash, pw) => hash === `hash:${pw}`;
  assert.equal((await signIn({ email: "rea@example.org", password: "a new passphrase" }, { users: store, verifyPassword, dummyHash: DUMMY })).ok, true);
  assert.equal((await signIn({ email: "rea@example.org", password: "old password" }, { users: store, verifyPassword, dummyHash: DUMMY })).ok, false);
});

test("FR-004: a code works once", async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  const code = await issued(store, d);
  assert.equal((await reset(d, code, "first new one")).ok, true);
  assert.deepEqual(await reset(d, code, "second new one"), { ok: false, code: "reset-failed", message: RESET_FAILURE });
  assert.equal(store.users[0].passwordHash, "hash:first new one");
});

test("FR-004: two uses of one code at the same moment: exactly one succeeds", async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  const code = await issued(store, d);
  const results = await Promise.all([reset(d, code, "first at once"), reset(d, code, "second at once")]);
  assert.deepEqual(results.map((r) => r.ok).sort(), [false, true]);
  assert.equal(store.writes.filter((w) => w.op === "completeReset").length, 1);
  assert.ok(["hash:first at once", "hash:second at once"].includes(store.users[0].passwordHash));
});

test("FR-004: a code expires after its lifetime, and works until then", async () => {
  const store = fakeStore(USERS());
  const { d, clock } = deps(store);
  const code = await issued(store, d);
  clock.now = NOW + CODE_LIFETIME_HOURS * HOUR;
  assert.equal((await reset(d, code, "too late now")).ok, false, "at the expiry time");
  clock.now = NOW + CODE_LIFETIME_HOURS * HOUR - 1;
  assert.equal((await reset(d, code, "just in time")).ok, true, "a moment before it");
});

test("FR-004: issuing a new code replaces the old one", async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  const first = await issued(store, d);
  const second = await issued(store, d);
  assert.notEqual(first, second);
  assert.equal((await reset(d, first, "with the old code")).ok, false);
  assert.equal((await reset(d, second, "with the new code")).ok, true);
});

test("the code is accepted however the user types it: lower case, spaces, with or without the hyphen", async () => {
  for (const shape of [(c) => c.toLowerCase(), (c) => c.replace("-", ""), (c) => ` ${c.replace("-", " ")} `]) {
    const store = fakeStore(USERS());
    const { d } = deps(store);
    const code = await issued(store, d);
    assert.equal((await reset(d, shape(code), "typed loosely", " REA@example.org ")).ok, true, shape(code));
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
    "wrong code": async (store, d) => {
      const code = await issued(store, d);
      return { email: "rea@example.org", code: wrongCode(code) };
    },
    "expired code": async (store, d, clock) => {
      const code = await issued(store, d);
      clock.now += CODE_LIFETIME_HOURS * HOUR + 1;
      return { email: "rea@example.org", code };
    },
    "withdrawn code": async (store, d) => {
      const code = await issued(store, d);
      for (let i = 0; i < RESET_MAX_ATTEMPTS; i++) await reset(d, wrongCode(code));
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

// ---- wrong tries (review of #146) ----

test(`a code is withdrawn after ${RESET_MAX_ATTEMPTS} wrong tries, and the right code then fails too`, async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  const code = await issued(store, d);
  for (let i = 1; i < RESET_MAX_ATTEMPTS; i++) assert.equal((await reset(d, wrongCode(code))).ok, false);
  assert.equal(store.users[0].resetFailedAttempts, RESET_MAX_ATTEMPTS - 1);
  assert.ok(store.users[0].resetCodeHash, "still live after one try fewer than the limit");
  assert.equal((await reset(d, wrongCode(code))).ok, false);
  assert.equal(store.users[0].resetCodeHash, null, "withdrawn at the limit");
  assert.deepEqual(store.events.at(-1), { type: "reset-code-withdrawn", actorId: null, userId: 1, at: new Date(NOW) });
  assert.deepEqual(await reset(d, code), { ok: false, code: "reset-failed", message: RESET_FAILURE }, "the same answer as any failure");
  assert.equal(store.users[0].passwordHash, "hash:old password");
});

test(`${RESET_MAX_ATTEMPTS - 1} wrong tries leave the code usable, and a new code starts the count again`, async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  const first = await issued(store, d);
  for (let i = 1; i < RESET_MAX_ATTEMPTS; i++) await reset(d, wrongCode(first));
  const second = await issued(store, d);
  assert.equal(store.users[0].resetFailedAttempts, 0);
  for (let i = 1; i < RESET_MAX_ATTEMPTS; i++) await reset(d, wrongCode(second));
  assert.equal((await reset(d, second)).ok, true, "four more wrong tries, then the right one");
});

test(`${RESET_MAX_ATTEMPTS} wrong tries at the same moment all count, and withdraw the code`, async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  const code = await issued(store, d);
  await Promise.all(Array.from({ length: RESET_MAX_ATTEMPTS }, () => reset(d, wrongCode(code))));
  assert.equal(store.users[0].resetFailedAttempts, RESET_MAX_ATTEMPTS);
  assert.equal(store.users[0].resetCodeHash, null);
  assert.equal((await reset(d, code)).ok, false);
});

test("wrong tries for an account with no live code are not counted against it", async () => {
  const store = fakeStore(USERS());
  const { d, clock } = deps(store);
  for (let i = 0; i < RESET_MAX_ATTEMPTS + 2; i++) await reset(d, "ABCD-EFGH", "a new passphrase", "max@example.org");
  assert.equal(store.writes.length, 0, "no code: nothing to count");
  const code = await issued(store, d, 1);
  clock.now += CODE_LIFETIME_HOURS * HOUR;
  await reset(d, wrongCode(code));
  assert.equal(store.writes.filter((w) => w.op === "recordResetFailure").length, 0, "an expired code is not counted");
});

// ---- the new password ----

test("a new password that breaks the length rule is refused before any lookup, so its message reveals nothing", async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  for (const pw of ["", undefined, 42, "x".repeat(PASSWORD_MIN - 1), "\u{1F600}".repeat(PASSWORD_MIN - 1), "x".repeat(PASSWORD_MAX + 1)]) {
    const r = await resetPassword({ email: "nobody@example.org", code: "ABCD-EFGH", newPassword: pw }, d);
    assert.equal(r.code, "invalid", JSON.stringify(pw));
    assert.ok(r.errors.newPassword, JSON.stringify(pw));
  }
  assert.equal(store.findByEmailCalls.length, 0, "no lookup is made");
});

test(`a new password of ${PASSWORD_MIN} and of ${PASSWORD_MAX} characters is accepted`, async () => {
  for (const pw of ["x".repeat(PASSWORD_MIN), "x".repeat(PASSWORD_MAX), "\u{1F600}".repeat(PASSWORD_MIN)]) {
    const store = fakeStore(USERS());
    const { d } = deps(store);
    const code = await issued(store, d);
    assert.equal((await reset(d, code, pw)).ok, true, `${[...pw].length} characters`);
  }
});

test("a new password equal to the current one is refused once the code is right, and the code stays usable", async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  const code = await issued(store, d);
  assert.deepEqual(await reset(d, code, "old password"), { ok: false, code: "invalid", errors: { newPassword: SAME_PASSWORD } });
  assert.ok(store.users[0].resetCodeHash, "the code is not spent");
  assert.equal(store.users[0].resetFailedAttempts, 0, "and not counted as a wrong try");
  assert.equal((await reset(d, code, "a different one")).ok, true);
});

test("a code replaced between the check and the write is refused, so it cannot be used twice at once", async () => {
  const store = fakeStore(USERS());
  const { d } = deps(store);
  const code = await issued(store, d);
  const realComplete = store.completeReset.bind(store);
  store.completeReset = async (id, args, extra) => {
    store.users[0].resetCodeHash = "hash:SOMEONE-ELSE"; // another use, or a new code, lands first
    return realComplete(id, args, extra);
  };
  assert.equal((await reset(d, code, "racing for it")).ok, false);
  assert.equal(store.users[0].passwordHash, "hash:old password");
});

test("a right code checked while wrong tries are counted fails once they reach the limit, even with the code not yet withdrawn", async () => {
  // The fake store withdraws the code in the same write that reaches the limit, so on its own that already
  // stops this. Here the five failures are counted and the code is left in place, as if withdrawing it
  // were a separate step, to show completeReset's own condition on the count.
  const store = fakeStore(USERS());
  const { d } = deps(store);
  const code = await issued(store, d);
  const realComplete = store.completeReset.bind(store);
  const asked = [];
  store.completeReset = async (id, args, extra) => {
    asked.push(args.maxAttempts);
    store.users[0].resetFailedAttempts = RESET_MAX_ATTEMPTS; // five wrong tries land after the check
    return realComplete(id, args, extra);
  };
  assert.deepEqual(await reset(d, code, "racing the guesses"), { ok: false, code: "reset-failed", message: RESET_FAILURE });
  assert.deepEqual(asked, [RESET_MAX_ATTEMPTS], "the limit is passed to the store's write");
  assert.equal(store.users[0].passwordHash, "hash:old password");
  assert.equal(store.users[0].sessionVersion, 0, "no session ended");
});

test("the reset succeeds only when the store reports exactly one row written", async () => {
  for (const count of [0, 2]) {
    const store = fakeStore(USERS());
    const { d } = deps(store);
    const code = await issued(store, d);
    store.completeReset = async () => count;
    assert.deepEqual(await reset(d, code), { ok: false, code: "reset-failed", message: RESET_FAILURE }, `${count} rows`);
  }
});

// ---- sessions end on reset (review of #146) ----

function routes(store, clock = { now: NOW }) {
  const ia = createIdentityAccess({
    users: store,
    verifyPassword: async (hash, pw) => hash === `hash:${pw}`,
    hashPassword: async (pw) => `hash:${pw}`,
    dummyHash: DUMMY,
    secret: SECRET,
    secure: false,
    now: () => clock.now,
  });
  const call = async (handler, req, next) => {
    const res = { statusCode: null, body: undefined, ended: false, headers: {} };
    res.status = (c) => ((res.statusCode = c), res);
    res.json = (b) => ((res.body = b), res);
    res.end = () => ((res.ended = true), res);
    res.setHeader = (name, value) => (res.headers[name] = value);
    await handler(req, res, next);
    return res;
  };
  const cookieFrom = (res) => res.headers["Set-Cookie"].split(";")[0];
  const reaches = async (cookie) => {
    let reached = false;
    const res = await call(ia.authenticate, { headers: { cookie } }, () => (reached = true));
    return reached ? 200 : res.statusCode;
  };
  return { ia, call, cookieFrom, reaches };
}

test("FR-004: a reset ends every session made before it, and a sign-in after it works", async () => {
  const store = fakeStore(USERS());
  const { ia, call, cookieFrom, reaches } = routes(store);
  const before = cookieFrom(await call(ia.signIn, { body: { email: "rea@example.org", password: "old password" } }));
  const another = cookieFrom(await call(ia.signIn, { body: { email: "rea@example.org", password: "old password" } }));
  assert.deepEqual([await reaches(before), await reaches(another)], [200, 200], "both sessions work before the reset");

  const { body } = await call(ia.issueResetCode, { actor: MANAGER, params: { id: "1" } });
  assert.deepEqual([await reaches(before), await reaches(another)], [200, 200], "issuing a code alone ends nothing");
  assert.equal((await call(ia.resetPassword, { body: { email: "rea@example.org", code: body.code, newPassword: "a fresh secret" } })).statusCode, 204);

  assert.deepEqual([await reaches(before), await reaches(another)], [401, 401], "every earlier session is refused");
  const after = cookieFrom(await call(ia.signIn, { body: { email: "rea@example.org", password: "a fresh secret" } }));
  assert.equal(await reaches(after), 200);
  assert.equal(readSession(after.split("=")[1], { secret: SECRET, now: NOW }).version, 1);
});

test("a session token from before session versions counts as version 0, and any other version is refused", async () => {
  const store = fakeStore(USERS());
  const { reaches } = routes(store);
  const legacyBody = Buffer.from(JSON.stringify({ sub: "1", iat: NOW / 1000, exp: NOW / 1000 + 3600 })).toString("base64url");
  const { createHmac } = await import("node:crypto");
  const legacy = `${legacyBody}.${createHmac("sha256", SECRET).update(legacyBody).digest("base64url")}`;
  assert.deepEqual(readSession(legacy, { secret: SECRET, now: NOW }), { userId: "1", version: 0 });
  assert.equal(await reaches(`cc_session=${legacy}`), 200, "the account is at version 0");
  store.users[0].sessionVersion = 3;
  assert.equal(await reaches(`cc_session=${legacy}`), 401);
  assert.equal(await reaches(`cc_session=${issueToken(1, { secret: SECRET, now: NOW, version: 2 })}`), 401, "an older version");
  assert.equal(await reaches(`cc_session=${issueToken(1, { secret: SECRET, now: NOW, version: 3 })}`), 200, "the current version");
});

// ---- the routes ----

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
  const wrong = await call(ia.resetPassword, { body: { email: "rea@example.org", code: wrongCode(body.code), newPassword: "long enough" } });
  assert.deepEqual([wrong.statusCode, wrong.body], [400, { error: RESET_FAILURE }]);
  const nobody = await call(ia.resetPassword, { body: { email: "nobody@example.org", code: body.code, newPassword: "long enough" } });
  assert.deepEqual([nobody.statusCode, nobody.body], [400, { error: RESET_FAILURE }], "the same body for an account that does not exist");
  const same = await call(ia.resetPassword, { body: { email: "rea@example.org", code: body.code, newPassword: "old password" } });
  assert.deepEqual([same.statusCode, same.body], [400, { errors: { newPassword: SAME_PASSWORD } }]);
  const done = await call(ia.resetPassword, { body: { email: "rea@example.org", code: body.code, newPassword: "long enough" } });
  assert.equal(done.statusCode, 204);
  assert.equal(done.ended, true);
  assert.equal((await call(ia.resetPassword, {})).statusCode, 400, "no body at all");
});

// ---- argon2 checks at once (review of #146) ----

// A check that holds its place until the test lets it finish.
function heldChecks() {
  let running = 0;
  let most = 0;
  const started = [];
  const held = [];
  const check = (label) => async () => {
    running += 1;
    most = Math.max(most, running);
    started.push(label);
    await new Promise((resolve) => held.push(resolve));
    running -= 1;
    if (label === "throws") throw new Error("argon2 failed");
    return label;
  };
  const settle = async () => {
    for (let i = 0; i < 50; i++) await new Promise((resolve) => setImmediate(resolve));
  };
  return { check, started, held, settle, most: () => most, running: () => running };
}

test("the limiter runs at most its limit at once, in arrival order, and frees a place when a check throws", { timeout: 5000 }, async () => {
  const limited = limitConcurrency(2);
  const h = heldChecks();
  const calls = ["a", "throws", "c", "d", "e"].map((label) => limited(h.check(label)).catch((e) => e.message));
  await h.settle();
  assert.deepEqual(h.started, ["a", "throws"], "two run; three wait");
  h.held[1](); // the check that throws finishes first
  await h.settle();
  assert.deepEqual(h.started, ["a", "throws", "c"], "its place went to the next in line");
  while (h.started.length < 5 || h.running() > 0) {
    h.held.shift()?.();
    await h.settle();
  }
  assert.deepEqual(await Promise.all(calls), ["a", "argon2 failed", "c", "d", "e"]);
  assert.equal(h.most(), 2);
  assert.throws(() => limitConcurrency(0), /at least 1/);
});

test("a place handed to a waiting check still counts as taken, so a check arriving later waits", { timeout: 5000 }, async () => {
  const limited = limitConcurrency(1);
  const h = heldChecks();
  const first = limited(h.check("first"));
  const second = limited(h.check("second"));
  await h.settle();
  h.held[0](); // first finishes; its place goes to second
  await h.settle();
  assert.deepEqual(h.started, ["first", "second"]);
  const third = limited(h.check("third")); // arrives while second holds the place
  await h.settle();
  assert.deepEqual(h.started, ["first", "second"], "third waits");
  assert.equal(h.most(), 1);
  h.held[1]();
  await h.settle();
  h.held[2]();
  assert.deepEqual(await Promise.all([first, second, third]), ["first", "second", "third"]);
  assert.equal(h.most(), 1);
});

test(`sign-in and reset share one cap of ${MAX_CONCURRENT_HASHES} argon2 checks at once, however many calls arrive`, { timeout: 5000 }, async () => {
  const store = fakeStore(USERS());
  let running = 0;
  let most = 0;
  const slow = (result) => async () => {
    running += 1;
    most = Math.max(most, running);
    await new Promise((resolve) => setTimeout(resolve, 5));
    running -= 1;
    return result;
  };
  const ia = createIdentityAccess({
    users: store,
    verifyPassword: (hash, value) => slow(hash === `hash:${value}`)(),
    hashPassword: (value) => slow(`hash:${value}`)(),
    dummyHash: DUMMY,
    secret: SECRET,
    secure: false,
    now: () => NOW,
  });
  const res = () => {
    const r = { statusCode: null, headers: {} };
    r.status = (c) => ((r.statusCode = c), r);
    r.json = () => r;
    r.end = () => r;
    r.setHeader = (n, v) => (r.headers[n] = v);
    return r;
  };
  const issued = res();
  await ia.issueResetCode({ actor: MANAGER, params: { id: "1" } }, issued);
  const calls = [];
  for (let i = 0; i < 12; i++) {
    calls.push(ia.signIn({ body: { email: "max@example.org", password: i === 0 ? "manager pw" : "wrong" } }, res()));
    calls.push(ia.resetPassword({ body: { email: "rea@example.org", code: "ABCD-EFGH", newPassword: "long enough" } }, res()));
  }
  await Promise.all(calls);
  assert.equal(most, MAX_CONCURRENT_HASHES, "24 calls at once, never more than the cap in argon2");
  assert.equal(MAX_CONCURRENT_HASHES, 4);
});
