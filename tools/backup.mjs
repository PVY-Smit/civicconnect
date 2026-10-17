// Backup and tested restore for the simulated production database (#122, DEC-010, ADR-007).
//
//   node tools/backup.mjs backup  <database URL> <backup directory>
//   node tools/backup.mjs restore <backup file> <empty database URL>
//   node tools/backup.mjs compare <database URL> <other database URL>
//
// backup writes a custom-format pg_dump named for the release and the time, and prints its size and
// SHA-256 so the copy can be checked later. restore loads one into an empty database with pg_restore,
// keeping the grants, so the application's role works on the restored copy as it did before. compare counts
// the rows of every application table in both databases, with the reference sequence's position, and
// exits 1 if any differs: a restore is only trusted once it has been compared (and the smoke check run
// against a server on it).
//
// The URLs carry the owner's credentials, so they are passed in and never written to a file. pg_dump and
// pg_restore come from PG_BIN when it is set (the PostgreSQL 16 bin directory), otherwise from the PATH.
// The backup directory must be outside every working tree: a dump holds personal data (NFR-008).

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const TABLES = ["users", "categories", "user_categories", "requests", "request_status_history", "action_entries", "audit_entries", "account_events", "_prisma_migrations"];
const bin = (name) => (process.env.PG_BIN ? join(process.env.PG_BIN, name) : name);

function run(command, args) {
  const result = spawnSync(bin(command), args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${command} failed: ${(result.stderr || result.error?.message || "").trim()}`);
  return result.stdout;
}

async function counts(url) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const out = {};
    for (const table of TABLES) out[table] = Number((await client.query(`SELECT count(*) AS n FROM "${table}"`)).rows[0].n);
    const seq = (await client.query("SELECT last_value, is_called FROM request_reference_seq")).rows[0];
    out.request_reference_seq = `${seq.last_value}${seq.is_called ? "" : " (not called)"}`;
    return out;
  } finally {
    await client.end();
  }
}

const [command, ...args] = process.argv.slice(2);

if (command === "backup" && args.length === 2) {
  const [url, dir] = args;
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = join(dir, `civicconnect-${process.env.RELEASE ?? "unreleased"}-${stamp}.dump`);
  run("pg_dump", ["--format=custom", "--file", file, "--dbname", url]);
  const sha = createHash("sha256").update(readFileSync(file)).digest("hex");
  console.log(`backup ${file}\nsize ${statSync(file).size} bytes\nsha256 ${sha}`);
} else if (command === "restore" && args.length === 2) {
  const [file, url] = args;
  run("pg_restore", ["--exit-on-error", "--dbname", url, file]);
  console.log(`restored ${file}`);
} else if (command === "compare" && args.length === 2) {
  const [a, b] = await Promise.all(args.map(counts));
  let same = true;
  for (const key of Object.keys(a)) {
    const match = String(a[key]) === String(b[key]);
    if (!match) same = false;
    console.log(`${match ? "same" : "DIFF"}  ${key.padEnd(24)} ${a[key]}${match ? "" : ` vs ${b[key]}`}`);
  }
  console.log(same ? "The two databases hold the same rows." : "The databases differ.");
  process.exit(same ? 0 : 1);
} else {
  console.error("Usage: node tools/backup.mjs backup <url> <dir> | restore <file> <url> | compare <url> <url>");
  process.exit(2);
}
