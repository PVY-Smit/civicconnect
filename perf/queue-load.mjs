// A small concurrent run on the staff queue (#124).
//
//   node queue-load.mjs [--connections 10] [--duration 30] [--warmup 5]
//
// Several clients retrieve the first queue page in a loop for a fixed time, each waiting for its answer
// before asking again. It records the latency distribution, the throughput and every non-200 answer or
// network error. No requirement sets a target for concurrent use, so none is invented: NFR-001's
// single-user target is shown beside the result for comparison only.
//
// The clients share the Coordinator's session, so the run measures the server under concurrent reads of the
// largest queue, not sign-in. If the session ends, the clients share one sign-in (lib.mjs), so
// sessionRenewals counts the times it ended, not the clients that noticed. Ten clients for 30 seconds is a small workload chosen to show behaviour under
// concurrent reads. It is not derived from municipal usage data, which the project does not have.
//
// The first --warmup seconds run the same loop but are left out of the latencies, so a cold start does not
// inflate them; their answers are still counted by status. The 99th percentile is given with the number of
// samples it rests on, and only from 100 samples up, since below that it is one of the slowest few calls.
// The script first waits until the server's health check answers, and records that wait (wakeUp). A call
// that fails before an answer counts as a network error, with status 0.

import { parseArgs } from "node:util";
import { percentile, provenance, signIn, summarise, waitForHealthy, wholeNumber, writeResult } from "./lib.mjs";

const P99_MIN_SAMPLES = 100;
const { values: opts } = parseArgs({
  options: { connections: { type: "string", default: "10" }, duration: { type: "string", default: "30" }, warmup: { type: "string", default: "5" } },
});
const connections = wholeNumber("connections", opts.connections);
const durationS = wholeNumber("duration", opts.duration);
const warmupS = wholeNumber("warmup", opts.warmup, { min: 0 });
if (warmupS >= durationS) throw new Error("--warmup must be shorter than --duration.");

const wakeUp = await waitForHealthy();
const coordinator = await signIn("Coordinator");
const first = await coordinator.call("/queue");
if (first.status !== 200 || !first.body) throw new Error(`The queue answered ${first.status}${first.raw ? `: ${first.raw}` : ""}.`);

const latencies = [];
const statuses = {};
const errors = [];
let warmupCalls = 0;
const started = new Date();
const t0 = performance.now();
const measureFrom = t0 + warmupS * 1000;
const stopAt = t0 + durationS * 1000;

async function client() {
  while (performance.now() < stopAt) {
    const sent = performance.now();
    try {
      const r = await coordinator.call("/queue");
      if (r.status === 0) {
        errors.push(r.error);
        continue;
      }
      statuses[r.status] = (statuses[r.status] ?? 0) + 1;
      if (sent < measureFrom) warmupCalls += 1;
      else if (r.status === 200) latencies.push(r.ms);
    } catch (error) {
      errors.push(String(error.message ?? error)); // signing in again failed
    }
  }
}
await Promise.all(Array.from({ length: connections }, client));
const elapsedS = (performance.now() - t0) / 1000;
const measuredS = elapsedS - warmupS;

const completed = Object.values(statuses).reduce((a, b) => a + b, 0); // answered calls; network errors are apart
const result = {
  kind: "queue-load",
  issue: "#124",
  method: `${connections} concurrent clients retrieving GET /api/queue (first page) in a closed loop for ${durationS} s as the Coordinator; the first ${warmupS} s are a warm-up left out of the latencies`,
  target: "None set by the requirements. NFR-001's single-user 95th percentile of 2.0 s is shown for comparison only",
  queueTotal: first.body.total,
  connections,
  durationS: Math.round(elapsedS * 10) / 10,
  warmupS,
  warmupCalls,
  completed,
  throughputPerS: Math.round(((completed - warmupCalls) / measuredS) * 10) / 10,
  statuses,
  networkErrors: errors.length,
  firstErrors: errors.slice(0, 5),
  sessionRenewals: coordinator.renewals,
  summary: latencies.length
    ? {
        ...summarise(latencies),
        p99Ms: latencies.length >= P99_MIN_SAMPLES ? Math.round(percentile(latencies, 99) * 10) / 10 : null,
        p99Note: latencies.length >= P99_MIN_SAMPLES ? `from ${latencies.length} samples` : `not given: ${latencies.length} samples, fewer than ${P99_MIN_SAMPLES}`,
      }
    : null,
  ...(await provenance(started, wakeUp)),
};
const file = writeResult("queue-load", result);
const s = result.summary;
console.log(`queue load: ${connections} clients for ${result.durationS} s (${warmupS} s warm-up) against a ${result.queueTotal}-request queue`);
console.log(`${completed} retrievals, ${result.throughputPerS}/s after the warm-up; non-200: ${completed - (statuses[200] ?? 0)}; network errors: ${errors.length}`);
if (s) console.log(`p50 ${s.p50Ms} ms, p95 ${s.p95Ms} ms, p99 ${s.p99Ms ?? "-"} ms (${s.p99Note}), max ${s.maxMs} ms (NFR-001 single-user p95 target, for comparison: 2000 ms)`);
console.log(result.evidence);
console.log(`written ${file}`);
