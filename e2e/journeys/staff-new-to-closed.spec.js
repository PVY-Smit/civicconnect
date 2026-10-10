// TC-34: staff take a request from New to Closed (FR-011, FR-013 to FR-021, FR-025).
//
// Three people act on one request, each in their own browser context, so each has their own session as they
// would on their own machines. The requester submits; the Coordinator finds it in the queue, sets the
// priority and assigns it; the Staff member starts work, records an internal note and a visible update, and
// resolves it; the Coordinator closes it; the requester then sees the outcome, and not the internal note.

import { expect, test } from "@playwright/test";
import { accounts, category } from "../support/accounts.js";
import { move, openFromQueue, REFERENCE, signIn, statusOf } from "../support/app.js";

test("TC-34: a request goes from New to Closed through the Coordinator and Staff, and the requester sees the outcome", async ({ browser }) => {
  const { requester, coordinator, staff } = accounts();
  const asUser = async (account) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, account);
    return page;
  };
  const stamp = Date.now();
  const internalNote = `The fitting is corroded; a replacement is ordered (${stamp}).`;
  const visibleUpdate = `A crew is booked to replace the lamp (${stamp}).`;
  const summary = `Replaced the lamp and the corroded fitting (${stamp}).`;

  // The requester submits the request.
  const req = await asUser(requester);
  await req.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Submit a request" }).click();
  await req.getByLabel("Title").fill(`Streetlight flickering, journey ${stamp}`);
  await req.getByLabel("Description").fill("The light flickers on and off all night.");
  await req.getByLabel("Category").selectOption({ label: category() });
  await req.getByLabel("Location").fill("22 Elm Road");
  await req.getByRole("radio", { name: "High" }).check();
  await req.getByRole("button", { name: "Submit request" }).click();
  await expect(req.getByRole("heading", { level: 1, name: "Request submitted" })).toBeVisible();
  const reference = (await req.locator(".reference").innerText()).trim();
  expect(reference).toMatch(REFERENCE);

  // FR-013, FR-014: the Coordinator lands on the queue and finds the request by its reference.
  const coord = await asUser(coordinator);
  await expect(coord.getByRole("heading", { level: 1, name: "Queue" })).toBeVisible();
  await openFromQueue(coord, reference);
  await expect(statusOf(coord)).toHaveText("New");

  // FR-021: the Coordinator sets the priority; the requester's urgency stays as reported.
  await coord.getByLabel("Priority").selectOption("High");
  await coord.getByRole("button", { name: "Set priority" }).click();
  await expect(coord.getByRole("status")).toHaveText("Priority set to High.");

  // FR-015: Assign waits for a staff member to be chosen; then the request is Assigned to them.
  await move(coord, "Assign", async () => {
    await expect(coord.getByRole("button", { name: "Confirm: assign" })).toBeDisabled();
    await coord.getByLabel("Assign to").selectOption({ label: staff.name });
  });
  await expect(coord.getByRole("status")).toHaveText("Assign: done. The request is now Assigned.");
  await expect(statusOf(coord)).toHaveText("Assigned");
  await expect(coord.locator(".summary-list")).toContainText(staff.name);

  // FR-016: the assignee starts work.
  const stf = await asUser(staff);
  await openFromQueue(stf, reference);
  await move(stf, "Start work");
  await expect(statusOf(stf)).toHaveText("In Progress");

  // FR-017, DEC-003: an internal note and a visible update, each with its visibility chosen.
  for (const [text, visibility] of [
    [internalNote, "Internal: staff only"],
    [visibleUpdate, "Requester can see it"],
  ]) {
    await stf.getByLabel("Entry").fill(text);
    await stf.getByRole("radio", { name: visibility }).check();
    await stf.getByRole("button", { name: "Add entry" }).click();
    await expect(stf.locator(".entries")).toContainText(text);
  }

  // FR-018: resolving needs a summary.
  await move(stf, "Resolve", () => stf.getByLabel("Resolution summary").fill(summary));
  await expect(statusOf(stf)).toHaveText("Resolved");

  // FR-019: the Coordinator closes it, and Close waits for the confirmation.
  await coord.reload();
  await expect(statusOf(coord)).toHaveText("Resolved");
  await move(coord, "Close", async () => {
    await expect(coord.getByRole("button", { name: "Confirm: close" })).toBeDisabled();
    await coord.getByLabel("I confirm the work is complete and the request can be closed").check();
  });
  await expect(statusOf(coord)).toHaveText("Closed");
  await expect(coord.getByText("There are no status changes you can make on this request now.")).toBeVisible();

  // FR-025: the history shows every step, and who made each change.
  await expect(coord.locator(".timeline li")).toHaveText([/^New/, /^Assigned.* by /, /^In Progress.* by /, /^Resolved.* by /, /^Closed.* by /]);

  // FR-011, FR-018: the requester sees the outcome and the visible update, and not the internal note.
  await req.goto(`/requests/${reference}`);
  await expect(statusOf(req)).toHaveText("Closed");
  await expect(req.locator(".summary-list")).toContainText(summary);
  await expect(req.locator(".entries")).toContainText(visibleUpdate);
  await expect(req.getByText(internalNote)).toHaveCount(0);

  for (const page of [req, coord, stf]) await page.context().close();
});
