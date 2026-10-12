// Equivalence partitions for the text and ids a user sends, through the endpoints (#121). The services'
// own tests (#131, #132) check these rules one function at a time; this suite checks that each endpoint
// applies them, answers 400 with the field's error, and writes nothing.
//
// The rules come from the shared text rules (src/shared/text.js) and DEC-017: lengths counted in
// characters as PostgreSQL counts them, no NUL or other control characters (PostgreSQL refuses NUL after
// validation would have passed), line breaks and tabs kept only where a field holds more than one line,
// and an id accepted only as a single string or number.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createApi, USERS, VALID_SUBMISSION } from "./support/api.js";

const CONTROL = { NUL: "\u0000", BEL: "\u0007", ESC: "\u001B", DEL: "\u007F" };
const EMOJI = "\u{1F600}";

// ---- submission ----

test("FR-007: a control character in any text field is refused with that field's error, and nothing is saved", async () => {
  for (const field of ["title", "description", "location"]) {
    for (const [name, ch] of Object.entries(CONTROL)) {
      const { api, db } = createApi();
      const res = await api.submit(USERS.requester, { ...VALID_SUBMISSION, [field]: `Street${ch}light` });
      assert.equal(res.status, 400, `${field} with ${name}`);
      assert.deepEqual(Object.keys(res.body.errors), [field], `${field} with ${name}`);
      assert.match(res.body.errors[field], /control characters/);
      assert.equal(db.state.requests.length, 0, `${field} with ${name}: nothing saved`);
    }
  }
});

test("FR-007: the description keeps line breaks and tabs; the title and location are one line", async () => {
  const ok = createApi();
  const res = await ok.api.submit(USERS.requester, { ...VALID_SUBMISSION, description: "First line.\nSecond line.\r\n\tIndented." });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(ok.db.state.requests[0].description, "First line.\nSecond line.\r\n\tIndented.");
  for (const [field, value] of [["title", "Street\nlight"], ["location", "14\tOak Street"]]) {
    const { api, db } = createApi();
    const refused = await api.submit(USERS.requester, { ...VALID_SUBMISSION, [field]: value });
    assert.equal(refused.status, 400, field);
    assert.match(refused.body.errors[field], /must be one line/);
    assert.equal(db.state.requests.length, 0);
  }
});

// ---- the workflow's inputs ----

test("FR-015: the assignee id is accepted as one number or string, saved as the store's id, and refused in any other form", async () => {
  for (const sent of [USERS.staff.id, String(USERS.staff.id)]) {
    const { api, seed, find, db } = createApi();
    const { reference } = seed({ status: "New" });
    const res = await api.move(USERS.coordinator, reference, "Assigned", { assigneeId: sent });
    assert.equal(res.status, 200, `${JSON.stringify(sent)}: ${JSON.stringify(res.body)}`);
    assert.equal(find(reference).assigneeId, USERS.staff.id, "the store's own id, whatever form was sent");
    assert.equal(db.state.audit.find((a) => a.fieldChanged === "assigneeId").newValue, USERS.staff.id);
  }
  for (const sent of [[USERS.staff.id], { id: USERS.staff.id }, true]) {
    const { api, seed, find, db } = createApi();
    const { reference } = seed({ status: "New" });
    const res = await api.move(USERS.coordinator, reference, "Assigned", { assigneeId: sent });
    assert.equal(res.status, 400, JSON.stringify(sent));
    assert.ok(res.body.errors.assigneeId, JSON.stringify(sent));
    assert.equal(find(reference).status, "New");
    assert.equal(db.state.audit.length, 0, `${JSON.stringify(sent)}: nothing written`);
  }
});

test("FR-018, FR-020: a reason or resolution summary is at most 4,000 characters, with no control characters", async () => {
  const cases = [
    ["New", USERS.coordinator, "Rejected", "reason"],
    ["In Progress", USERS.staff, "Resolved", "resolutionSummary"],
  ];
  for (const [from, who, to, field] of cases) {
    for (const [label, value, status] of [
      ["4,000 emoji", EMOJI.repeat(4000), 200],
      ["4,001 emoji", EMOJI.repeat(4001), 400],
      ["NUL", `Dup${CONTROL.NUL}licate`, 400],
      ["line breaks", "First.\nSecond.", 200],
    ]) {
      const { api, seed, find, db } = createApi();
      const { reference } = seed({ status: from, assigneeId: from === "In Progress" ? USERS.staff.id : null });
      const res = await api.move(who, reference, to, { [field]: value });
      assert.equal(res.status, status, `${to}, ${field}, ${label}: ${JSON.stringify(res.body)}`);
      if (status === 400) {
        assert.ok(res.body.errors[field], `${to}, ${field}, ${label}`);
        assert.equal(find(reference).status, from, `${to}, ${label}: not moved`);
        assert.equal(db.state.audit.length, 0, `${to}, ${label}: nothing written`);
      } else {
        assert.equal(find(reference).status, to);
      }
    }
  }
});

test("FR-017: an action entry is at most 4,000 characters, with no control characters, and line breaks are kept", async () => {
  for (const [label, body, status] of [
    ["4,000 emoji", EMOJI.repeat(4000), 201],
    ["4,001 emoji", EMOJI.repeat(4001), 400],
    ["NUL", `Called${CONTROL.NUL}back`, 400],
    ["ESC", `Called${CONTROL.ESC}back`, 400],
    ["line breaks and a tab", "Called back.\nNo answer.\n\tTry Friday.", 201],
  ]) {
    const { api, seed, find } = createApi();
    const { reference } = seed({ status: "In Progress", assigneeId: USERS.staff.id });
    const before = find(reference).actionEntries.length;
    const res = await api.entry(USERS.staff, reference, body, "internal");
    assert.equal(res.status, status, `${label}: ${JSON.stringify(res.body)}`);
    assert.equal(find(reference).actionEntries.length, before + (status === 201 ? 1 : 0), `${label}: entries saved`);
    if (status === 400) assert.ok(res.body.errors.body, label);
  }
});

test("FR-012: a malformed reference gets the same 404 as a missing one from every endpoint, and nothing is written", async () => {
  const { api, seed, db } = createApi();
  seed({ status: "New" });
  const missing = await api.detail(USERS.coordinator, "CC-0000-0000");
  for (const reference of ["CC-000001", "1 OR 1=1", "cc-1234-5678"]) {
    for (const [name, call] of [
      ["detail", () => api.detail(USERS.coordinator, reference)],
      ["status", () => api.move(USERS.coordinator, reference, "Assigned", { assigneeId: USERS.staff.id })],
      ["priority", () => api.priority(USERS.coordinator, reference, "High")],
      ["entry", () => api.entry(USERS.coordinator, reference, "A note.", "internal")],
    ]) {
      const res = await call();
      assert.deepEqual([res.status, res.body], [404, missing.body], `${name} with ${reference}`);
    }
  }
  assert.equal(db.state.audit.length, 0);
});
