// Checks the test catalogue (docs/quality/test-catalogue.md, #126) against the tests that exist.
//
//   node tools/check_test_catalogue.mjs                          # from the repository root
//   node tools/check_test_catalogue.mjs --catalogue <path> --strict
//   node tools/check_test_catalogue.mjs --strict --complete        # once every listed pull request is merged
//
// Each catalogue record lists the automated tests that carry it, one per line under "Automated by":
//
//   - `tests/workflow-status.test.js`: the table holds exactly the transitions in the Status Model register
//   - `tests/api-state-transitions.test.js`: FR-016 *
//
// A name ending in * matches every test whose name starts with the rest. A name ending in a pull request
// tag, such as [#136], is a test that pull request adds. The tool runs each test file it finds with
// node:test, then reports, per record, how many of its tests passed, failed or are todo; every catalogue line
// that matches no test; and every test that no record lists. A file missing from this checkout, or a tagged
// test missing from it, is reported as "not on this branch", not as a failure, because records cover open
// pull requests.
// The browser journeys in e2e/ need a deployed instance, so they are listed with Playwright's --list rather
// than run, and counted as listed. Their results come from the run against staging (#122, #123).
// A test file that reaches PostgreSQL through src/lib/prisma.js runs only where a database is configured
// (DATABASE_URL, or a .env file) and the Prisma client is generated (npx prisma generate). Elsewhere it is
// not run, and its lines are reported as needing a database, as a missing file is reported.
//
// The per-record line counts the record's tests by result: pass, fail, todo and skip (node:test's TODO and
// SKIP directives, so a test that is switched off is shown, never silently dropped), listed (browser journeys
// found by --list, not run) and the lines not on this branch.
// With --strict it exits 1 on a failed test, a line that matches nothing, or an uncatalogued test.
// --strict alone passes when a listed test file has been deleted, because a missing file is reported as not
// on this branch. With --complete, every line not on this branch is named with its reason and the tool
// exits 1, so a deleted file, a tagged test that never merged, or journeys that could not be listed fail.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const complete = args.includes("--complete");
const at = args.indexOf("--catalogue");
const catalogue = at >= 0 ? args[at + 1] : "docs/quality/test-catalogue.md";

// ---- the catalogue's records and their test references ----
const records = [];
let current = null;
let inAutomated = false;
for (const line of readFileSync(catalogue, "utf-8").split(/\r?\n/)) {
  const heading = line.match(/^### (TC-\d+)\b/);
  if (heading) {
    current = { id: heading[1], refs: [] };
    records.push(current);
    inAutomated = false;
    continue;
  }
  if (!current) continue;
  if (/^\*\*Automated by\*\*/.test(line)) {
    inAutomated = true;
    continue;
  }
  const ref = line.match(/^- `([^`]+)`: (.+)$/);
  if (inAutomated && ref) {
    const tagged = ref[2].trim().match(/^(.*?)\s+\[(#\d+)\]$/);
    current.refs.push({ file: ref[1], pattern: tagged ? tagged[1] : ref[2].trim(), pr: tagged ? tagged[2] : null });
  }
  else if (inAutomated && line.trim() && !ref) inAutomated = false;
}

// ---- the tests, by running each referenced file and every test file in the usual places ----
// Playwright's list: "  [chromium] › file.spec.js:10:1 › name", paths relative to the journeys folder.
const PLAYWRIGHT = "e2e/node_modules/@playwright/test/cli.js";
function journeysIn(files) {
  if (files.length === 0 || !existsSync(PLAYWRIGHT)) return {};
  let out = "";
  try {
    out = execFileSync(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--list"], {
      cwd: "e2e",
      encoding: "utf-8",
      env: { ...process.env, E2E_BASE_URL: process.env.E2E_BASE_URL || "http://localhost" }, // listing opens no page
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    out = error.stdout ?? "";
  }
  const found = Object.fromEntries(files.map((f) => [f, []]));
  for (const l of out.split(/\r?\n/)) {
    const m = l.match(/^\s+\[[^\]]+\] › (.+?):\d+:\d+ › (.+)$/);
    const file = m && `e2e/journeys/${m[1].split("\\").join("/")}`;
    if (m && found[file]) found[file].push({ name: m[2], result: "listed" });
  }
  return found;
}

function testsIn(file) {
  const cwd = file.startsWith("client/") ? "client" : ".";
  const rel = file.startsWith("client/") ? file.slice("client/".length) : file;
  let out;
  try {
    out = execFileSync(process.execPath, ["--test", "--test-reporter=tap", rel], { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    out = error.stdout ?? ""; // a failing test exits 1; its TAP is still on stdout
  }
  const tests = [];
  for (const l of out.split(/\r?\n/)) {
    const m = l.match(/^(not ok|ok) \d+ - (.*?)(?: # (TODO|SKIP)\b.*)?$/); // top level only: no indentation
    if (m) tests.push({ name: m[2].replace(/\\#/g, "#"), result: m[3] ? m[3].toLowerCase() : m[1] === "ok" ? "pass" : "fail" });
  }
  return tests;
}

const listDir = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".test.js")).map((f) => `${dir}/${f}`) : []);
const listSpecs = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".spec.js")).map((f) => `${dir}/${f}`) : []);
const files = [...new Set([...listDir("tests"), ...listDir("client/test"), ...listDir("perf/test"), ...listSpecs("e2e/journeys"), ...records.flatMap((r) => r.refs.map((x) => x.file))])].filter((f) =>
  existsSync(join(".", f)),
);
const NO_DATABASE = "needs a database: set DATABASE_URL and run npx prisma generate";
const needsDatabase = (file) => /lib\/prisma\.js/.test(readFileSync(file, "utf-8"));
const databaseReady = Boolean(process.env.DATABASE_URL || existsSync(".env")) && existsSync("src/generated/client");
const notRun = new Set(databaseReady ? [] : files.filter((f) => !f.startsWith("e2e/") && needsDatabase(f)));
const journeyFiles = files.filter((f) => f.startsWith("e2e/"));
const results = {
  ...Object.fromEntries(files.filter((f) => !f.startsWith("e2e/") && !notRun.has(f)).map((f) => [f, testsIn(f)])),
  ...journeysIn(journeyFiles),
};

// ---- match ----
const matches = (pattern, name) => (pattern.endsWith("*") ? name.startsWith(pattern.slice(0, -1)) : name === pattern);
const catalogued = new Set();
const problems = [];
const absent = [];
let failed = 0;

// Why a line is not on this branch, for --complete.
function absence(ref) {
  if (!existsSync(join(".", ref.file))) return `${ref.file} is not in this checkout`;
  if (notRun.has(ref.file)) return `${ref.file} ${NO_DATABASE}`;
  if (ref.file.startsWith("e2e/") && !existsSync(PLAYWRIGHT)) return `${ref.file} cannot be listed: run npm ci in e2e`;
  return `${ref.file} has no test "${ref.pattern}" from ${ref.pr}`;
}

console.log("record   pass  fail  todo  skip  listed  absent");
for (const r of records) {
  const count = { pass: 0, fail: 0, todo: 0, skip: 0, listed: 0, absent: 0, database: 0 };
  for (const ref of r.refs) {
    if (notRun.has(ref.file)) {
      count.database += 1;
      absent.push(`${r.id}: ${absence(ref)}`);
      continue;
    }
    if (!results[ref.file]) {
      count.absent += 1;
      absent.push(`${r.id}: ${absence(ref)}`);
      continue;
    }
    const hit = results[ref.file].filter((t) => matches(ref.pattern, t.name));
    if (hit.length === 0 && ref.pr) {
      count.absent += 1;
      absent.push(`${r.id}: ${absence(ref)}`);
      continue;
    }
    if (hit.length === 0) problems.push(`${r.id}: no test in ${ref.file} matches "${ref.pattern}"`);
    for (const t of hit) {
      catalogued.add(`${ref.file}\u0000${t.name}`);
      count[t.result] += 1;
    }
  }
  failed += count.fail;
  console.log(`${r.id.padEnd(8)} ${String(count.pass).padStart(4)}  ${String(count.fail).padStart(4)}  ${String(count.todo).padStart(4)}  ${String(count.skip).padStart(4)}  ${String(count.listed).padStart(6)}  ${[count.absent && `${count.absent} line(s) not on this branch`, count.database && `${count.database} line(s) need a database`].filter(Boolean).join("; ")}`);
}

for (const [file, tests] of Object.entries(results)) {
  for (const t of tests) if (!catalogued.has(`${file}\u0000${t.name}`)) problems.push(`not in the catalogue: ${file}: ${t.name}`);
}

const total = Object.values(results).flat();
console.log(`\n${files.length} test files, ${total.length} tests: ${total.filter((t) => t.result === "pass").length} pass, ${failed} fail in catalogued records`);
for (const p of problems) console.log(p);
if (complete) for (const a of new Set(absent)) console.log(`not on this branch: ${a}`);
if ((strict && (failed > 0 || problems.length > 0)) || (complete && absent.length > 0)) process.exit(1);
