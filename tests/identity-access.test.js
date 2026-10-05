// Tests for the identity and access module (FR-001, FR-002, FR-028, NFR-004, NFR-005).
//
// The store and the password hash are fakes, so these are component tests of the module's rules. The
// same behaviour is exercised against PostgreSQL and argon2 by the integration tests under #121.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createIdentityAccess, NOT_PERMITTED, NOT_SIGNED_IN } from "../src/modules/identity-access/http.js";
import { GENERIC_FAILURE, signIn } from "../src/modules/identity-access/sign-in.js";
import {
  COOKIE_NAME,
  DEFAULT_LIFETIME_SECONDS,
  issueToken,
  readToken,
  sessionCookie,
  tokenFromCookieHeader,
} from "../src/modules/identity-access/session.js";

const SECRET = "test-secret-that-is-at-least-32-characters";
const NOW = Date.UTC(2026, 9, 6, 9, 0, 0);
const DUMMY = "hash:__dummy__";

// A fake hash: "hash:<password>". verifyPassword records which hash it was asked to check.
function fakeVerifier() {
  const calls = [];
  const verifyPassword = async (hash, password) => {
    calls.push(hash);
    return hash === `hash:${password}`;
  };
  return { verifyPassword, calls };
}

function fakeUsers(list) {
  const byId = new Map(list.map((u) => [String(u.id), u]));
  return {
    findByEmail: async (email) => list.find((u) => u.email === email) ?? null,
    findById: async (id) => byId.get(String(id)) ?? null,
  };
}

const USERS = () => [
  { id: 1, name: "Rea Requester", email: "rea@example.org", role: "Requester", active: true, passwordHash: "hash:correct horse", categoryIds: [] },
  { id: 2, name: "Max Manager", email: "max@example.org", role: "Manager", active: true, passwordHash: "hash:manager pass", categoryIds: [10] },
  { id: 3, name: "Dee Deactivated", email: "dee@example.org", role: "Staff", active: false, passwordHash: "hash:old pass", categoryIds: [10] },
];

function fakeRes() {
  const res = { statusCode: null, body: undefined, headers: {}, ended: false };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  res.end = () => ((res.ended = true), res);
  res.setHeader = (name, value) => ((res.headers[name.toLowerCase()] = value), res);
  return res;
}

function module_(users = USERS(), { secure = false, at = NOW } = {}) {
  const verifier = fakeVerifier();
  const clock = { now: at };
  const ia = createIdentityAccess({
    users: fakeUsers(users),
    verifyPassword: verifier.verifyPassword,
    dummyHash: DUMMY,
    secret: SECRET,
    secure,
    now: () => clock.now,
  });
  return { ia, verifier, clock, users };
}

const cookieFrom = (res) => tokenFromCookieHeader(res.headers["set-cookie"].split(";")[0]);
const reqWith = (token, extra = {}) => ({ headers: { cookie: token ? `${COOKIE_NAME}=${token}` : undefined }, ...extra });

// ---- session tokens ----

test("a session token round-trips to its user id and is refused once altered, expired or signed elsewhere", () => {
  const token = issueToken(42, { secret: SECRET, now: NOW });
  assert.equal(readToken(token, { secret: SECRET, now: NOW }), "42");

  const [body, mac] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ sub: "2", iat: 0, exp: 9999999999 })).toString("base64url");
  assert.equal(readToken(`${forged}.${mac}`, { secret: SECRET, now: NOW }), null, "a changed body keeps the old signature");
  assert.equal(readToken(`${body}.${mac.slice(0, -2)}AA`, { secret: SECRET, now: NOW }), null, "an altered signature");
  assert.equal(readToken(token, { secret: "another-secret-that-is-32-characters-long", now: NOW }), null, "signed with another secret");
  assert.equal(readToken(token, { secret: SECRET, now: NOW + DEFAULT_LIFETIME_SECONDS * 1000 }), null, "at expiry");
  assert.equal(readToken(token, { secret: SECRET, now: NOW + DEFAULT_LIFETIME_SECONDS * 1000 - 1000 }), "42", "one second before expiry");
  for (const junk of [undefined, "", "abc", "a.b.c", ".", `${body}.`]) {
    assert.equal(readToken(junk, { secret: SECRET, now: NOW }), null, `malformed: ${junk}`);
  }
});

test("the service refuses to run with a session secret shorter than 32 characters", () => {
  assert.throws(() => issueToken(1, { secret: "short", now: NOW }), /at least 32 characters/);
  assert.throws(() => issueToken(1, { secret: undefined, now: NOW }), /at least 32 characters/);
});

test("the session cookie is HttpOnly and SameSite=Lax, and Secure only when the service runs over HTTPS", () => {
  const plain = sessionCookie("t", { secure: false });
  const tls = sessionCookie("t", { secure: true });
  for (const c of [plain, tls]) {
    assert.match(c, /HttpOnly/);
    assert.match(c, /SameSite=Lax/);
    assert.match(c, new RegExp(`Max-Age=${DEFAULT_LIFETIME_SECONDS}`));
  }
  assert.doesNotMatch(plain, /Secure/);
  assert.match(tls, /; Secure$/);
});

// ---- sign-in rules (FR-001, FR-028) ----

test("FR-001: wrong password, unknown email and a deactivated account all get the same generic failure", async () => {
  const users = fakeUsers(USERS());
  const cases = [
    { email: "rea@example.org", password: "wrong" },
    { email: "nobody@example.org", password: "correct horse" },
    { email: "dee@example.org", password: "old pass" },
  ];
  for (const credentials of cases) {
    const { verifyPassword } = fakeVerifier();
    const result = await signIn(credentials, { users, verifyPassword, dummyHash: DUMMY });
    assert.deepEqual(result, { ok: false, code: "invalid-credentials", message: GENERIC_FAILURE }, credentials.email);
  }
});

test("FR-001: when there is no usable account the password is still checked, against the dummy hash", async () => {
  for (const email of ["nobody@example.org", "dee@example.org"]) {
    const { verifyPassword, calls } = fakeVerifier();
    await signIn({ email, password: "anything" }, { users: fakeUsers(USERS()), verifyPassword, dummyHash: DUMMY });
    assert.deepEqual(calls, [DUMMY], email);
  }
});

test("FR-001: correct credentials sign in, with the email matched regardless of case and surrounding spaces", async () => {
  const { verifyPassword, calls } = fakeVerifier();
  const result = await signIn({ email: "  REA@Example.org ", password: "correct horse" }, { users: fakeUsers(USERS()), verifyPassword, dummyHash: DUMMY });
  assert.equal(result.ok, true);
  assert.equal(result.user.id, 1);
  assert.deepEqual(calls, ["hash:correct horse"]);
});

test("a sign-in with a missing email or password is refused before any lookup", async () => {
  for (const credentials of [{}, { email: "rea@example.org" }, { password: "x" }, { email: "  ", password: "x" }, { email: "rea@example.org", password: "" }]) {
    const { verifyPassword, calls } = fakeVerifier();
    const result = await signIn(credentials, { users: fakeUsers(USERS()), verifyPassword, dummyHash: DUMMY });
    assert.equal(result.code, "missing-credentials", JSON.stringify(credentials));
    assert.equal(calls.length, 0);
  }
});

// ---- HTTP boundary ----

test("FR-001: signing in sets the session cookie and returns the user without the password hash", async () => {
  const { ia } = module_(USERS(), { secure: true });
  const res = fakeRes();
  await ia.signIn({ body: { email: "rea@example.org", password: "correct horse" } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { user: { id: 1, name: "Rea Requester", role: "Requester" } });
  assert.match(res.headers["set-cookie"], /^cc_session=[^;]+; Path=\/; HttpOnly; SameSite=Lax; Max-Age=\d+; Secure$/);
});

test("FR-001: a failed sign-in answers 401 with the generic message and sets no cookie", async () => {
  const { ia } = module_();
  const res = fakeRes();
  await ia.signIn({ body: { email: "rea@example.org", password: "wrong" } }, res);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: GENERIC_FAILURE });
  assert.equal(res.headers["set-cookie"], undefined);
});

test("FR-001: a protected route without a valid session answers 401 and does not reach the handler", async () => {
  const { ia } = module_();
  const forged = Buffer.from(JSON.stringify({ sub: "2", iat: 0, exp: 9999999999 })).toString("base64url") + ".AAAA";
  for (const req of [reqWith(null), reqWith("garbage"), reqWith(forged), { headers: {} }]) {
    const res = fakeRes();
    let reached = false;
    await ia.authenticate(req, res, () => (reached = true));
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { error: NOT_SIGNED_IN });
    assert.equal(reached, false);
  }
});

test("a valid session reaches the handler with the actor read from the store", async () => {
  const { ia } = module_();
  const signInRes = fakeRes();
  await ia.signIn({ body: { email: "max@example.org", password: "manager pass" } }, signInRes);
  const req = reqWith(cookieFrom(signInRes));
  let reached = false;
  await ia.authenticate(req, fakeRes(), () => (reached = true));
  assert.equal(reached, true);
  assert.deepEqual(req.actor, { id: 2, role: "Manager", categoryIds: [10] });
});

test("FR-028: deactivating a user ends their existing session on the next request", async () => {
  const users = USERS();
  const { ia } = module_(users);
  const signInRes = fakeRes();
  await ia.signIn({ body: { email: "rea@example.org", password: "correct horse" } }, signInRes);
  const token = cookieFrom(signInRes);
  users[0].active = false;
  const res = fakeRes();
  let reached = false;
  await ia.authenticate(reqWith(token), res, () => (reached = true));
  assert.equal(res.statusCode, 401);
  assert.equal(reached, false);
});

test("a session stops working when its lifetime ends", async () => {
  const { ia, clock } = module_();
  const signInRes = fakeRes();
  await ia.signIn({ body: { email: "rea@example.org", password: "correct horse" } }, signInRes);
  clock.now = NOW + DEFAULT_LIFETIME_SECONDS * 1000;
  const res = fakeRes();
  await ia.authenticate(reqWith(cookieFrom(signInRes)), res, () => assert.fail("expired session reached the handler"));
  assert.equal(res.statusCode, 401);
});

test("FR-002, NFR-005: a signed-in role without the permission answers 403, and with it reaches the handler", () => {
  const { ia } = module_();
  const cases = [
    { role: "Requester", fn: "manageUsers", expect: 403 },
    { role: "Staff", fn: "manageUsers", expect: 403 },
    { role: "Manager", fn: "manageUsers", expect: "next" },
    { role: "Requester", fn: "submitRequest", expect: "next" },
    { role: "Manager", fn: "editAuditEntry", expect: 403 },
    { role: "Unknown", fn: "submitRequest", expect: 403 },
  ];
  for (const { role, fn, expect } of cases) {
    const res = fakeRes();
    let reached = false;
    ia.requirePermission(fn)({ actor: { id: 9, role, categoryIds: [] } }, res, () => (reached = true));
    if (expect === "next") {
      assert.equal(reached, true, `${role} ${fn}`);
    } else {
      assert.equal(res.statusCode, 403, `${role} ${fn}`);
      assert.deepEqual(res.body, { error: NOT_PERMITTED });
      assert.equal(reached, false);
    }
  }
});

test("the permission check refuses a request that skipped authentication", () => {
  const { ia } = module_();
  const res = fakeRes();
  ia.requirePermission("submitRequest")({ headers: {} }, res, () => assert.fail("reached without an actor"));
  assert.equal(res.statusCode, 401);
});

test("signing out clears the session cookie", () => {
  const { ia } = module_(USERS(), { secure: true });
  const res = fakeRes();
  ia.signOut({}, res);
  assert.equal(res.statusCode, 204);
  assert.match(res.headers["set-cookie"], /^cc_session=; Path=\/; HttpOnly; SameSite=Lax; Max-Age=0; Secure$/);
});
