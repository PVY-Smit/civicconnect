import { test } from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";

test("health endpoint returns 200 and ok status", async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const res = await fetch(`http://localhost:${port}/health`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.status, "ok");
  server.close();
});
