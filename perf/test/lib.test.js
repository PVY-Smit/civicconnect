// Tests for what the performance results are judged by (#124). A wrong percentile or verdict would pass or
// fail NFR-001 and NFR-002 on a number nobody measured, and a client that crashes on one bad answer gives no
// result at all, so these are pinned here.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { firstPageProblem, judge, METHOD_SAMPLES, mixMove, parseBody, percentile, signIn, summarise, verdict, wholeNumber } from "../lib.mjs";

const twenty = Array.from({ length: 20 }, (_, i) => (i + 1) * 100); // 100, 200, ... 2000 ms

test("the 95th percentile of 20 samples is the 19th smallest, as the nearest-rank method gives", () => {
  assert.equal(percentile(twenty, 95), 1900);
  assert.equal(percentile([...twenty].reverse(), 95), 1900, "the order the samples arrive in does not matter");
  assert.equal(percentile(twenty, 50), 1000);
  assert.equal(percentile(twenty, 100), 2000);
  assert.equal(percentile(twenty, 1), 100);
});

test("a reported percentile is always a value that was measured, never an interpolation", () => {
  const samples = [12.5, 30, 31, 400];
  for (const p of [10, 25, 50, 75, 90, 95, 99]) assert.ok(samples.includes(percentile(samples, p)), `p${p}`);
});

test("one slow sample in 20 does not move the 95th percentile, and two do", () => {
  const one = [...Array(19).fill(100), 5000];
  const two = [...Array(18).fill(100), 5000, 5000];
  assert.equal(percentile(one, 95), 100);
  assert.equal(percentile(two, 95), 5000);
});

test("no samples, or a percentile outside 0 to 100, is an error rather than a number", () => {
  assert.throws(() => percentile([], 95), /No samples/);
  assert.throws(() => percentile(twenty, 0), /out of range/);
  assert.throws(() => percentile(twenty, 101), /out of range/);
});

test("the summary reports the distribution, with the mean beside it, not instead of it", () => {
  assert.deepEqual(summarise(twenty), { count: 20, minMs: 100, p50Ms: 1000, p90Ms: 1800, p95Ms: 1900, maxMs: 2000, meanMs: 1050 });
});

test("a result meets its target only when it is under it, as NFR-001 and NFR-002 say", () => {
  assert.equal(verdict(1999.9, 2000), "meets");
  assert.equal(verdict(2000, 2000), "does not meet");
  assert.equal(verdict(2500, 2000), "does not meet");
});

// ---- the outcome of a run (review of #139) ----

test("the verdict is taken on the unrounded 95th percentile, so 1999.96 ms meets a 2,000 ms target", () => {
  const samples = [...Array(19).fill(1999.96), 2500];
  assert.equal(summarise(samples).p95Ms, 2000, "reported rounded to 0.1 ms");
  assert.equal(judge({ attempted: 20, okMs: samples, targetMs: 2000 }), "meets");
  assert.equal(judge({ attempted: 20, okMs: [...Array(19).fill(2000), 1], targetMs: 2000 }), "does not meet");
});

test(`a run with fewer than ${METHOD_SAMPLES} samples, a failed call or a failed check is invalid, whatever its times`, () => {
  const fast = Array(METHOD_SAMPLES).fill(10);
  assert.equal(judge({ attempted: METHOD_SAMPLES, okMs: fast, targetMs: 2000 }), "meets");
  assert.match(judge({ attempted: 19, okMs: fast.slice(1), targetMs: 2000 }), /^invalid: 19 samples, fewer than the 20/);
  assert.match(judge({ attempted: METHOD_SAMPLES, okMs: fast.slice(1), targetMs: 2000 }), /^invalid: 1 of 20 failed/);
  assert.equal(judge({ attempted: METHOD_SAMPLES, okMs: fast, targetMs: 2000, invalidReason: "an answer held 0 rows" }), "invalid: an answer held 0 rows");
  assert.match(judge({ attempted: 0, okMs: [], targetMs: 2000 }), /^invalid/, "no samples at all is invalid, not a crash");
});

test("NFR-001: only an answer holding exactly the first page counts; an empty page or the whole queue does not", () => {
  assert.equal(firstPageProblem({ rows: 25, pageSize: 25, total: 5000 }), null);
  assert.equal(firstPageProblem({ rows: 3, pageSize: 25, total: 3 }), null, "a queue shorter than a page");
  assert.match(firstPageProblem({ rows: 0, pageSize: 25, total: 5000 }), /held 0 rows/, "an empty 200");
  assert.match(firstPageProblem({ rows: 24, pageSize: 25, total: 5000 }), /held 24 rows/);
  assert.match(firstPageProblem({ rows: 5000, pageSize: 25, total: 5000 }), /held 5000 rows/, "the whole queue");
  assert.match(firstPageProblem({ rows: null, pageSize: 25, total: 5000 }), /no list of requests/, "an error-shaped 200");
  assert.match(firstPageProblem({ rows: 25, pageSize: null, total: 5000 }), /no page size/);
});

test("a command-line number that is not a whole number at its minimum is refused, naming the option", () => {
  assert.equal(wholeNumber("samples", "20"), 20);
  assert.equal(wholeNumber("warmup", "0", { min: 0 }), 0);
  for (const raw of ["abc", "", "0", "-3", "2.5", "1e400"]) {
    assert.throws(() => wholeNumber("samples", raw), /--samples must be a whole number of at least 1/, JSON.stringify(raw));
  }
});

test("a response body that is not JSON is kept as text rather than ending the run", () => {
  assert.deepEqual(parseBody('{"total":3}'), { body: { total: 3 } });
  assert.deepEqual(parseBody(""), { body: null });
  const page = `<html><body>502 Bad Gateway${" ".repeat(300)}</body></html>`;
  assert.deepEqual(parseBody(page), { body: null, raw: page.slice(0, 200) });
});

test("the seed's mix rejects one in ten and assigns three in ten of the saved requests", () => {
  const moves = Array.from({ length: 1000 }, (_, i) => mixMove(i));
  assert.equal(moves.filter((m) => m === "Rejected").length, 100);
  assert.equal(moves.filter((m) => m === "Assigned").length, 300);
  assert.equal(moves.filter((m) => m === null).length, 600);
});

// ---- the client against a local server ----

test("the client signs in again once when the session ends, repeats the call, and keeps a non-JSON answer", async (t) => {
  let session = 0;
  let queueCalls = 0;
  const server = createServer((req, res) => {
    if (req.url === "/api/auth/sign-in") {
      session += 1;
      res.writeHead(200, { "Set-Cookie": `cc_session=s${session}; Path=/; HttpOnly`, "Content-Type": "application/json" });
      return res.end("{}");
    }
    if (req.url === "/api/queue") {
      queueCalls += 1;
      if (req.headers.cookie !== `cc_session=s${session}` || queueCalls === 2) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end('{"error":"Sign in to continue."}');
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end('{"total":1,"pageSize":25,"requests":[{}]}');
    }
    res.writeHead(502, { "Content-Type": "text/html" });
    return res.end("<html>Bad Gateway</html>");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  Object.assign(process.env, {
    E2E_BASE_URL: `http://127.0.0.1:${server.address().port}`,
    E2E_COORDINATOR_EMAIL: "coordinator@example.test",
    E2E_COORDINATOR_PASSWORD: "not-a-real-password",
  });

  const client = await signIn("Coordinator");
  const first = await client.call("/queue");
  assert.equal(first.status, 200);
  const second = await client.call("/queue"); // the server ends the session on the second call
  assert.equal(second.status, 200, "repeated after signing in again");
  assert.equal(client.renewals, 1);
  assert.equal(session, 2);
  assert.ok(second.ms >= 0);

  const bad = await client.call("/elsewhere");
  assert.deepEqual([bad.status, bad.body, bad.raw], [502, null, "<html>Bad Gateway</html>"]);
});
