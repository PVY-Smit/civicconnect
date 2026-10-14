// NFR-001: staff queue retrieval at the baselined volume (#124, TC-35).
//
//   node nfr-001-queue.mjs [--samples 20] [--min-total 5000]
//
// NFR-001's own method: 20 timed retrievals of the first queue page against a seeded 5,000-request dataset,
// recording the distribution, not the mean. Target: 95th percentile under 2.0 seconds.
//
// The Coordinator sees every category (FR-013), so their queue is the whole dataset: the largest scope any
// user has. One untimed warm-up call comes first and is recorded separately, so a cold start is visible but
// does not decide the result. The retrievals are sequential, one user at a time, as the requirement states
// it. A run against fewer requests than --min-total is refused, so a small dataset cannot pass by accident.
// A run is marked invalid if any answer is not exactly the first page (an empty or error-shaped 200, or the
// whole queue), or if it took fewer than the 20 retrievals NFR-001's method states.

import { parseArgs } from "node:util";
import { environment, firstPageProblem, judge, serverVersion, signIn, summarise, wholeNumber, writeResult } from "./lib.mjs";

const TARGET_MS = 2000;
const { values: opts } = parseArgs({ options: { samples: { type: "string", default: "20" }, "min-total": { type: "string", default: "5000" } } });
const samples = wholeNumber("samples", opts.samples);
const minTotal = wholeNumber("min-total", opts["min-total"]);

const started = new Date();
const coordinator = await signIn("Coordinator");
const warmup = await coordinator.call("/queue");
if (warmup.status !== 200 || !warmup.body) throw new Error(`The queue answered ${warmup.status}${warmup.raw ? `: ${warmup.raw}` : ""}.`);
const total = warmup.body.total;
if (!(total >= minTotal)) throw new Error(`The queue holds ${total} requests, fewer than ${minTotal}. Seed first (node seed.mjs).`);
const pageSize = warmup.body.pageSize ?? null;

const runs = [];
for (let i = 0; i < samples; i++) {
  const r = await coordinator.call("/queue");
  runs.push({ ms: Math.round(r.ms * 10) / 10, unroundedMs: r.ms, status: r.status, rows: Array.isArray(r.body?.requests) ? r.body.requests.length : null, ...(r.raw ? { raw: r.raw } : {}) });
}
const ok = runs.filter((r) => r.status === 200);
const pageProblem = ok.map((r) => firstPageProblem({ rows: r.rows, pageSize, total })).find(Boolean) ?? null;
const okMs = ok.map((r) => r.unroundedMs);

const result = {
  kind: "NFR-001",
  issue: "#124",
  requirement: "Staff queue retrieval: 95th percentile under 2.0 seconds for a queue of 5 000 requests returning the first page",
  method: `${samples} sequential timed retrievals of GET /api/queue (first page, default sort) as the Coordinator, after one untimed warm-up`,
  targetP95Ms: TARGET_MS,
  queueTotal: total,
  pageSize,
  pageRows: runs[0]?.rows ?? null,
  warmupMs: Math.round(warmup.ms * 10) / 10,
  errors: runs.length - ok.length,
  sessionRenewals: coordinator.renewals,
  summary: okMs.length ? summarise(okMs) : null,
  outcome: judge({ attempted: samples, okMs, targetMs: TARGET_MS, invalidReason: pageProblem }),
  samples: runs.map(({ unroundedMs, ...r }) => r),
  started: started.toISOString(),
  finished: new Date().toISOString(),
  environment: environment(),
  server: await serverVersion(),
};
const file = writeResult("nfr-001", result);
const s = result.summary;
console.log(`NFR-001: ${ok.length} of ${samples} retrievals of a ${total}-request queue${s ? `; p50 ${s.p50Ms} ms, p95 ${s.p95Ms} ms, max ${s.maxMs} ms` : ""} (warm-up ${result.warmupMs} ms)`);
console.log(`target p95 < ${TARGET_MS} ms: ${result.outcome}`);
console.log(`written ${file}`);
