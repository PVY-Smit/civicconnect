// Tests for request submission and the requester's views (FR-005 to FR-012, FR-021, DEC-004).
//
// The store is a fake that evaluates the same query conditions the policy produces, so these are
// component tests of the modules' rules. The PostgreSQL versions are under #121.

import { test } from "node:test";
import assert from "node:assert/strict";
import { CAPACITY, formatReference, isReference, REFERENCE_PATTERN } from "../src/modules/request-capture/reference.js";
import { LIMITS, URGENCY_LEVELS, validateSubmission } from "../src/modules/request-capture/validation.js";
import { submitRequest } from "../src/modules/request-capture/submit.js";
import { createSubmissionHandler } from "../src/modules/request-capture/http.js";
import { getRequestDetail, listOwnRequests } from "../src/modules/request-access/views.js";
import { createRequestAccessHandlers, NOT_FOUND } from "../src/modules/request-access/http.js";

const ACTIVE = ["10", "11"]; // category 12 exists but is inactive
const VALID = Object.freeze({
  title: "Streetlight out",
  description: "The light outside number 14 has been off for a week.",
  categoryId: "10",
  location: "14 Oak Street",
  reportedUrgency: "Medium",
});

const requester = (id = 1) => ({ id, role: "Requester", categoryIds: [] });
const staff = { id: 5, role: "Staff", categoryIds: ["10"] };

// ---- a fake store that evaluates the policy's query conditions ----

function evaluate(where, record) {
  return Object.entries(where).every(([field, cond]) => {
    if (field === "AND") return cond.every((w) => evaluate(w, record));
    if (field === "OR") return cond.some((w) => evaluate(w, record));
    if (cond && typeof cond === "object" && "in" in cond) return cond.in.map(String).includes(String(record[field]));
    return String(record[field]) === String(cond);
  });
}

function fakeStore({ ignoreEntryWhere = false } = {}) {
  let seq = 0;
  const rows = [];
  const categories = { 10: "Street lighting", 11: "Water", 12: "Retired category" };
  const created = [];
  const findOneCalls = [];
  const requests = {
    async create(data, { formatReference }) {
      seq += 1;
      const at = new Date(Date.UTC(2026, 9, 6, 9, seq));
      const row = { ...data, id: seq, reference: formatReference(seq), createdAt: at, updatedAt: at, assigneeId: null, resolutionSummary: null };
      row.statusHistory = [{ fromStatus: null, toStatus: "New", createdAt: at }];
      row.actionEntries = [];
      rows.push(row);
      created.push(data);
      return { reference: row.reference, createdAt: row.createdAt };
    },
    async findMany({ where }) {
      return rows.filter((r) => evaluate(where, r)).map((r) => ({ ...r, category: { name: categories[r.categoryId] } }));
    },
    async findOne({ where, entryWhere }) {
      findOneCalls.push(where);
      const r = rows.find((row) => evaluate(where, row));
      if (!r) return null;
      const actionEntries = ignoreEntryWhere ? r.actionEntries : r.actionEntries.filter((e) => evaluate(entryWhere, e));
      return { ...r, category: { name: categories[r.categoryId] }, actionEntries };
    },
  };
  return { requests, categories: { activeIds: async () => ACTIVE }, rows, created, findOneCalls };
}

function fakeRes() {
  const res = { statusCode: null, body: undefined };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
}

// ---- reference (FR-008, DEC-004) ----

test("FR-008: every sequence value from 1 to 999,999 gets a different reference in the agreed format", () => {
  const seen = new Set();
  for (let n = 1; n <= CAPACITY; n++) {
    const ref = formatReference(n);
    assert.ok(REFERENCE_PATTERN.test(ref), ref);
    seen.add(ref);
  }
  assert.equal(seen.size, CAPACITY);
});

test("DEC-004: consecutive requests do not get consecutive references", () => {
  const digits = (n) => Number(formatReference(n).slice(3));
  for (const n of [1, 2, 500, 999_998]) {
    assert.notEqual(Math.abs(digits(n + 1) - digits(n)), 1, `after ${n}`);
  }
});

test("a sequence value outside 1 to 999,999 is refused rather than wrapped into a reused reference", () => {
  for (const bad of [0, -1, 1_000_000, 1.5, "abc", null]) {
    assert.throws(() => formatReference(bad), RangeError, String(bad));
  }
  assert.equal(formatReference("42"), formatReference(42), "a bigint-as-string value from the database");
});

test("only the reference format reaches a lookup", () => {
  assert.equal(isReference(formatReference(7)), true);
  for (const bad of ["CC-12345", "CC-1234567", "cc-123456", "123456", "CC-12345a", " CC-123456", "1 OR 1=1", undefined]) {
    assert.equal(isReference(bad), false, String(bad));
  }
});

// ---- validation (FR-005, FR-006, FR-007, FR-021) ----

test("FR-005: a complete submission is accepted with its values trimmed and only the five supplied fields kept", () => {
  const result = validateSubmission(
    { ...VALID, title: "  Streetlight out  ", status: "Closed", priority: "High", requesterId: 99, reference: "CC-000001" },
    { activeCategoryIds: ACTIVE },
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, { ...VALID, title: "Streetlight out" });
});

test("FR-007: an empty submission reports every mandatory field at once, each by name", () => {
  const result = validateSubmission({}, { activeCategoryIds: ACTIVE });
  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ["categoryId", "description", "location", "reportedUrgency", "title"]);
  assert.match(result.errors.title, /^Title is required/);
  assert.match(result.errors.categoryId, /^Category is required/);
  assert.match(result.errors.reportedUrgency, /Low, Medium, High/);
});

test("FR-007 boundaries: each text field accepts 1 and its maximum, and refuses blank and maximum plus one", () => {
  for (const [field, { max }] of Object.entries(LIMITS)) {
    const ok = (v) => validateSubmission({ ...VALID, [field]: v }, { activeCategoryIds: ACTIVE });
    assert.equal(ok("x").ok, true, `${field} at 1`);
    assert.equal(ok("x".repeat(max)).ok, true, `${field} at ${max}`);
    assert.match(ok("x".repeat(max + 1)).errors[field], new RegExp(`at most ${max} characters; it is ${max + 1}`), `${field} at ${max + 1}`);
    assert.match(ok("   ").errors[field], /is required/, `${field} blank`);
    assert.match(ok(42).errors[field], /must be text/, `${field} a number`);
    assert.equal(ok(" ".repeat(10) + "x".repeat(max) + " ".repeat(10)).ok, true, `${field} at ${max} once trimmed`);
  }
});

test("FR-006: a category outside the active list is refused, including one that exists but is inactive", () => {
  for (const categoryId of ["12", "999", "Street lighting", "10 "]) {
    const result = validateSubmission({ ...VALID, categoryId }, { activeCategoryIds: ACTIVE });
    assert.match(result.errors.categoryId, /one of the categories in the list/, JSON.stringify(categoryId));
  }
  assert.equal(validateSubmission({ ...VALID, categoryId: 11 }, { activeCategoryIds: ACTIVE }).ok, true, "a numeric id");
});

test("FR-021: reported urgency must be one of the proposed levels, matched exactly", () => {
  for (const level of URGENCY_LEVELS) {
    assert.equal(validateSubmission({ ...VALID, reportedUrgency: level }, { activeCategoryIds: ACTIVE }).ok, true, level);
  }
  for (const bad of ["Critical", "low", "HIGH", 2]) {
    assert.match(validateSubmission({ ...VALID, reportedUrgency: bad }, { activeCategoryIds: ACTIVE }).errors.reportedUrgency, /must be one of/, String(bad));
  }
});

// ---- submission (FR-005, FR-007, FR-009, FR-021) ----

test("FR-005, FR-021: a submission is saved as New with no priority and the signed-in user as requester, whatever the body says", async () => {
  const store = fakeStore();
  const result = await submitRequest(
    { actor: requester(1), input: { ...VALID, status: "Closed", priority: "High", requesterId: 2, reference: "CC-000001" } },
    store,
  );
  assert.equal(result.ok, true);
  assert.deepEqual(store.created, [{ ...VALID, requesterId: 1, status: "New", priority: null }]);
});

test("FR-009: the acknowledgement carries the reference and the time the store recorded", async () => {
  const store = fakeStore();
  const result = await submitRequest({ actor: requester(1), input: VALID }, store);
  assert.deepEqual(result.acknowledgement, { reference: store.rows[0].reference, createdAt: store.rows[0].createdAt });
  assert.ok(isReference(result.acknowledgement.reference));
});

test("FR-007: an invalid submission is not saved", async () => {
  const store = fakeStore();
  const result = await submitRequest({ actor: requester(1), input: { ...VALID, title: "" } }, store);
  assert.equal(result.code, "invalid");
  assert.equal(store.created.length, 0);
});

test("a submission from an actor whose role may not submit is refused before validation", async () => {
  const store = fakeStore();
  const result = await submitRequest({ actor: { id: 1, role: "Visitor" }, input: VALID }, store);
  assert.deepEqual(result, { ok: false, code: "not-authorised" });
  assert.equal(store.created.length, 0);
});

// ---- the requester's views (FR-009 to FR-012) ----

async function seeded(options) {
  const store = fakeStore(options);
  const a = (await submitRequest({ actor: requester(1), input: VALID }, store)).acknowledgement.reference;
  const b = (await submitRequest({ actor: requester(2), input: { ...VALID, categoryId: "11", title: "Burst pipe" } }, store)).acknowledgement.reference;
  const mine = store.rows[0];
  mine.statusHistory.push({ fromStatus: "New", toStatus: "Assigned", createdAt: new Date(Date.UTC(2026, 9, 6, 10)) });
  mine.actionEntries.push(
    { body: "Crew booked for Thursday.", visibility: "requester-visible", createdAt: new Date(Date.UTC(2026, 9, 6, 11)) },
    { body: "Requester was rude on the phone.", visibility: "internal", createdAt: new Date(Date.UTC(2026, 9, 6, 12)) },
  );
  mine.priority = "High";
  return { store, a, b };
}

test("FR-010: the list holds every request the requester submitted, once, with the six fields, and nobody else's", async () => {
  const { store, a } = await seeded();
  await submitRequest({ actor: requester(1), input: { ...VALID, title: "Pothole" } }, store);
  const result = await listOwnRequests(requester(1), store);
  assert.equal(result.requests.length, 2);
  assert.deepEqual(result.requests.map((r) => r.title).sort(), ["Pothole", "Streetlight out"]);
  for (const item of result.requests) {
    assert.deepEqual(Object.keys(item), ["reference", "title", "category", "status", "submittedAt", "updatedAt"]);
    assert.ok(Object.values(item).every((v) => v !== undefined && v !== null), JSON.stringify(item));
  }
  assert.ok(result.requests.some((r) => r.reference === a));
  assert.ok(!result.requests.some((r) => r.title === "Burst pipe"));
});

test("FR-005, FR-011: the detail shows the submitted fields unchanged, the status history in order and only requester-visible entries", async () => {
  const { store, a } = await seeded();
  const { request } = await getRequestDetail(requester(1), a, store);
  assert.equal(request.title, VALID.title);
  assert.equal(request.description, VALID.description);
  assert.equal(request.location, VALID.location);
  assert.equal(request.reportedUrgency, VALID.reportedUrgency);
  assert.equal(request.category, "Street lighting");
  assert.deepEqual(request.statusHistory.map((h) => [h.from, h.to]), [[null, "New"], ["New", "Assigned"]]);
  assert.deepEqual(request.actionEntries.map((e) => e.body), ["Crew booked for Thursday."]);
  assert.ok(!JSON.stringify(request).includes("rude"), "the internal entry is absent from the payload itself");
  assert.equal("priority" in request, false, "the Requester sees the urgency they reported, not the priority");
});

test("FR-011: an internal entry is still withheld if the store ignores the entry condition", async () => {
  const { store, a } = await seeded({ ignoreEntryWhere: true });
  const { request } = await getRequestDetail(requester(1), a, store);
  assert.deepEqual(request.actionEntries.map((e) => e.body), ["Crew booked for Thursday."]);
});

test("staff in the request's category see internal entries, the priority and the assignee", async () => {
  const { store, a } = await seeded();
  const { request } = await getRequestDetail(staff, a, store);
  assert.equal(request.actionEntries.length, 2);
  assert.equal(request.priority, "High");
  assert.ok("assigneeId" in request);
});

test("FR-012: another requester's reference and a reference that does not exist get the same answer", async () => {
  const { store, b } = await seeded();
  const theirs = await getRequestDetail(requester(1), b, store);
  const missing = await getRequestDetail(requester(1), "CC-000000", store);
  assert.deepEqual(theirs, { ok: false, code: "not-found" });
  assert.deepEqual(missing, theirs);
});

test("FR-012: the lookup is made with the policy's scope, so another requester's request is never loaded", async () => {
  const { store, b } = await seeded();
  await getRequestDetail(requester(1), b, store);
  assert.deepEqual(store.findOneCalls.at(-1), { AND: [{ reference: b }, { requesterId: 1 }] });
});

test("a malformed reference is refused without querying the store", async () => {
  const { store } = await seeded();
  const calls = store.findOneCalls.length;
  assert.deepEqual(await getRequestDetail(requester(1), "1 OR 1=1", store), { ok: false, code: "not-found" });
  assert.equal(store.findOneCalls.length, calls);
});

// ---- HTTP boundary ----

test("POST answers 201 with the acknowledgement, or 400 with an error per failing field", async () => {
  const store = fakeStore();
  const submit = createSubmissionHandler(store);
  const created = fakeRes();
  await submit({ actor: requester(1), body: VALID }, created);
  assert.equal(created.statusCode, 201);
  assert.deepEqual(Object.keys(created.body), ["reference", "createdAt"]);

  const invalid = fakeRes();
  await submit({ actor: requester(1), body: { ...VALID, location: "", reportedUrgency: "Urgent" } }, invalid);
  assert.equal(invalid.statusCode, 400);
  assert.deepEqual(Object.keys(invalid.body.errors).sort(), ["location", "reportedUrgency"]);
});

test("FR-012: GET on another requester's reference and on a missing one returns the same 404 and body", async () => {
  const { store, b } = await seeded();
  const { detail } = createRequestAccessHandlers(store);
  const theirs = fakeRes();
  const missing = fakeRes();
  await detail({ actor: requester(1), params: { reference: b } }, theirs);
  await detail({ actor: requester(1), params: { reference: "CC-000000" } }, missing);
  assert.equal(theirs.statusCode, 404);
  assert.deepEqual(theirs.body, { error: NOT_FOUND });
  assert.deepEqual(missing.body, theirs.body);
});
