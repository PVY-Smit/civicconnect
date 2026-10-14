// NFR-002: request submission confirms quickly enough that the requester does not resubmit (#124).
//
//   node nfr-002-submission.mjs [--samples 20]
//
// NFR-002's own method: 20 timed submissions under normal conditions. Target: 95th percentile under 3.0
// seconds from submit to acknowledgement. Each submission is a complete, valid request, so every sample
// includes validation, the reference from the sequence and the write with its first history row (ADR-007).
// The requests stay on the target and are titled as performance runs. A run with fewer than 20 submissions
// is marked as not following NFR-002's method.

import { parseArgs } from "node:util";
import { environment, judge, serverVersion, signIn, summarise, wholeNumber, writeResult } from "./lib.mjs";

const TARGET_MS = 3000;
const { values: opts } = parseArgs({ options: { samples: { type: "string", default: "20" } } });
const samples = wholeNumber("samples", opts.samples);

const started = new Date();
const requester = await signIn("Requester");
const categories = (await requester.call("/categories")).body?.categories ?? [];
if (categories.length === 0) throw new Error("No active categories to submit requests in.");
const stamp = started.toISOString().slice(0, 16);

const runs = [];
for (let i = 0; i < samples; i++) {
  const r = await requester.call("/requests", {
    method: "POST",
    body: {
      title: `Performance run, submission ${i + 1} of ${samples} (${stamp})`,
      description: "Submitted by the NFR-002 measurement (#124).",
      categoryId: categories[i % categories.length].id,
      location: "1 Measurement Road",
      reportedUrgency: "Medium",
    },
  });
  runs.push({ ms: Math.round(r.ms * 10) / 10, unroundedMs: r.ms, status: r.status, reference: r.body?.reference ?? null, ...(r.raw ? { raw: r.raw } : {}) });
}
const ok = runs.filter((r) => r.status === 201);
const okMs = ok.map((r) => r.unroundedMs);

const result = {
  kind: "NFR-002",
  issue: "#124",
  requirement: "Request submission: 95th percentile under 3.0 seconds from submit to acknowledgement",
  method: `${samples} sequential timed POST /api/requests as the Requester, each a complete valid request, timed until the acknowledgement is read`,
  targetP95Ms: TARGET_MS,
  errors: runs.length - ok.length,
  sessionRenewals: requester.renewals,
  summary: okMs.length ? summarise(okMs) : null,
  outcome: judge({ attempted: samples, okMs, targetMs: TARGET_MS }),
  samples: runs.map(({ unroundedMs, ...r }) => r),
  started: started.toISOString(),
  finished: new Date().toISOString(),
  environment: environment(),
  server: await serverVersion(),
};
const file = writeResult("nfr-002", result);
const s = result.summary;
console.log(`NFR-002: ${ok.length} of ${samples} submissions${s ? `; p50 ${s.p50Ms} ms, p95 ${s.p95Ms} ms, max ${s.maxMs} ms` : ""}`);
console.log(`target p95 < ${TARGET_MS} ms: ${result.outcome}`);
console.log(`written ${file}`);
