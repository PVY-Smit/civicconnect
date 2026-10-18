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
  gets its reference from the sequence and its first history row, as real requests do (ADR-007). Every
  active category gets every urgency level equally. The Coordinator then rejects a tenth of the saved
  requests and assigns three tenths, rotating through the Staff members authorised for each category, so
  the queue holds New, Assigned and Rejected requests and no one Staff member holds all the assigned ones.
  Which requests are moved is a fixed shuffle, the same on every run, so the moves are spread across
  categories and urgency levels; a rule by position, such as every tenth request, would reject only one
  category whenever the number of categories divides ten. The proportions are taken over the requests that
  were saved, so a failed submission does not shift them, and the result file records how many each Staff
  member received.
- **Seeding twice:** the guard is by count only. If the queue already holds 5,000 requests, whatever they
  are, a second run adds nothing. On a target holding other requests (earlier NFR-002 runs, manual
  testing), seed a fresh database, or use `--force` and check the total afterwards.
- **NFR-001:** one untimed warm-up retrieval, recorded separately so a cold start is visible, then 20
  sequential timed retrievals. A run against fewer than 5,000 requests is refused. A run is marked invalid
  if any answer is not exactly the first page: it must hold as many rows as the queue has, up to one page,
  so an empty or error-shaped answer, or the whole queue, does not count.
- **NFR-002:** 20 sequential timed submissions of complete, valid requests. They stay on staging, titled
  as performance runs.
- **Concurrent run:** 10 clients sharing the Coordinator's session, each waiting for an answer before asking
  again, for 30 s. The first 5 s are a warm-up, counted by status but left out of the latencies and the
  throughput, so a cold start does not inflate them. It records the latency distribution, throughput, and
  every non-200 answer and network error. The 99th percentile is given with the number of samples it rests
  on, and only from 100 samples up. Ten clients is a small workload chosen to show behaviour under concurrent reads; it is not derived
  from municipal usage data, which the project does not have.

**Waiting for the host.** Before anything is timed, each script checks the server's health check every 2 s
until it answers 200, for up to 3 minutes. A free-tier host that has gone idle takes a while to wake. The
wait is recorded in the result as `wakeUp` (its length and the number of checks), apart from the samples,
so it is neither timed nor counted as a failure. A host that does not answer in 3 minutes stops the run with
a message saying so.

**How a time is taken.** From just before the request is sent until the whole response body has been read,
with Node's high-resolution timer. The JSON is parsed after the timer stops. That is the server's time plus
the network between the measuring machine and staging. It is not the browser's time to draw the screen.

**When a run is invalid.** A run is reported, but its outcome says "invalid" and no verdict is given, if
any operation failed, if an NFR-001 answer was not exactly the first page, or if it took fewer than the 20
operations NFR-001 and NFR-002 state. Otherwise the unrounded 95th percentile is compared with the target:
a run at 1,999.96 ms meets a 2.0 s target even though the summary rounds it to 2000.0.

**Answers that are not JSON, network errors and ended sessions.** An answer that is not JSON, such as a
proxy's error page or a host still starting, is recorded with its status and the start of its text, and
does not end the run. A call that fails before any answer arrives, such as a reset connection or a timeout,
is recorded as status 0 with its cause: it counts as a failed call, so the run is marked invalid, and the
result is still written. If the session ends during a long run, the client signs in again, repeats the call
and times only the repeat. Calls running at the same time, as in the concurrent run, share one sign-in.
Each result file records how many times the session ended (`sessionRenewals`).

**How the percentile is calculated.** The nearest-rank method: with 20 samples, the 95th percentile is the
19th smallest. It is always a value that was actually measured. `perf/test/lib.test.js` pins this,
including that one slow sample in 20 does not move the 95th percentile and two do.

## Environment

Every result file records:
- the target URL;
- the measuring machine's operating system, processor, cores and memory;
- the Node version and the scripts' commit, and whether `perf/` had uncommitted changes at the time
  (`scriptsChanged`), so a result from uncommitted code is flagged;
- the server's answer from its health check, `/health` (#90). Today it says only `{"status": "ok"}`;
  staging adds the release it runs, as `release`, `version` or `commit` (#122);
- whether the result can be evidence (`evidence`).

**When a result is evidence.** A result is evidence only if it belongs to one build of the scripts and one
build of the server: `scriptsChanged` is `false`, and the server named its release. Otherwise `evidence`
says "not evidence" and why. A run that meets its target is still not evidence until both hold.

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
`--connections`, `--duration` and `--warmup`. Each must be a whole number, and a run stops with a message
naming the option otherwise. The defaults are the workload above.

**Reproducing a committed result.** Check out the result's `scriptsCommit`, confirm `evidence` says
"evidence", deploy the release in `server` to the target, and run the same script with the options in its `method` against the target it records. A run against anything but staging
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

On 12 October 2026, after the review of #139, the changed scripts were run against the stand-in again, with
the same aim and the results again outside the repository:
- the seed added 60 requests and the mix, rejecting 6 and assigning 18 across 2 Staff members;
- NFR-001 marked its run invalid with the reason "an answer held 62 rows, where the first page of 62 holds
  25";
- NFR-002 completed;
- the concurrent run left its 1 s warm-up out and gave its 99th percentile with the number of samples;
- `--samples abc` stopped with a message naming the option;
- every result file recorded `scriptsChanged: true`, since the changes were not yet committed.

On 14 October 2026, after the follow-ups from the review of #139 (#148), the scripts were run against the
stand-in again, with a `/health` route added to it as #90 serves it, and the results outside the
repository:
- with `E2E_BASE_URL` at a port where nothing answered, the seed waited 3 minutes for the health check and
  stopped with the message, before signing in;
- against the stand-in, each script recorded a wake-up of one check, and the seed added 60 requests,
  rejecting 6 and assigning 18 across 2 Staff members;
- NFR-001 marked its run invalid for the whole-queue answer, as before;
- NFR-002 met its target. The concurrent run, with 4 clients for 3 s, completed with no network errors;
- every result said "not evidence", naming the uncommitted changes and that the server gave no release.
