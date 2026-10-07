# Performance: the staff queue and request submission

The M3 performance exercise (#124, M3 brief s13), and TC-35 in the test catalogue. The scripts are in
`perf/`. Each run writes its raw result, with the environment it ran in, to `results/`.

**Status:** the scripts are written and checked. They have not run against the real system: they need
staging (#122), the seed data and accounts (#109) and the queue endpoint (#114). This page is completed with
the results and their interpretation once they run.

## What is measured, and why

| Measurement | Operation | Why it matters | Target |
|---|---|---|---|
| NFR-001 (Must) | Retrieving the first page of the staff queue, as the Coordinator, with 5,000 requests stored | Staff and Coordinators work from the queue all day, and it reads more data than any other screen. The Coordinator's queue is every request (FR-013), the largest scope any user has | 95th percentile under 2.0 s over 20 retrievals |
| NFR-002 (Must) | Submitting a complete request, until the acknowledgement arrives | A requester who waits too long submits again, and the municipality gets duplicate requests (STK-01) | 95th percentile under 3.0 s over 20 submissions |
| Concurrent run | 10 clients retrieving the first queue page in a loop for 30 s | Shows how the queue behaves under concurrent reads, and whether it starts failing | None set by the requirements, so none is invented. NFR-001's single-user target is shown beside the result for comparison only |

Each target is the requirement's own, with its own method: NFR-001 and NFR-002 both state 20 timed
operations and the distribution, not the mean.

## Workload and data

- **Dataset:** 5,000 requests, submitted through the API as the seeded Requester (`perf/seed.mjs`). Each
  gets its reference from the sequence and its first history row, as real requests do (ADR-007). They are
  spread evenly across the active categories and the three urgency levels. The Coordinator then rejects one
  in ten and assigns three in ten, so the queue holds New, Assigned and Rejected requests. A second run
  adds nothing if the queue already holds 5,000.
- **NFR-001:** one untimed warm-up retrieval, recorded separately so a cold start is visible, then 20
  sequential timed retrievals. A run against fewer than 5,000 requests is refused. A run whose answer holds
  more rows than one page is marked invalid, because NFR-001 times the first page, not the whole queue.
- **NFR-002:** 20 sequential timed submissions of complete, valid requests. They stay on staging, titled
  as performance runs.
- **Concurrent run:** 10 clients sharing the Coordinator's session, each waiting for an answer before asking
  again, for 30 s. It records the latency distribution, throughput, and every non-200 answer and network
  error. Ten clients is a small workload chosen to show behaviour under concurrent reads; it is not derived
  from municipal usage data, which the project does not have.

**How a time is taken.** From just before the request is sent until the whole response body has been read,
with Node's high-resolution timer. That is the server's time plus the network between the measuring
machine and staging. It is not the browser's time to draw the screen.

**How the percentile is calculated.** The nearest-rank method: with 20 samples, the 95th percentile is the
19th smallest. It is always a value that was actually measured. `perf/test/lib.test.js` pins this,
including that one slow sample in 20 does not move the 95th percentile and two do.

## Environment

Every result file records:
- the target URL;
- the measuring machine's operating system, processor, cores and memory;
- the Node version and the scripts' commit;
- the server's release identification from `/api/health`, once staging provides it (#122).

The staging host, its database and their sizes are recorded here when the run is made.

## Running it

The scripts use Node's built-in `fetch` and timer only, so there is nothing to install. They read the same
environment variables as the browser journeys (`e2e/README.md`):
- `E2E_BASE_URL`;
- the Requester's and the Coordinator's email and password.

```bash
cd perf
npm test
node seed.mjs
node nfr-001-queue.mjs
node nfr-002-submission.mjs
node queue-load.mjs
```

`seed.mjs` takes `--count`, `--concurrency`, `--no-mix` and `--force`. `nfr-001-queue.mjs` takes
`--samples` and `--min-total`, `nfr-002-submission.mjs` takes `--samples`, and `queue-load.mjs` takes
`--connections` and `--duration`. The defaults are the workload above. A run against anything but staging
should set `PERF_RESULTS_DIR` to a folder outside the repository, so its result is never mistaken for
evidence.

## What this does not show

- **Municipal production scale.** 5,000 requests is NFR-001's baselined volume, not years of a
  municipality's requests, and 10 clients are not its whole staff.
- **Dates spread over time.** The seeded requests are all submitted on the day of the run, so they do not
  test how the queue behaves when sorting and filtering by date across months.
- **Writes and reads together.** The concurrent run only reads. Contention between staff changing requests
  and the queue being read is not measured.
- **The screen.** Times are for the API answer, not for the browser drawing the queue.
- **Other hosts or networks.** The result holds for the staging host and the network path recorded with it.
  A cold start after idle on a free-tier host can be slower than the warm-up shows.

## Trial against the API stand-in

On 7 October 2026 the scripts were run against the local stand-in of the API contract used for the client
screens, not against the real server. The aim was to check the scripts, not the system, so the results were
written outside the repository and are not evidence:
- the seed added 5,000 requests and the mix, with no failures, in 34 s;
- a second seed run added nothing;
- NFR-001 refused a dataset smaller than asked for;
- NFR-002 and the concurrent run completed with no errors.

NFR-001 marked its own run invalid, because the stand-in answers with the whole queue rather than one page.
That is the check above working as intended.
