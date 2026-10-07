// What the performance scripts share (#124): configuration, signing in, timing a call, the statistics, and
// writing a results file. Node's built-in fetch and high-resolution timer only, so nothing is installed.
//
// The target and the accounts come from the environment, the same variables the browser journeys use
// (e2e/README.md), never from the repository (NFR-007).

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Results go to docs/quality/performance/results, where staging runs are committed as evidence. PERF_RESULTS_DIR
// sends a trial run elsewhere, so a run against anything but staging is never mistaken for evidence.
export const RESULTS = process.env.PERF_RESULTS_DIR || join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "quality", "performance", "results");

export function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name}. The performance scripts read the target and accounts from the environment; see docs/quality/performance/README.md.`);
  return value;
}

export const baseUrl = () => env("E2E_BASE_URL").replace(/\/+$/, "");
export const account = (role) => ({ email: env(`E2E_${role.toUpperCase()}_EMAIL`), password: env(`E2E_${role.toUpperCase()}_PASSWORD`) });

// Signs in through the API and returns a client that sends the session cookie with every call.
export async function signIn(role) {
  const res = await fetch(`${baseUrl()}/api/auth/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(account(role)),
  });
  if (res.status !== 200) throw new Error(`Signing in as the ${role} answered ${res.status}.`);
  const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  if (!cookie) throw new Error(`Signing in as the ${role} set no session cookie.`);
  const call = async (path, { method = "GET", body } = {}) => {
    const r = await fetch(`${baseUrl()}/api${path}`, {
      method,
      headers: { Cookie: cookie, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await r.text();
    return { status: r.status, body: text ? JSON.parse(text) : null };
  };
  return { cookie, call };
}

// One timed call: from just before the request is sent until the whole response body has been read, which
// is when a screen could show it.
export async function timed(fn) {
  const start = performance.now();
  const result = await fn();
  return { ms: performance.now() - start, ...result };
}

// The p-th percentile by the nearest-rank method: the smallest sample with at least p percent of the
// samples at or below it. With 20 samples the 95th percentile is the 19th smallest. No interpolation, so the
// value reported is one that was actually measured.
export function percentile(samples, p) {
  if (samples.length === 0) throw new Error("No samples.");
  if (!(p > 0 && p <= 100)) throw new Error(`Percentile out of range: ${p}`);
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.ceil((p / 100) * sorted.length) - 1];
}

const round = (ms) => Math.round(ms * 10) / 10;

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

// Where and with what a run was made, recorded with its result as the brief asks (s13).
export function environment() {
  let commit = null;
  try {
    commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf-8" }).trim();
  } catch {
    // not a checkout
  }
  return {
    target: baseUrl(),
    client: { os: `${os.type()} ${os.release()}`, cpu: os.cpus()[0]?.model ?? "unknown", cores: os.cpus().length, memoryGb: Math.round(os.totalmem() / 2 ** 30), node: process.version },
    scriptsCommit: commit,
  };
}

// The server's release identification, if staging exposes it (#122). Recorded, never required.
export async function serverVersion() {
  try {
    const r = await fetch(`${baseUrl()}/api/health`);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

export function writeResult(name, result) {
  mkdirSync(RESULTS, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const file = join(RESULTS, `${stamp}-${name}.json`);
  writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  return file;
}

// A pass or fail against a target, for the summary line. The target is the requirement's, not the script's.
export const verdict = (valueMs, targetMs) => (valueMs < targetMs ? "meets" : "does not meet");
