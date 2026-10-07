// Checks the test catalogue (docs/quality/test-catalogue.md, #126) against the tests that exist.
//
//   node tools/check_test_catalogue.mjs                          # from the repository root
//   node tools/check_test_catalogue.mjs --catalogue <path> --strict
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
// With --strict it exits 1 on a failed test, a line that matches nothing, or an uncatalogued test.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
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
const files = [...new Set([...listDir("tests"), ...listDir("client/test"), ...records.flatMap((r) => r.refs.map((x) => x.file))])].filter((f) =>
  existsSync(join(".", f)),
);
const results = Object.fromEntries(files.map((f) => [f, testsIn(f)]));

// ---- match ----
const matches = (pattern, name) => (pattern.endsWith("*") ? name.startsWith(pattern.slice(0, -1)) : name === pattern);
const listed = new Set();
const problems = [];
let failed = 0;

console.log("record   pass  fail  todo  absent");
for (const r of records) {
  const count = { pass: 0, fail: 0, todo: 0, skip: 0, absent: 0 };
  for (const ref of r.refs) {
    if (!results[ref.file]) {
      count.absent += 1;
      continue;
    }
    const hit = results[ref.file].filter((t) => matches(ref.pattern, t.name));
    if (hit.length === 0 && ref.pr) {
      count.absent += 1;
      continue;
    }
    if (hit.length === 0) problems.push(`${r.id}: no test in ${ref.file} matches "${ref.pattern}"`);
    for (const t of hit) {
      listed.add(`${ref.file}\u0000${t.name}`);
      count[t.result] += 1;
    }
  }
  failed += count.fail;
  console.log(`${r.id.padEnd(8)} ${String(count.pass).padStart(4)}  ${String(count.fail).padStart(4)}  ${String(count.todo).padStart(4)}  ${count.absent ? `${count.absent} line(s) not on this branch` : ""}`);
}

for (const [file, tests] of Object.entries(results)) {
  for (const t of tests) if (!listed.has(`${file}\u0000${t.name}`)) problems.push(`not in the catalogue: ${file}: ${t.name}`);
}

const total = Object.values(results).flat();
console.log(`\n${files.length} test files, ${total.length} tests: ${total.filter((t) => t.result === "pass").length} pass, ${failed} fail in catalogued records`);
for (const p of problems) console.log(p);
if (strict && (failed > 0 || problems.length > 0)) process.exit(1);
