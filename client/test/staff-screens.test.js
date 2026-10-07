// Tests for the staff screens' logic (FR-014 to FR-020). The transition list is read from the server-side
// table, so every move the status model allows has a label and inputs here, and a new move fails the test
// until it is named.

import { test } from "node:test";
import assert from "node:assert/strict";
import { TRANSITIONS } from "../../src/modules/workflow-status/transition-table.js";
import { detailControls, inputsFor, moveBody, moveFieldId, moveLabel, readyToSend } from "../src/workflow-ui.js";
import { matchRoute, navFor, routeAllowed } from "../src/router.js";
import { DEFAULT_SORT, FILTER_KEYS, filtersFromSearch, rangeProblem, searchFromFilters, SORTS } from "../src/queue-filters.js";

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

test("FR-020: of the reason inputs, only the rejection reason's hint says the requester will see it", () => {
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

test("FR-014: the queue offers each of the three named sorts in both directions, and nothing else", () => {
  const values = SORTS.map((s) => s.value).sort();
  assert.deepEqual(values, ["priority_asc", "priority_desc", "submitted_asc", "submitted_desc", "updated_asc", "updated_desc"]);
  for (const s of SORTS) {
    assert.ok(s.label && s.label !== s.value, `${s.value} has no wording`);
    assert.deepEqual(filtersFromSearch(searchFromFilters({ sort: s.value })).sort, s.value, `${s.value} survives the address`);
  }
  assert.equal(SORTS[0].value, DEFAULT_SORT, "the default is listed first");
});

const requester = { id: 1, name: "Rea", role: "Requester" };

test("FR-013: a Requester's navigation has no Queue link, and the queue screen is not offered to them", () => {
  assert.deepEqual(navFor(requester).map((i) => i.label), ["Submit a request", "My requests", "Notifications"]);
  assert.equal(routeAllowed(matchRoute("/queue"), requester), false);
  for (const role of ["Staff", "Coordinator", "Manager"]) {
    const user = { id: 9, role };
    assert.equal(navFor(user)[0].label, "Queue", role);
    assert.equal(routeAllowed(matchRoute("/queue"), user), true, role);
  }
  assert.deepEqual(navFor(null), []);
  assert.equal(routeAllowed(matchRoute("/requests"), requester), true, "routes not marked for staff are open to everyone signed in");
});

test("each move input gets an id unique across the whole transition table", () => {
  const ids = TRANSITIONS.flatMap((t) => t.guard.requires.map((field) => moveFieldId(t.from, t.to, field)));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(moveFieldId("In Progress", "On Hold", "reason"), "move-in-progress-to-on-hold-reason");
  for (const id of ids) assert.match(id, /^[a-z0-9-]+[A-Za-z]+$/, id);
});

test("Assign cannot be sent until a staff member is chosen, nor Close until it is confirmed", () => {
  const assign = { to: "Assigned", requires: ["assigneeId"] };
  assert.equal(readyToSend(assign, {}), false);
  assert.equal(readyToSend(assign, { assigneeId: "" }), false);
  assert.equal(readyToSend(assign, { assigneeId: "5" }), true);
  const close = { to: "Closed", requires: ["confirmed"] };
  assert.equal(readyToSend(close, { confirmed: false }), false);
  assert.equal(readyToSend(close, { confirmed: true }), true);
  assert.equal(readyToSend({ to: "Rejected", requires: ["reason"] }, {}), true, "text is checked by the server, which names what is missing");
  assert.equal(readyToSend({ to: "In Progress", requires: [] }, {}), true);
});

test("FR-021: the priority form and the entry form appear only when the server's capabilities allow them", () => {
  const moves = [{ to: "Assigned", requires: ["assigneeId"] }];
  assert.deepEqual(detailControls({ moves, capabilities: { setPriority: true, recordActionEntry: true } }), { moves, priority: true, entry: true });
  assert.deepEqual(detailControls({ moves, capabilities: { setPriority: false, recordActionEntry: true } }), { moves, priority: false, entry: true });
  assert.deepEqual(detailControls({ moves: [] }), { moves: [], priority: false, entry: false }, "no capabilities sent means no forms");
  assert.deepEqual(detailControls(null), { moves: [], priority: false, entry: false });
});
