// Seeds the dataset NFR-001 is measured against: 5,000 requests (#124).
//
//   node seed.mjs [--count 5000] [--concurrency 4] [--no-mix] [--force]
//
// Requests go in through the API as the seeded Requester, the way real ones arrive, so each gets its
// reference from the sequence and its first history row (ADR-007). Categories and reported urgency are
// spread evenly across the active categories and the three levels. With the mix (the default), the
// Coordinator then rejects one request in ten and assigns three in ten to a Staff member authorised for the
// category, so the queue holds New, Assigned and Rejected requests, not only New.
//
// If the Coordinator's queue already holds the count, nothing is added unless --force is given, so a second
// run does not double the data on staging.

import { parseArgs } from "node:util";
import { environment, serverVersion, signIn, writeResult } from "./lib.mjs";

const { values: opts } = parseArgs({
  options: {
    count: { type: "string", default: "5000" },
    concurrency: { type: "string", default: "4" },
    "no-mix": { type: "boolean", default: false },
    force: { type: "boolean", default: false },
  },
});
const count = Number(opts.count);
const concurrency = Number(opts.concurrency);
if (!Number.isInteger(count) || count < 1 || !Number.isInteger(concurrency) || concurrency < 1) throw new Error("--count and --concurrency must be positive whole numbers.");

const URGENCY = ["Low", "Medium", "High"];
const started = new Date();
const requester = await signIn("Requester");
const coordinator = await signIn("Coordinator");

const before = await coordinator.call("/queue");
if (before.status !== 200) throw new Error(`The queue answered ${before.status}.`);
if (before.body.total >= count && !opts.force) {
  console.log(`The queue already holds ${before.body.total} requests (asked for ${count}). Nothing added; use --force to add anyway.`);
} else {
  await seed();
}

// Ends by returning rather than process.exit, which on Windows can abort while fetch's connections close.
async function seed() {

const categories = (await requester.call("/categories")).body?.categories ?? [];
if (categories.length === 0) throw new Error("No active categories to submit requests in.");

const stamp = started.toISOString().slice(0, 16);
const references = [];
const failures = [];
let next = 0;

async function worker() {
  while (next < count) {
    const n = next++;
    const category = categories[n % categories.length];
    const res = await requester.call("/requests", {
      method: "POST",
      body: {
        title: `Performance seed ${n + 1} of ${count} (${stamp})`,
        description: `Seeded for the NFR-001 measurement (#124). Request ${n + 1} of ${count}.`,
        categoryId: category.id,
        location: `${(n % 200) + 1} Seed Street`,
        reportedUrgency: URGENCY[n % URGENCY.length],
      },
    });
    if (res.status === 201) references[n] = { reference: res.body.reference, categoryId: category.id };
    else failures.push({ n, status: res.status, body: res.body });
    if ((n + 1) % 500 === 0) console.log(`submitted ${n + 1} of ${count}`);
  }
}
await Promise.all(Array.from({ length: concurrency }, worker));

// The mix: one in ten rejected, three in ten assigned.
const moved = { rejected: 0, assigned: 0, failed: 0 };
if (!opts["no-mix"]) {
  const staffFor = new Map();
  for (const [i, r] of references.entries()) {
    if (!r) continue;
    let move = null;
    if (i % 10 === 0) move = { to: "Rejected", reason: "Seeded rejection for the performance dataset." };
    else if (i % 10 <= 3) {
      if (!staffFor.has(r.categoryId)) staffFor.set(r.categoryId, (await coordinator.call(`/requests/${encodeURIComponent(r.reference)}/assignable-staff`)).body?.staff?.[0] ?? null);
      const staff = staffFor.get(r.categoryId);
      if (staff) move = { to: "Assigned", assigneeId: staff.id };
    }
    if (!move) continue;
    const res = await coordinator.call(`/requests/${encodeURIComponent(r.reference)}/status`, { method: "POST", body: move });
    if (res.status === 200) moved[move.to === "Rejected" ? "rejected" : "assigned"] += 1;
    else moved.failed += 1;
  }
}

const after = await coordinator.call("/queue");
const result = {
  kind: "seed",
  issue: "#124",
  requested: count,
  submitted: references.filter(Boolean).length,
  submissionFailures: failures.length,
  firstFailures: failures.slice(0, 5),
  mix: opts["no-mix"] ? null : moved,
  queueTotalBefore: before.body.total,
  queueTotalAfter: after.body?.total ?? null,
  started: started.toISOString(),
  finished: new Date().toISOString(),
  environment: environment(),
  server: await serverVersion(),
};
const file = writeResult("seed", result);
console.log(`submitted ${result.submitted} of ${count}, ${failures.length} failed; queue now ${result.queueTotalAfter}`);
if (result.mix) console.log(`rejected ${moved.rejected}, assigned ${moved.assigned}, ${moved.failed} moves failed`);
console.log(`written ${file}`);
if (failures.length > 0) process.exitCode = 1;
}
