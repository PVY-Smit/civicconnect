// What the performance scripts share (#124): configuration, signing in, timing a call, the statistics, the
// verdict, and writing a results file. Node's built-in fetch and high-resolution timer only, so nothing is
// installed.
//
// The target and the accounts come from the environment, the same variables the browser journeys use
// (e2e/README.md), never from the repository (NFR-007).

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// Results go to docs/quality/performance/results, where staging runs are committed as evidence. PERF_RESULTS_DIR
// sends a trial run elsewhere, so a run against anything but staging is never mistaken for evidence.
export const RESULTS = process.env.PERF_RESULTS_DIR || join(HERE, "..", "docs", "quality", "performance", "results");

// NFR-001 and NFR-002 each state their method as 20 timed operations. A run with fewer is reported, but its
// outcome says it does not follow the requirement's method.
export const METHOD_SAMPLES = 20;

export function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name}. The performance scripts read the target and accounts from the environment; see docs/quality/performance/README.md.`);
  return value;
}

export const baseUrl = () => env("E2E_BASE_URL").replace(/\/+$/, "");
export const account = (role) => ({ email: env(`E2E_${role.toUpperCase()}_EMAIL`), password: env(`E2E_${role.toUpperCase()}_PASSWORD`) });

// A whole number of at least min from a command-line option, or an error that names the option.
// Number("abc") is NaN, and a loop to NaN runs no times, so a typo would otherwise give an empty run.
export function wholeNumber(name, raw, { min = 1 } = {}) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) throw new Error(`--${name} must be a whole number of at least ${min}; it is "${raw}".`);
  return value;
}

// A response body as JSON, or, for anything else (a proxy's HTML error page, a host still starting), null
// with the start of the text kept, so one bad answer is recorded rather than ending the run.
export function parseBody(text) {
  if (!text) return { body: null };
  try {
    return { body: JSON.parse(text) };
  } catch {
    return { body: null, raw: text.slice(0, 200) };
  }
}

// Signs in through the API and returns a client that sends the session cookie with every call. Each call
// is timed from just before the request is sent until the whole response body has been read, which is when
// a screen could show it; the JSON is parsed after the timer stops.
//
// A call that fails before an answer arrives (a reset connection, a timeout, a host that is down) returns
// status 0 with the error, so the run records it as a failed call and still writes its result.
//
// If the session has ended (401), the client signs in again and repeats the call, and only the repeat is
// timed. Calls running at the same time share one sign-in: a call whose 401 arrives while another is signing
// in waits for it, and one that was sent with a session already replaced only repeats. renewals counts the
// sign-ins, not the calls that waited, so a result shows how often the session ended.
export async function signIn(role) {
  const client = { cookie: null, renewals: 0 };
  let renewing = null;

  async function login() {
    const res = await fetch(`${baseUrl()}/api/auth/sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(account(role)),
    });
    if (res.status !== 200) throw new Error(`Signing in as the ${role} answered ${res.status}.`);
    const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    if (!cookie) throw new Error(`Signing in as the ${role} set no session cookie.`);
    client.cookie = cookie;
  }

  async function once(path, { method = "GET", body } = {}) {
    const start = performance.now();
    try {
      const r = await fetch(`${baseUrl()}/api${path}`, {
        method,
        headers: { Cookie: client.cookie, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await r.text();
      const ms = performance.now() - start;
      return { ms, status: r.status, ...parseBody(text) };
    } catch (error) {
      return { ms: performance.now() - start, status: 0, body: null, error: networkError(error) };
    }
  }

  async function renew(sentWith) {
    if (client.cookie !== sentWith) return; // another call has already signed in again
    renewing ??= login()
      .then(() => {
        client.renewals += 1;
      })
      .finally(() => {
        renewing = null;
      });
    await renewing;
  }

  client.call = async (path, options) => {
    const sentWith = client.cookie;
    const first = await once(path, options);
    if (first.status !== 401) return first;
    await renew(sentWith);
    return once(path, options);
  };

  await login();
  return client;
}

// The p-th percentile by the nearest-rank method: the smallest sample with at least p percent of the
// samples at or below it. With 20 samples the 95th percentile is the 19th smallest. No interpolation, so the
// value reported is one that was actually measured.
export function percentile(samples, p) {
  if (samples.length === 0) throw new Error("No samples.");
  if (!(p > 0 && p <= 100)) throw new Error(`Percentile out of range: ${p}`);
  const sorted = [...samples].sort((a, b) => a - b);
  // p * n first: (p / 100) * n can land just above a whole number (7 / 100 * 100 is 7.000000000000001),
  // and the rank would be one too high.
  return sorted[Math.ceil((p * sorted.length) / 100) - 1];
}

const round = (ms) => Math.round(ms * 10) / 10;

// The distribution for the report, rounded to 0.1 ms. The verdict is taken on the unrounded value (judge).
export function summarise(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    count: samples.length,
    minMs: round(sorted[0]),
    p50Ms: round(percentile(samples, 50)),
    p90Ms: round(percentile(samples, 90)),
    p95Ms: round(percentile(samples, 95)),
    maxMs: round(sorted.at(-1)),
    meanMs: round(samples.reduce((a, b) => a + b, 0) / samples.length),
  };
}

// A pass or fail against a target, for the summary line. The target is the requirement's, not the script's.
export const verdict = (valueMs, targetMs) => (valueMs < targetMs ? "meets" : "does not meet");

// The outcome of a run against a requirement. A run is invalid if any operation failed, if a check of the
// answers failed (invalidReason), or if it took fewer samples than the requirement's method; otherwise the
// 95th percentile of the measured times, unrounded, is compared with the target. 1999.96 ms meets a
// 2,000 ms target even though it is reported as 2000.0.
export function judge({ attempted, okMs, targetMs, minSamples = METHOD_SAMPLES, invalidReason = null }) {
  if (okMs.length !== attempted) return `invalid: ${attempted - okMs.length} of ${attempted} failed`;
  if (invalidReason) return `invalid: ${invalidReason}`;
  if (attempted < minSamples) return `invalid: ${attempted} samples, fewer than the ${minSamples} the requirement's method takes`;
  return verdict(percentile(okMs, 95), targetMs);
}

// NFR-001 times the first page of the queue. An answer is that page only if it holds exactly as many rows
// as the queue has, up to one page, so an empty or error-shaped 200, or the whole queue, does not count.
export function firstPageProblem({ rows, pageSize, total }) {
  if (!Number.isInteger(pageSize) || pageSize < 1) return "the answer gave no page size";
  if (!Number.isInteger(rows)) return "an answer held no list of requests";
  const expected = Math.min(pageSize, total);
  if (rows !== expected) return `an answer held ${rows} rows, where the first page of ${total} holds ${expected}`;
  return null;
}

// The category and reported urgency of the n-th seeded request. Categories rotate; the urgency moves on once
// per full round of categories, so every category gets every urgency equally. With three categories, n % 3
// for both would give each category a single urgency.
export const URGENCY = ["Low", "Medium", "High"];
export function seedFields(n, categoryCount) {
  return { category: n % categoryCount, urgency: URGENCY[Math.floor(n / categoryCount) % URGENCY.length] };
}

// A fixed pseudo-random sequence (mulberry32), so a seed run is repeatable but its choices do not follow the
// rotation of categories and urgency above.
function sequence(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

// The seed's mix (seed.mjs): which move, if any, each of the n saved requests gets. A tenth are rejected and
// three tenths assigned, rounded, the rest left New. Which requests get a move is a fixed shuffle, not a
// position, so the mix is spread across categories and urgencies: a rule by position, such as every tenth,
// would reject only one category whenever the number of categories divides ten.
export function mixMoves(n, seed = 124) {
  const random = sequence(seed);
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const rejected = Math.round(n / 10);
  const assigned = Math.round((3 * n) / 10);
  const moves = Array(n).fill(null);
  order.forEach((i, rank) => {
    if (rank < rejected) moves[i] = "Rejected";
    else if (rank < rejected + assigned) moves[i] = "Assigned";
  });
  return moves;
}

// Where and with what a run was made, recorded with its result as the brief asks (s13). scriptsChanged is
// true when perf/ has changes not committed at scriptsCommit, so a result from uncommitted code is flagged.
export function environment() {
  let commit = null;
  let scriptsChanged = null;
  try {
    commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: HERE, encoding: "utf-8" }).trim();
    scriptsChanged = execFileSync("git", ["status", "--porcelain", "--", "."], { cwd: HERE, encoding: "utf-8" }).trim() !== "";
  } catch {
    // not a checkout
  }
  return {
    target: baseUrl(),
    client: { os: `${os.type()} ${os.release()}`, cpu: os.cpus()[0]?.model ?? "unknown", cores: os.cpus().length, memoryGb: Math.round(os.totalmem() / 2 ** 30), node: process.version },
    scriptsCommit: commit,
    scriptsChanged,
  };
}

// The server's health check. #90 serves it at /health, outside /api, answering { status: "ok" }.
export const HEALTH_PATH = "/health";

// The server's release identification, if its health check gives one (#122). Recorded with every result.
export async function serverVersion() {
  try {
    const r = await fetch(`${baseUrl()}${HEALTH_PATH}`);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

// Waits until the health check answers 200, before anything is timed. A free-tier host that has gone idle
// takes a while to wake, and that wait is no sample's time. Returns how long it took and how many checks
// were made, which the result records apart from the samples. Gives up after timeoutMs with an error that
// says so.
export async function waitForHealthy({ timeoutMs = 180_000, intervalMs = 2_000 } = {}) {
  const start = performance.now();
  let attempts = 0;
  let last = "no answer";
  while (true) {
    attempts += 1;
    try {
      const r = await fetch(`${baseUrl()}${HEALTH_PATH}`, { signal: AbortSignal.timeout(intervalMs * 5) });
      await r.text();
      if (r.status === 200) return { ms: Math.round(performance.now() - start), attempts };
      last = `status ${r.status}`;
    } catch (error) {
      last = networkError(error);
    }
    if (performance.now() - start + intervalMs > timeoutMs) {
      throw new Error(`${baseUrl()}${HEALTH_PATH} did not answer 200 within ${Math.round(timeoutMs / 1000)} s (${attempts} checks, last: ${last}).`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

// Whether a result can be evidence: the scripts that made it were committed as they ran, and the server
// named the release it was running, so the result belongs to one build. Gives the reasons it cannot, or null.
export const RELEASE_FIELDS = ["release", "version", "commit"];
export function evidenceProblem(environment, server) {
  const problems = [];
  if (environment?.scriptsChanged !== false) problems.push(environment?.scriptsChanged ? "perf/ had uncommitted changes" : "the scripts' commit is unknown");
  if (!RELEASE_FIELDS.some((f) => typeof server?.[f] === "string" && server[f].trim() !== "")) problems.push("the server did not identify its release");
  return problems.length ? problems.join("; ") : null;
}

// The words for a call that failed before an answer, with the underlying cause's code where Node gives one
// (fetch reports "fetch failed" with the reason in its cause).
export function networkError(error) {
  const code = error?.cause?.code ?? error?.cause?.name ?? error?.name;
  const message = String(error?.message ?? error);
  return code && !message.includes(code) ? `${message} (${code})` : message;
}

// The parts every result file ends with: when it ran, the environment, the server's release, and whether
// the result can be evidence.
export async function provenance(started, wakeUp) {
  const env = environment();
  const server = await serverVersion();
  const problem = evidenceProblem(env, server);
  return {
    started: started.toISOString(),
    finished: new Date().toISOString(),
    wakeUp,
    environment: env,
    server,
    evidence: problem ? `not evidence: ${problem}` : "evidence",
  };
}

export function writeResult(name, result) {
  mkdirSync(RESULTS, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const file = join(RESULTS, `${stamp}-${name}.json`);
  writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  return file;
}
