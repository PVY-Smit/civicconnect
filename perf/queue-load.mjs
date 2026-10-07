// A small concurrent run on the staff queue (#124).
//
//   node queue-load.mjs [--connections 10] [--duration 30]
//
// Several clients retrieve the first queue page in a loop for a fixed time, each waiting for its answer
// before asking again. It records the latency distribution, the throughput and every non-200 answer or
// network error. No requirement sets a target for concurrent use, so none is invented: NFR-001's
// single-user target is shown beside the result for comparison only.
//
// The clients share the Coordinator's session, so the run measures the server under concurrent reads of the
// largest queue, not sign-in. Ten clients for 30 seconds is a small workload chosen to show behaviour under
// concurrent reads. It is not derived from municipal usage data, which the project does not have.

import { parseArgs } from "node:util";
import { environment, percentile, serverVersion, signIn, summarise, timed, writeResult } from "./lib.mjs";

const { values: opts } = parseArgs({ options: { connections: { type: "string", default: "10" }, duration: { type: "string", default: "30" } } });
const connections = Number(opts.connections);
const durationS = Number(opts.duration);
if (!(connections >= 1 && durationS >= 1)) throw new Error("--connections and --duration must be at least 1.");

const coordinator = await signIn("Coordinator");
const first = await coordinator.call("/queue");
if (first.status !== 200) throw new Error(`The queue answered ${first.status}.`);

const latencies = [];
const statuses = {};
const errors = [];
const started = new Date();
const stopAt = performance.now() + durationS * 1000;

async function client() {
  while (performance.now() < stopAt) {
    try {
      const r = await timed(() => coordinator.call("/queue"));
      statuses[r.status] = (statuses[r.status] ?? 0) + 1;
      if (r.status === 200) latencies.push(r.ms);
    } catch (error) {
      errors.push(String(error.message ?? error));
    }
  }
}
const t0 = performance.now();
await Promise.all(Array.from({ length: connections }, client));
const elapsedS = (performance.now() - t0) / 1000;

const completed = Object.values(statuses).reduce((a, b) => a + b, 0);
const result = {
  kind: "queue-load",
  issue: "#124",
  method: `${connections} concurrent clients retrieving GET /api/queue (first page) in a closed loop for ${durationS} s as the Coordinator`,
  target: "None set by the requirements. NFR-001's single-user 95th percentile of 2.0 s is shown for comparison only",
  queueTotal: first.body.total,
  connections,
  durationS: Math.round(elapsedS * 10) / 10,
  completed,
  throughputPerS: Math.round((completed / elapsedS) * 10) / 10,
  statuses,
  networkErrors: errors.length,
  firstErrors: errors.slice(0, 5),
  summary: latencies.length ? { ...summarise(latencies), p99Ms: Math.round(percentile(latencies, 99) * 10) / 10 } : null,
  started: started.toISOString(),
  finished: new Date().toISOString(),
  environment: environment(),
  server: await serverVersion(),
};
const file = writeResult("queue-load", result);
const s = result.summary;
console.log(`queue load: ${connections} clients for ${result.durationS} s against a ${result.queueTotal}-request queue`);
console.log(`${completed} retrievals, ${result.throughputPerS}/s; non-200: ${completed - (statuses[200] ?? 0)}; network errors: ${errors.length}`);
if (s) console.log(`p50 ${s.p50Ms} ms, p95 ${s.p95Ms} ms, p99 ${s.p99Ms} ms, max ${s.maxMs} ms (NFR-001 single-user p95 target, for comparison: 2000 ms)`);
console.log(`written ${file}`);
