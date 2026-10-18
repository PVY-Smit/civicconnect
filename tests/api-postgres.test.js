// TC-32: the API against PostgreSQL. The same application the server runs (src/app.js, src/wiring.js),
// over the persistence adapter and a real database, through HTTP with a session cookie for each user.
//
// It checks what the in-memory stores of the other suites cannot: that the adapter keeps each service's
// store contract over Prisma. That means the reference comes from the sequence (DEC-017), a change, its
// history row and its audit entries are written together (FR-025, ADR-001 rule 3), the conditional update
// refuses the second of two moves from the same state, the scope is applied in the query (FR-012), and a
// reset ends earlier sessions (FR-004).
//
// Needs DATABASE_URL, a migrated database (npx prisma migrate deploy) and the generated client. It makes
// its own users and category, with names no other test uses, and removes every row it made afterwards.

import { test } from "node:test";
import assert from "node:assert/strict";
import argon2 from "argon2";
import { randomBytes } from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { createApp } from "../src/app.js";
import { createDependencies } from "../src/wiring.js";
import { REFERENCE_PATTERN } from "../src/modules/request-capture/reference.js";

const run = randomBytes(4).toString("hex");
const PASSWORD = `tc32-${randomBytes(8).toString("hex")}`;
const env = { SESSION_SECRET: randomBytes(32).toString("hex"), REFERENCE_KEY: randomBytes(32).toString("hex"), OVERDUE_TARGET_DAYS: "10" };

async function makeUser(name, role, categoryIds = []) {
  const user = await prisma.user.create({
    data: { name: `TC-32 ${name} ${run}`, email: `tc32-${name.toLowerCase()}-${run}@civicconnect.test`, role, passwordHash: await argon2.hash(PASSWORD) },
  });
  for (const categoryId of categoryIds) await prisma.userCategory.create({ data: { userId: user.id, categoryId } });
  return user;
}

// A client with its own cookie, as each browser in the journeys has.
function client(base) {
  let cookie = null;
  return async function call(method, path, body) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    return { status: res.status, body: res.status === 204 ? null : await res.json() };
  };
}

test("TC-32: the API against PostgreSQL", async (t) => {
  const category = await prisma.category.create({ data: { name: `TC-32 category ${run}` } });
  const other = await prisma.category.create({ data: { name: `TC-32 other ${run}` } });
  const requester = await makeUser("Requester", "Requester");
  const stranger = await makeUser("Stranger", "Requester");
  const coordinator = await makeUser("Coordinator", "Coordinator");
  const staff = await makeUser("Staff", "Staff", [category.id]);
  const elsewhere = await makeUser("Elsewhere", "Staff", [other.id]);
  const manager = await makeUser("Manager", "Manager");
  const userIds = [requester, stranger, coordinator, staff, elsewhere, manager].map((u) => u.id);

  const app = createApp(await createDependencies({ prisma, env, log: () => {} }));
  const server = app.listen(0);
  t.after(async () => {
    server.close();
    const madeHere = await prisma.user.findMany({ where: { email: { contains: run } }, select: { id: true } });
    userIds.push(...madeHere.map((u) => u.id).filter((id) => !userIds.includes(id)));
    const requests = await prisma.request.findMany({ where: { requesterId: { in: userIds } }, select: { id: true } });
    const requestIds = requests.map((r) => r.id);
    await prisma.auditEntry.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.requestStatusHistory.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.actionEntry.deleteMany({ where: { requestId: { in: requestIds } } });
    await prisma.request.deleteMany({ where: { id: { in: requestIds } } });
    await prisma.accountEvent.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userCategory.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.category.deleteMany({ where: { OR: [{ id: { in: [category.id, other.id] } }, { name: { contains: run } }] } });
    await prisma.$disconnect();
  });
  const base = `http://localhost:${server.address().port}/api`;
  const as = async (user) => {
    const call = client(base);
    const res = await call("POST", "/auth/sign-in", { email: user.email, password: PASSWORD });
    assert.equal(res.status, 200, `sign-in as ${user.role}`);
    return call;
  };

  // FR-001: a wrong password and an unknown email get the same answer.
  const anon = client(base);
  const wrong = await anon("POST", "/auth/sign-in", { email: requester.email, password: "not the password" });
  const unknown = await anon("POST", "/auth/sign-in", { email: `nobody-${run}@civicconnect.test`, password: PASSWORD });
  assert.equal(wrong.status, 401);
  assert.deepEqual(unknown, wrong);
  assert.equal((await anon("GET", "/requests/mine")).status, 401);

  const req = await as(requester);
  const coord = await as(coordinator);
  const stf = await as(staff);

  // FR-005 to FR-009: the reference comes from the sequence through the keyed permutation.
  const seqBefore = (await prisma.$queryRaw`SELECT last_value, is_called FROM request_reference_seq`)[0];
  const submitted = await req("POST", "/requests", {
    title: "Pothole on Main Road",
    description: "A deep pothole in the left lane.",
    categoryId: String(category.id),
    location: "12 Main Road",
    reportedUrgency: "High",
  });
  assert.equal(submitted.status, 201);
  const { reference } = submitted.body;
  assert.match(reference, REFERENCE_PATTERN);
  const seqAfter = (await prisma.$queryRaw`SELECT last_value FROM request_reference_seq`)[0];
  assert.equal(seqAfter.last_value, seqBefore.is_called ? seqBefore.last_value + 1n : seqBefore.last_value);
  const row = await prisma.request.findUnique({ where: { reference }, include: { statusHistory: true } });
  assert.equal(row.status, "New");
  assert.deepEqual(row.statusHistory.map((h) => [h.fromStatus, h.toStatus]), [[null, "New"]]);

  // FR-007: invalid input is refused with field errors and nothing is written.
  const count = await prisma.request.count();
  const invalid = await req("POST", "/requests", { title: "", description: "x", categoryId: String(other.id) + "9", location: "", reportedUrgency: "Urgent" });
  assert.equal(invalid.status, 400);
  assert.ok(invalid.body.errors.title && invalid.body.errors.categoryId && invalid.body.errors.reportedUrgency);
  assert.equal(await prisma.request.count(), count);

  // FR-010, FR-011: the requester's list and detail.
  const mine = await req("GET", "/requests/mine");
  assert.deepEqual(mine.body.requests.map((r) => r.reference), [reference]);
  const detail = await req("GET", `/requests/${reference}`);
  assert.equal(detail.body.request.status, "New");
  assert.equal(detail.body.request.priority, undefined, "FR-021: a Requester does not see priority");

  // FR-012: another requester, and Staff outside the category, get the same 404 as a missing reference.
  const strangerCall = await as(stranger);
  const missing = await strangerCall("GET", "/requests/CC-0000-0000");
  assert.equal(missing.status, 404);
  assert.deepEqual(await strangerCall("GET", `/requests/${reference}`), missing);
  assert.deepEqual(await (await as(elsewhere))("GET", `/requests/${reference}`), missing);
  assert.equal((await strangerCall("POST", `/requests/${reference}/status`, { to: "Rejected", reason: "x" })).status, 404);

  // FR-021, FR-025: a Coordinator sets the priority; one audit entry.
  assert.equal((await coord("POST", `/requests/${reference}/priority`, { priority: "High" })).status, 200);
  assert.equal((await stf("POST", `/requests/${reference}/priority`, { priority: "Low" })).status, 403);

  // FR-015: the assignee list holds only active Staff for the category, and assigning is audited.
  const options = await coord("GET", `/requests/${reference}/assignable-staff`);
  assert.deepEqual(options.body.staff, [{ id: String(staff.id), name: staff.name }]);
  assert.equal((await stf("GET", `/requests/${reference}/assignable-staff`)).status, 403);
  assert.equal(
    (await coord("POST", `/requests/${reference}/status`, { to: "Assigned", assigneeId: String(elsewhere.id) })).status,
    422,
    "Staff not authorised for the category cannot be assigned",
  );
  const assigned = await coord("POST", `/requests/${reference}/status`, { to: "Assigned", assigneeId: String(staff.id) });
  assert.equal(assigned.status, 200);
  assert.deepEqual(assigned.body, { reference, status: "Assigned", assigneeId: String(staff.id) });

  // The conditional update: two moves from the same state, at the same time; exactly one is written.
  const [a, b] = await Promise.all([
    stf("POST", `/requests/${reference}/status`, { to: "In Progress" }),
    stf("POST", `/requests/${reference}/status`, { to: "In Progress" }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);

  // FR-017: action entries; the Requester sees only the requester-visible one (FR-011).
  assert.equal((await stf("POST", `/requests/${reference}/actions`, { body: "Crew booked for Monday.", visibility: "requester-visible" })).status, 201);
  assert.equal((await stf("POST", `/requests/${reference}/actions`, { body: "Needs the large patcher.", visibility: "internal" })).status, 201);
  assert.equal((await stf("POST", `/requests/${reference}/actions`, { body: "No choice made." })).status, 400);

  // FR-018, FR-019: resolve with a summary, then a Coordinator closes with confirmation.
  assert.equal((await stf("POST", `/requests/${reference}/status`, { to: "Resolved" })).status, 422);
  assert.equal((await stf("POST", `/requests/${reference}/status`, { to: "Resolved", resolutionSummary: "Patched and rolled." })).status, 200);
  assert.equal((await stf("POST", `/requests/${reference}/status`, { to: "Closed", confirmed: true })).status, 403);
  assert.equal((await coord("POST", `/requests/${reference}/status`, { to: "Closed", confirmed: true })).status, 200);
  assert.equal((await coord("POST", `/requests/${reference}/status`, { to: "In Progress" })).status, 409, "FR-016: not in the model");

  const final = await req("GET", `/requests/${reference}`);
  assert.equal(final.body.request.status, "Closed");
  assert.equal(final.body.request.resolutionSummary, "Patched and rolled.");
  assert.deepEqual(final.body.request.statusHistory.map((h) => h.to), ["New", "Assigned", "In Progress", "Resolved", "Closed"]);
  assert.deepEqual(final.body.request.actionEntries.map((e) => e.body), ["Crew booked for Monday."]);
  const staffView = await stf("GET", `/requests/${reference}`);
  assert.equal(staffView.body.request.actionEntries.length, 2);
  assert.equal(staffView.body.request.priority, "High");

  // FR-025: exactly one audit entry per changed field, in the database.
  const audit = await prisma.auditEntry.findMany({ where: { requestId: row.id }, orderBy: { id: "asc" } });
  assert.deepEqual(
    audit.map((e) => [e.fieldChanged, e.previousValue, e.newValue]),
    [
      ["priority", null, "High"],
      ["status", "New", "Assigned"],
      ["assigneeId", null, String(staff.id)],
      ["status", "Assigned", "In Progress"],
      ["status", "In Progress", "Resolved"],
      ["status", "Resolved", "Closed"],
    ],
  );

  // FR-013, FR-014: the queue in the database. Three more requests in the category, two of them given a
  // priority; the search narrows to this run's requests, and sorting by priority puts High, then Low,
  // then the untriaged one last, in both directions.
  const more = [];
  for (const [title, priority] of [["Queue High", "High"], ["Queue none", null], ["Queue Low", "Low"]]) {
    const made = await req("POST", "/requests", { title: `${title} ${run}`, description: "d", categoryId: String(category.id), location: "l", reportedUrgency: "Low" });
    assert.equal(made.status, 201);
    if (priority) assert.equal((await coord("POST", `/requests/${made.body.reference}/priority`, { priority })).status, 200);
    more.push(made.body.reference);
  }
  const [high, none, low] = more;
  const byPriority = await coord("GET", `/queue?q=Queue&sort=priority_desc`);
  assert.equal(byPriority.status, 200);
  const ours = (res) => res.body.requests.map((r) => r.reference).filter((r) => more.includes(r));
  assert.deepEqual(ours(byPriority), [high, low, none]);
  assert.deepEqual(ours(await coord("GET", `/queue?q=Queue&sort=priority_asc`)), [low, high, none]);
  const searched = await coord("GET", `/queue?q=${encodeURIComponent(`Queue none ${run}`)}`);
  assert.deepEqual(searched.body.requests.map((r) => r.reference), [none]);
  assert.equal(searched.body.total, 1);
  assert.deepEqual(searched.body.requests[0].assignee, null);
  assert.equal(searched.body.requests[0].category, category.name);
  assert.deepEqual(ours(await stf("GET", `/queue?q=${run}`)).sort(), [...more].sort(), "Staff see their category");
  assert.deepEqual((await (await as(elsewhere))("GET", `/queue?q=${run}`)).body.total, 0, "Staff outside it see none");
  assert.equal((await req("GET", "/queue")).status, 403);
  assert.equal((await coord("GET", "/queue?status=New&status=Closed")).status, 400);
  const closed = await coord("GET", `/queue?status=Closed&q=${encodeURIComponent("Pothole on Main Road")}`);
  assert.ok(closed.body.requests.some((r) => r.reference === reference));
  // FR-020: a rejection's reason reaches the Requester; staff also see who rejected it.
  assert.equal((await coord("POST", `/requests/${none}/status`, { to: "Rejected", reason: "Duplicate of an earlier report." })).status, 200);
  const rejected = await req("GET", `/requests/${none}`);
  assert.deepEqual(rejected.body.request.statusHistory.at(-1), { ...rejected.body.request.statusHistory.at(-1), to: "Rejected", reason: "Duplicate of an earlier report." });
  assert.equal("by" in rejected.body.request.statusHistory.at(-1), false);
  assert.equal((await coord("GET", `/requests/${none}`)).body.request.statusHistory.at(-1).by, coordinator.name);

  const staffList = await coord("GET", "/staff");
  assert.ok(staffList.body.staff.some((s) => s.id === String(staff.id) && s.name === staff.name));

  // FR-029, ADR-008: the requester's notifications come from the saved history and the visible entries:
  // accepted once, updated for the visible entry only, completed on Resolved, rejected on Rejected.
  const notes = await req("GET", "/notifications");
  assert.equal(notes.status, 200);
  const mineOnly = (ref) => notes.body.notifications.filter((n) => n.reference === ref).map((n) => n.event).sort();
  assert.deepEqual(mineOnly(reference), ["accepted", "completed", "updated"]);
  assert.deepEqual(mineOnly(none), ["rejected"]);
  assert.deepEqual((await strangerCall("GET", "/notifications")).body.notifications, []);

  // FR-022, FR-023: today's report counts this run's four requests in its category by their status now;
  // a Manager with no categories sees none of them (scope), and a Requester is refused.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  const report = await coord("GET", `/reports/summary?from=${today}&to=${today}`);
  assert.equal(report.status, 200);
  const ourRows = report.body.breakdown.filter((r) => r.category === category.name).map((r) => [r.status, r.count]);
  assert.deepEqual(ourRows, [["Closed", 1], ["New", 2], ["Rejected", 1]]);
  const managerReport = await (await as(manager))("GET", `/reports/summary?from=${today}&to=${today}`);
  assert.equal(managerReport.body.breakdown.some((r) => r.category === category.name), false);
  assert.equal((await req("GET", "/reports/summary")).status, 403);
  const overdueList = await coord("GET", "/reports/overdue");
  assert.equal(overdueList.body.targetDays, 10);
  assert.equal(overdueList.body.requests.some((r) => more.includes(r.reference)), false, "requests made today are not overdue");

  // FR-027, FR-006: a Manager adds a category, renames it, and deactivates it; it is then no longer offered.
  const mgrAdmin = await as(manager);
  const added = await mgrAdmin("POST", "/categories", { name: `TC-32 parks ${run}` });
  assert.equal(added.status, 201);
  assert.equal((await mgrAdmin("POST", "/categories", { name: `tc-32 PARKS ${run}` })).status, 400, "unique ignoring case");
  assert.equal((await mgrAdmin("PATCH", `/categories/${added.body.id}`, { name: `TC-32 green spaces ${run}` })).body.name, `TC-32 green spaces ${run}`);
  const all = await mgrAdmin("GET", "/categories?all=true");
  assert.equal(all.body.categories.find((c) => c.id === String(category.id)).requestCount, 4);
  assert.equal((await coord("GET", "/categories?all=true")).status, 403);
  assert.equal((await mgrAdmin("POST", `/categories/${added.body.id}/deactivate`)).body.active, false);
  const del = await mgrAdmin("DELETE", `/categories/${category.id}`);
  assert.equal(del.status, 409, "FR-027: a referenced category is never deleted");
  assert.match(del.body.error, /never deleted/);
  assert.equal((await coord("DELETE", `/categories/${category.id}`)).status, 403);
  assert.equal((await prisma.category.count({ where: { id: category.id } })), 1);
  assert.equal((await req("GET", "/categories")).body.categories.some((c) => c.id === added.body.id), false);

  // FR-003: a Manager creates a Staff account; its user sets a password with the setup code and signs in.
  const newEmail = `tc32-new-${run}@civicconnect.test`;
  const made = await mgrAdmin("POST", "/users", { name: `TC-32 New ${run}`, email: newEmail, role: "Staff", categoryIds: [String(category.id)] });
  assert.equal(made.status, 201);
  assert.equal((await mgrAdmin("POST", "/users", { name: "Again", email: newEmail.toUpperCase(), role: "Staff", categoryIds: [String(category.id)] })).status, 400);
  const firstPassword = `first-${randomBytes(8).toString("hex")}`;
  const anon2 = client(base);
  assert.equal((await anon2("POST", "/auth/sign-in", { email: newEmail, password: firstPassword })).status, 401, "no password before setup");
  assert.equal((await anon2("POST", "/auth/reset", { email: newEmail, code: made.body.setupCode.code, newPassword: firstPassword })).status, 204);
  const newcomer = client(base);
  assert.equal((await newcomer("POST", "/auth/sign-in", { email: newEmail, password: firstPassword })).status, 200);
  assert.equal((await newcomer("GET", `/requests/${high}`)).status, 200, "the new Staff member sees their category");
  const listed = await mgrAdmin("GET", "/users");
  assert.deepEqual(listed.body.users.find((u) => u.email === newEmail).categories, [category.name]);

  // FR-028: deactivation is refused while requests are assigned, then takes effect on the next request.
  assert.equal((await coord("POST", `/requests/${high}/status`, { to: "Assigned", assigneeId: made.body.user.id })).status, 200);
  assert.equal((await mgrAdmin("POST", `/users/${made.body.user.id}/deactivate`)).status, 409);
  assert.equal((await coord("POST", `/requests/${high}/status`, { to: "Assigned", assigneeId: String(staff.id) })).status, 200);
  assert.equal((await mgrAdmin("POST", `/users/${made.body.user.id}/deactivate`)).status, 200);
  assert.equal((await newcomer("GET", "/auth/me")).status, 401, "the deactivated account's session stops at once");
  assert.equal((await mgrAdmin("POST", `/users/${manager.id}/deactivate`)).status, 409, "not one's own account");

  // FR-028: what a deactivated account did stays visible and attributed to it. The newcomer adds an entry
  // and is then deactivated; the entry, its author's name and the audit entries for its assignment remain.
  const author = client(base);
  const second = await mgrAdmin("POST", "/users", { name: `TC-32 Author ${run}`, email: `tc32-author-${run}@civicconnect.test`, role: "Staff", categoryIds: [String(category.id)] });
  const authorPassword = `author-${randomBytes(8).toString("hex")}`;
  assert.equal((await anon("POST", "/auth/reset", { email: `tc32-author-${run}@civicconnect.test`, code: second.body.setupCode.code, newPassword: authorPassword })).status, 204);
  assert.equal((await author("POST", "/auth/sign-in", { email: `tc32-author-${run}@civicconnect.test`, password: authorPassword })).status, 200);
  assert.equal((await author("POST", `/requests/${low}/actions`, { body: "Inspected on site.", visibility: "requester-visible" })).status, 201);
  assert.equal((await mgrAdmin("POST", `/users/${second.body.user.id}/deactivate`)).status, 200);
  assert.equal((await author("GET", "/auth/me")).status, 401, "a deactivated account cannot act");
  const attributed = (await coord("GET", `/requests/${low}`)).body.request.actionEntries.find((e) => e.body === "Inspected on site.");
  assert.equal(attributed.author, `TC-32 Author ${run}`, "the entry keeps its author's name");
  assert.equal((await req("GET", `/requests/${low}`)).body.request.actionEntries.some((e) => e.body === "Inspected on site."), true);
  const deactivated = await prisma.user.findUnique({ where: { id: BigInt(second.body.user.id) } });
  assert.equal(deactivated.active, false);
  assert.equal(await prisma.actionEntry.count({ where: { authorId: deactivated.id } }), 1);

  // FR-004: a Manager issues a code; the reset sets the password and ends the earlier session.
  const mgr = await as(manager);
  assert.equal((await coord("POST", `/users/${requester.id}/reset-code`)).status, 403);
  const issued = await mgr("POST", `/users/${requester.id}/reset-code`);
  assert.equal(issued.status, 200);
  const newPassword = `new-${randomBytes(8).toString("hex")}`;
  assert.equal((await anon("POST", "/auth/reset", { email: requester.email, code: "AAAA-AAAA", newPassword })).status, 400);
  assert.equal((await anon("POST", "/auth/reset", { email: requester.email, code: issued.body.code, newPassword })).status, 204);
  assert.equal((await anon("POST", "/auth/reset", { email: requester.email, code: issued.body.code, newPassword: `${newPassword}x` })).status, 400, "a code works once");
  assert.equal((await req("GET", "/requests/mine")).status, 401, "the reset ended the earlier session");
  const again = client(base);
  assert.equal((await again("POST", "/auth/sign-in", { email: requester.email, password: newPassword })).status, 200);
  const events = await prisma.accountEvent.findMany({ where: { userId: requester.id }, orderBy: { id: "asc" } });
  assert.deepEqual(events.map((e) => e.type), ["reset-code-issued", "password-reset"]);
  const after = await prisma.user.findUnique({ where: { id: requester.id } });
  assert.equal(after.resetCodeHash, null);
  assert.equal(after.resetFailedAttempts, 0);
  assert.equal(after.sessionVersion, 1);
});
