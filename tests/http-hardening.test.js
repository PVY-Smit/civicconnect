// The server's hardening: the failure limits on sign-in and reset, the security headers and the health
// check's database probe (FR-001, FR-004, NFR-003, NFR-006). The limiter runs over a real Express app with
// a handler that answers as told, so what is counted is what the client sees.

import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createFailureLimiter, TOO_MANY } from "../src/modules/identity-access/rate-limit.js";
import { createApp } from "../src/app.js";

async function serve(app) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  return { base: `http://localhost:${server.address().port}`, close: () => server.close() };
}

function limited({ max = 3, addressMax = 100, windowMs = 60_000, now }) {
  const app = express();
  app.use(express.json());
  const limiter = createFailureLimiter({
    windowMs,
    now,
    limits: [
      { key: (req) => `account:${req.body?.email}`, max },
      { key: () => "address", max: addressMax },
    ],
  });
  app.post("/sign-in", limiter, (req, res) => res.status(req.body.ok ? 200 : 401).json({}));
  return app;
}

const post = (base, body) => fetch(`${base}/sign-in`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("failures past the limit answer 429 with Retry-After, and the handler is not run", async (t) => {
  let clock = 1_000_000;
  const { base, close } = await serve(limited({ max: 3, now: () => clock }));
  t.after(close);
  for (let i = 0; i < 3; i++) assert.equal((await post(base, { email: "a@x.test" })).status, 401);
  const blocked = await post(base, { email: "a@x.test", ok: true });
  assert.equal(blocked.status, 429, "even a right password waits once the limit is reached");
  assert.deepEqual(await blocked.json(), { error: TOO_MANY });
  assert.equal(blocked.headers.get("retry-after"), "60");
  assert.equal((await post(base, { email: "b@x.test", ok: true })).status, 200, "another account is not held back");
  clock += 60_000;
  assert.equal((await post(base, { email: "a@x.test", ok: true })).status, 200, "the window ends");
});

test("successes do not count, so an honest user is never held back", async (t) => {
  const { base, close } = await serve(limited({ max: 2, now: () => 0 }));
  t.after(close);
  for (let i = 0; i < 10; i++) assert.equal((await post(base, { email: "a@x.test", ok: true })).status, 200);
});

test("the address limit holds across accounts", async (t) => {
  const { base, close } = await serve(limited({ max: 100, addressMax: 4, now: () => 0 }));
  t.after(close);
  for (let i = 0; i < 4; i++) await post(base, { email: `user${i}@x.test` });
  assert.equal((await post(base, { email: "fresh@x.test" })).status, 429);
});

test("every answer carries the security headers; HSTS only over HTTPS", async (t) => {
  const plain = await serve(createApp());
  t.after(plain.close);
  const res = await fetch(`${plain.base}/health`);
  assert.equal(res.headers.get("x-frame-options"), "DENY");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("referrer-policy"), "no-referrer");
  assert.match(res.headers.get("content-security-policy"), /default-src 'self'.*frame-ancestors 'none'/);
  assert.equal(res.headers.get("strict-transport-security"), null);
  assert.equal(res.headers.get("x-powered-by"), null);
});

test("NFR-003: the health check answers 503 when the database cannot be reached", async (t) => {
  const store = { users: {}, categories: {}, requests: {}, notificationSources: {}, reports: {}, store: {} };
  const deps = (checkDatabase) => ({ store, checkDatabase, release: "v-test", overdueTargetDays: 10, https: true });
  const down = await serve(createApp(deps(async () => { throw new Error("connection refused"); })));
  const up = await serve(createApp(deps(async () => 1)));
  t.after(() => { down.close(); up.close(); });
  const bad = await fetch(`${down.base}/health`);
  assert.deepEqual([bad.status, await bad.json()], [503, { status: "unavailable", release: "v-test" }]);
  const good = await fetch(`${up.base}/health`);
  assert.deepEqual([good.status, await good.json()], [200, { status: "ok", release: "v-test" }]);
  assert.equal(good.headers.get("strict-transport-security"), "max-age=31536000");
});
