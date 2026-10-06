// Tests for the staff screens' logic (FR-014 to FR-020). The transition list is read from the server-side
// table, so every move the status model allows has a label and inputs here, and a new move fails the test
// until it is named.

import { test } from "node:test";
import assert from "node:assert/strict";
import { TRANSITIONS } from "../../src/modules/workflow-status/transition-table.js";
import { inputsFor, moveBody, moveLabel } from "../src/workflow-ui.js";
import { DEFAULT_SORT, FILTER_KEYS, filtersFromSearch, rangeProblem, searchFromFilters } from "../src/queue-filters.js";

test("ADR-005: every move in the status model has its own button label", () => {
  const labels = new Map();
  for (const t of TRANSITIONS) {
    const label = moveLabel(t.from, t.to);
    assert.doesNotMatch(label, /^Move to /, `${t.from} -> ${t.to} has no label`);
    labels.set(`${t.from}->${t.to}`, label);
  }
  assert.equal(labels.get("New->In Progress"), "Accept");
  assert.equal(labels.get("Assigned->Assigned"), "Reassign");
  assert.equal(labels.get("Resolved->In Progress"), "Reopen");
});

test("every input a guard requires gets a labelled form input of the right kind", () => {
  for (const t of TRANSITIONS) {
    const inputs = inputsFor({ to: t.to, requires: t.guard.requires }, t.from);
    assert.deepEqual(inputs.map((i) => i.field), [...t.guard.requires], `${t.from} -> ${t.to}`);
    for (const input of inputs) {
      assert.ok(input.label && input.label !== input.field, `${t.from} -> ${t.to}: ${input.field} has no wording`);
    }
  }
  const kinds = (from, to) => inputsFor({ to, requires: TRANSITIONS.find((t) => t.from === from && t.to === to).guard.requires }, from).map((i) => i.kind);
  assert.deepEqual(kinds("New", "Assigned"), ["staff"]);
  assert.deepEqual(kinds("Resolved", "Closed"), ["confirm"]);
  assert.deepEqual(kinds("In Progress", "Resolved"), ["text"]);
});

test("FR-020: only the rejection reason tells the user that the requester will see it", () => {
  const reasonHint = (from, to) => inputsFor({ to, requires: ["reason"] }, from)[0].hint;
  assert.match(reasonHint("New", "Rejected"), /requester will see/);
  for (const [from, to] of [["In Progress", "On Hold"], ["On Hold", "In Progress"], ["Resolved", "In Progress"]]) {
    assert.doesNotMatch(reasonHint(from, to), /requester will see/, `${from} -> ${to}`);
  }
});

test("a move sends its target and only the inputs it asked for, typed for the server", () => {
  assert.deepEqual(moveBody({ to: "Assigned", requires: ["assigneeId"] }, { assigneeId: "5", reason: "ignored" }), { to: "Assigned", assigneeId: 5 });
  assert.deepEqual(moveBody({ to: "Assigned", requires: ["assigneeId"] }, { assigneeId: "" }), { to: "Assigned", assigneeId: null });
  assert.deepEqual(moveBody({ to: "Closed", requires: ["confirmed"] }, {}), { to: "Closed", confirmed: false });
  assert.deepEqual(moveBody({ to: "Closed", requires: ["confirmed"] }, { confirmed: true }), { to: "Closed", confirmed: true });
  assert.deepEqual(moveBody({ to: "In Progress", requires: [] }, { reason: "x" }), { to: "In Progress" });
  assert.deepEqual(moveBody({ to: "Rejected", requires: ["reason"] }, {}), { to: "Rejected", reason: "" });
});

test("FR-014: filters round-trip through the address, with empty values and defaults left out", () => {
  const filters = { q: "pothole", status: "New", categoryId: "10", assigneeId: "me", from: "2026-10-01", to: "2026-10-05", sort: "submitted_asc", page: "2" };
  assert.deepEqual(filtersFromSearch(searchFromFilters(filters)), filters);
  assert.equal(searchFromFilters({ q: "  ", status: "", sort: DEFAULT_SORT, page: "1" }), "");
  assert.equal(searchFromFilters({ q: "a b&c" }), "?q=a+b%26c");
});

test("an unknown sort, a bad page and unknown parameters from the address are replaced or dropped", () => {
  const f = filtersFromSearch("?sort=DROP&page=-3&admin=1&q=x");
  assert.equal(f.sort, DEFAULT_SORT);
  assert.equal(f.page, "1");
  assert.deepEqual(Object.keys(f), [...FILTER_KEYS]);
  assert.equal(filtersFromSearch("?page=0").page, "1");
  assert.equal(filtersFromSearch("?page=12").page, "12");
});

test("a date range ending before it starts is caught before the request is sent", () => {
  assert.match(rangeProblem({ from: "2026-10-05", to: "2026-10-01" }), /on or after/);
  assert.equal(rangeProblem({ from: "2026-10-05", to: "2026-10-05" }), null);
  assert.equal(rangeProblem({ from: "2026-10-05", to: "" }), null);
});
