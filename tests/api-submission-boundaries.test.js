// Boundary values and equivalence partitions for each submission field (FR-005 to FR-007, FR-021), sent
// through the submission endpoint as a signed-in Requester (#121).
//
// Where each limit comes from, recorded rather than invented:
// - title: at most 200 characters, the schema's VARCHAR(200) (docs/data/initial-schema.sql);
// - description and location: TEXT in the schema, and the M1 baseline sets no limit. 4000 and 300 are the
//   values DEC-017 fixes, agreed by all three members on #131. They are pinned here so that changing them
//   is a visible decision, and this file changes with any later decision;
// - reported urgency: the M1 baseline names no scale. Low, Medium and High are DEC-017's;
// - category: one of the active categories (FR-006); the list itself is data, not a limit.
// Every text field is trimmed before it is measured, and a minimum of one character means "not blank".

import { test } from "node:test";
import assert from "node:assert/strict";
import { LIMITS, URGENCY_LEVELS } from "../src/modules/request-capture/validation.js";
import { createApi, USERS, VALID_SUBMISSION } from "./support/api.js";

const PINNED = { title: { min: 1, max: 200 }, description: { min: 1, max: 4000 }, location: { min: 1, max: 300 } };
const SOURCE = {
  title: "schema VARCHAR(200)",
  description: "DEC-017, agreed on #131; not in the M1 baseline",
  location: "DEC-017, agreed on #131; not in the M1 baseline",
};

// Submits VALID_SUBMISSION with the given fields replaced (undefined removes a field). Answers the
// response and what was saved.
async function submit(fields) {
  const { api, db } = createApi();
  const body = { ...VALID_SUBMISSION, ...fields };
  for (const [k, v] of Object.entries(fields)) if (v === undefined) delete body[k];
  const res = await api.submit(USERS.requester, body);
  return { res, saved: db.state.requests };
}

async function accepted(fields, label) {
  const { res, saved } = await submit(fields);
  assert.equal(res.status, 201, `${label}: ${JSON.stringify(res.body)}`);
  assert.equal(saved.length, 1);
  return saved[0];
}

// Refused with exactly one error, on the field under test, and nothing saved (FR-007).
async function refused(field, fields, label) {
  const { res, saved } = await submit(fields);
  assert.equal(res.status, 400, `${label}: ${JSON.stringify(res.body)}`);
  assert.deepEqual(Object.keys(res.body.errors), [field], label);
  assert.match(res.body.errors[field], new RegExp(field === "categoryId" ? "Category" : field === "reportedUrgency" ? "Urgency" : field, "i"));
  assert.equal(saved.length, 0, `${label}: nothing is saved`);
}

test("the limits the suite tests are the ones the service holds; a change to them is a decision (DEC-017)", () => {
  assert.deepEqual(LIMITS, PINNED);
  assert.deepEqual([...URGENCY_LEVELS], ["Low", "Medium", "High"]);
});

for (const field of ["title", "description", "location"]) {
  const { max } = PINNED[field];
  test(`FR-007 ${field} boundaries (${SOURCE[field]}): 1, 2, ${max - 1} and ${max} accepted; blank and ${max + 1} refused`, async () => {
    for (const n of [1, 2, max - 1, max]) {
      const row = await accepted({ [field]: "a".repeat(n) }, `${field} of ${n}`);
      assert.equal(row[field].length, n);
    }
    await refused(field, { [field]: "" }, `${field} empty`);
    await refused(field, { [field]: "a".repeat(max + 1) }, `${field} of ${max + 1}`);
  });

  test(`FR-007 ${field} partitions: surrounding spaces are trimmed before measuring; blank, missing and non-text are refused`, async () => {
    const padded = await accepted({ [field]: `   ${"a".repeat(max)}   ` }, `${field} of ${max} padded`);
    assert.equal(padded[field], "a".repeat(max));
    assert.equal((await accepted({ [field]: "\t a \n" }, `${field} padded single`))[field], "a");
    for (const [label, value] of [
      ["spaces only", "    "],
      ["tabs and newlines only", "\t\n"],
      ["missing", undefined],
      ["null", null],
      ["a number", 42],
      ["an array", ["a"]],
      ["an object", { text: "a" }],
      ["true", true],
    ]) {
      await refused(field, { [field]: value }, `${field} ${label}`);
    }
  });
}

test("FR-007 title boundary in characters, as the schema counts them: an emoji or an accented letter counts once", async () => {
  assert.equal([...(await accepted({ title: "a".repeat(199) + "\u{1F600}" }, "199 letters and an emoji")).title].length, 200);
  await accepted({ title: "\u{1F600}".repeat(200) }, "200 emoji");
  await accepted({ title: "é".repeat(200) }, "200 accented letters");
  await refused("title", { title: "\u{1F600}".repeat(201) }, "201 emoji");
  const { res } = await submit({ title: "a".repeat(200) + "\u{1F600}" });
  assert.match(res.body.errors.title, /it is 201\./, "the message counts characters too");
});

test("FR-006 category partitions: an active category is accepted by number or by string, and saved as the store's id", async () => {
  assert.strictEqual((await accepted({ categoryId: 10 }, "number 10")).categoryId, 10);
  assert.strictEqual((await accepted({ categoryId: "11" }, "string 11")).categoryId, 11);
});

test("FR-006 category partitions: inactive, unknown, blank and anything but a single id are refused", async () => {
  for (const [label, value] of [
    ["the deactivated category", 12],
    ["an unknown id", 99],
    ["zero", 0],
    ["a negative id", -10],
    ["a fraction", 10.5],
    ["empty", ""],
    ["null", null],
    ["missing", undefined],
    ["an array holding an active id", ["10"]],
    ["an object", { id: 10 }],
    ["true", true],
    ["a category name", "Street lighting"],
  ]) {
    await refused("categoryId", { categoryId: value }, `category ${label}`);
  }
});

test("FR-021 urgency partitions (scale fixed by DEC-017): each level accepted exactly as named", async () => {
  for (const level of URGENCY_LEVELS) assert.equal((await accepted({ reportedUrgency: level }, level)).reportedUrgency, level);
});

test("FR-021 urgency partitions: other case, padding, other words, blank and non-text are refused", async () => {
  for (const value of ["low", "HIGH", " High", "High ", "Urgent", "Critical", "", null, undefined, 3, ["High"]]) {
    await refused("reportedUrgency", { reportedUrgency: value }, `urgency ${JSON.stringify(value)}`);
  }
});

test("FR-007: an empty body reports all five fields at once and saves nothing", async () => {
  const { api, db } = createApi();
  for (const body of [{}, null, undefined, "text", []]) {
    const res = await api.submit(USERS.requester, body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.deepEqual(Object.keys(res.body.errors).sort(), ["categoryId", "description", "location", "reportedUrgency", "title"]);
  }
  assert.equal(db.state.requests.length, 0);
});

test("FR-007: several invalid fields are all reported in one answer, each by name", async () => {
  const { res } = await submit({ title: "a".repeat(201), location: "", reportedUrgency: "Urgent" });
  assert.equal(res.status, 400);
  assert.deepEqual(Object.keys(res.body.errors).sort(), ["location", "reportedUrgency", "title"]);
});

test("FR-005, FR-021: fields the server sets are ignored when a client sends them", async () => {
  const row = await accepted(
    { status: "Closed", priority: "High", requesterId: USERS.otherRequester.id, reference: "CC-0000-0001", assigneeId: USERS.staff.id },
    "with server-set fields",
  );
  assert.equal(row.status, "New");
  assert.equal(row.priority, null);
  assert.equal(row.requesterId, USERS.requester.id);
  assert.equal(row.assigneeId, null);
  assert.notEqual(row.reference, "CC-0000-0001");
});

test("FR-009: an accepted submission answers 201 with its reference and time, and the reference is the agreed format", async () => {
  const { res } = await submit({});
  assert.equal(res.status, 201);
  assert.match(res.body.reference, /^CC-\d{4}-\d{4}$/);
  assert.ok(res.body.createdAt);
});
