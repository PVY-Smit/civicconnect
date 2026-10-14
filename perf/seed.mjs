// Seeds the dataset NFR-001 is measured against: 5,000 requests (#124).
//
//   node seed.mjs [--count 5000] [--concurrency 4] [--no-mix] [--force]
//
// Requests go in through the API as the seeded Requester, the way real ones arrive, so each gets its
// reference from the sequence and its first history row (ADR-007). Every category gets every reported
// urgency equally (seedFields). With the mix (the default), the Coordinator then rejects a tenth of the
// requests that were saved and assigns three tenths, rotating through the Staff members authorised for each
// request's category, so the queue holds New, Assigned and Rejected requests, not only New, and no one Staff
// member holds them all. Which requests are moved is a fixed shuffle (mixMoves), so the moves are spread
// across categories and urgencies rather than following their rotation. The mix is worked out over the saved
// requests, so a failed submission does not shift the proportions.
//
// The guard against seeding twice is by count only: if the Coordinator's queue already holds --count
// requests, whatever they are, nothing is added unless --force is given. On a target that holds other
// requests, seed a fresh database, or use --force and check the queue's total afterwards.

import { parseArgs } from "node:util";
import { mixMoves, provenance, seedFields, signIn, waitForHealthy, wholeNumber, writeResult } from "./lib.mjs";

const { values: opts } = parseArgs({
  options: {
    count: { type: "string", default: "5000" },
    concurrency: { type: "string", default: "4" },
    "no-mix": { type: "boolean", default: false },
    force: { type: "boolean", default: false },
  },
});
const count = wholeNumber("count", opts.count);
const concurrency = wholeNumber("concurrency", opts.concurrency);

const started = new Date();
const wakeUp = await waitForHealthy();
const requester = await signIn("Requester");
const coordinator = await signIn("Coordinator");

const before = await coordinator.call("/queue");
if (before.status !== 200 || !before.body) throw new Error(`The queue answered ${before.status}${before.raw ? `: ${before.raw}` : ""}.`);
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
      const fields = seedFields(n, categories.length);
      const category = categories[fields.category];
      const res = await requester.call("/requests", {
        method: "POST",
        body: {
          title: `Performance seed ${n + 1} of ${count} (${stamp})`,
          description: `Seeded for the NFR-001 measurement (#124). Request ${n + 1} of ${count}.`,
          categoryId: category.id,
          location: `${(n % 200) + 1} Seed Street`,
          reportedUrgency: fields.urgency,
        },
      });
      if (res.status === 201) references[n] = { reference: res.body.reference, categoryId: category.id };
      else failures.push({ n, status: res.status, body: res.body, ...(res.raw ? { raw: res.raw } : {}), ...(res.error ? { error: res.error } : {}) });
      if ((n + 1) % 500 === 0) console.log(`submitted ${n + 1} of ${count}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  const saved = references.filter(Boolean); // in submission order, without the gaps failures leave
  const moved = { rejected: 0, assigned: 0, failed: 0, noStaff: 0 };
  const assignees = {};
  if (!opts["no-mix"]) {
    const staffFor = new Map(); // category id -> { list, next }
    const plan = mixMoves(saved.length);
    for (const [i, r] of saved.entries()) {
      const to = plan[i];
      if (!to) continue;
      let move = { to: "Rejected", reason: "Seeded rejection for the performance dataset." };
      if (to === "Assigned") {
        if (!staffFor.has(r.categoryId)) {
          const list = (await coordinator.call(`/requests/${encodeURIComponent(r.reference)}/assignable-staff`)).body?.staff ?? [];
          staffFor.set(r.categoryId, { list, next: 0 });
        }
        const pool = staffFor.get(r.categoryId);
        if (pool.list.length === 0) {
          moved.noStaff += 1;
          continue;
        }
        const staff = pool.list[pool.next++ % pool.list.length];
        move = { to: "Assigned", assigneeId: staff.id };
      }
      const res = await coordinator.call(`/requests/${encodeURIComponent(r.reference)}/status`, { method: "POST", body: move });
      if (res.status !== 200) moved.failed += 1;
      else if (move.to === "Rejected") moved.rejected += 1;
      else {
        moved.assigned += 1;
        assignees[move.assigneeId] = (assignees[move.assigneeId] ?? 0) + 1;
      }
    }
  }

  const after = await coordinator.call("/queue");
  const result = {
    kind: "seed",
    issue: "#124",
    requested: count,
    submitted: saved.length,
    submissionFailures: failures.length,
    firstFailures: failures.slice(0, 5),
    mix: opts["no-mix"] ? null : { ...moved, perAssignee: assignees },
    queueTotalBefore: before.body.total,
    queueTotalAfter: after.body?.total ?? null,
    sessionRenewals: requester.renewals + coordinator.renewals,
    ...(await provenance(started, wakeUp)),
  };
  const file = writeResult("seed", result);
  console.log(`submitted ${result.submitted} of ${count}, ${failures.length} failed; queue now ${result.queueTotalAfter}`);
  if (result.mix) console.log(`rejected ${moved.rejected}, assigned ${moved.assigned} across ${Object.keys(assignees).length} staff, ${moved.failed} moves failed, ${moved.noStaff} with no staff to assign`);
  console.log(`written ${file}`);
  if (failures.length > 0) process.exitCode = 1;
}
