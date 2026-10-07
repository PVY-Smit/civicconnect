// Tests for the statistics the performance results are judged by (#124). A wrong percentile would pass or
// fail NFR-001 and NFR-002 on a number nobody measured, so the method is pinned here.

import { test } from "node:test";
import assert from "node:assert/strict";
import { percentile, summarise, verdict } from "../lib.mjs";

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
