// TC-34: staff take a request from New to Closed (FR-011, FR-013 to FR-021, FR-025).
//
// Three people act on one request, each in their own browser context, so each has their own session as they
// would on their own machines, starting from the state the setup saved (journeys/sign-in.setup.js). The requester submits; the Coordinator finds it in the queue, sets the
// priority and assigns it; the Staff member starts work, records an internal note and a visible update, and
// resolves it; the Coordinator closes it; the requester then sees the outcome, and not the internal note.

import { expect, test } from "@playwright/test";
import { accounts, category } from "../support/accounts.js";
import { JOURNEY_PREFIX, move, moveWithInputs, openFromQueue, REFERENCE, startAs, statusOf, summaryValue } from "../support/app.js";

test("TC-34: a request goes from New to Closed through the Coordinator and Staff, and the requester sees the outcome", async ({ browser }) => {
  const { staff } = accounts();
  const contexts = [];
  const asUser = async (role) => {
    const { context, page } = await startAs(browser, role);
    contexts.push(context);
    return page;
  };
  try {
    const stamp = Date.now();
    const internalNote = `The fitting is corroded; a replacement is ordered (${stamp}).`;
    const visibleUpdate = `A crew is booked to replace the lamp (${stamp}).`;
    const summary = `Replaced the lamp and the corroded fitting (${stamp}).`;

    // The requester submits the request.
    const req = await asUser("Requester");
    await req.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Submit a request" }).click();
    await req.getByLabel("Title", { exact: true }).fill(`${JOURNEY_PREFIX} streetlight flickering (${stamp})`);
    await req.getByLabel("Description", { exact: true }).fill("The light flickers on and off all night.");
    await req.getByLabel("Category", { exact: true }).selectOption({ label: category() });
    await req.getByLabel("Location", { exact: true }).fill("22 Elm Road");
    await req.getByRole("radio", { name: "Low", exact: true }).check(); // FR-021: the requester's own view of urgency
    await req.getByRole("button", { name: "Submit request" }).click();
    await expect(req.getByRole("heading", { level: 1, name: "Request submitted" })).toBeVisible();
    const reference = (await req.locator(".reference").innerText()).trim();
    expect(reference).toMatch(REFERENCE);

    // FR-013, FR-014: the Coordinator starts on the queue and finds the request by its reference.
    const coord = await asUser("Coordinator");
    await expect(coord.getByRole("heading", { level: 1, name: "Queue" })).toBeVisible();
    await openFromQueue(coord, reference);
    await expect(statusOf(coord)).toHaveText("New");

    // FR-021: the Coordinator sets a priority different from the urgency the requester reported, and both
    // are kept: the priority is the Coordinator's, and the reported urgency is not changed by it.
    await expect(summaryValue(coord, "Reported urgency")).toHaveText("Low");
    await expect(summaryValue(coord, "Priority")).toHaveText("Not set");
    await coord.getByLabel("Priority", { exact: true }).selectOption("High");
    await coord.getByRole("button", { name: "Set priority" }).click();
    await expect(coord.getByRole("status")).toHaveText("Priority set to High.");
    await expect(summaryValue(coord, "Priority")).toHaveText("High");
    await expect(summaryValue(coord, "Reported urgency")).toHaveText("Low");

    // FR-015: Assign waits for a staff member to be chosen; then the request is Assigned to them.
    await moveWithInputs(coord, "Assign", async () => {
      await expect(coord.getByRole("button", { name: "Confirm: assign" })).toBeDisabled();
      await coord.getByLabel("Assign to", { exact: true }).selectOption({ label: staff.name });
    });
    await expect(coord.getByRole("status")).toHaveText("Assign: done. The request is now Assigned.");
    await expect(statusOf(coord)).toHaveText("Assigned");
    await expect(coord.locator(".summary-list")).toContainText(staff.name);

    // FR-016: the assignee starts work.
    const stf = await asUser("Staff");
    await openFromQueue(stf, reference);
    await move(stf, "Start work"); // no inputs: the button sends it
    await expect(statusOf(stf)).toHaveText("In Progress");

    // FR-017, DEC-003: an internal note and a visible update, each with its visibility chosen.
    for (const [text, visibility] of [
      [internalNote, "Internal: staff only"],
      [visibleUpdate, "Requester can see it"],
    ]) {
      await stf.getByLabel("Entry", { exact: true }).fill(text);
      await stf.getByRole("radio", { name: visibility, exact: true }).check();
      await stf.getByRole("button", { name: "Add entry" }).click();
      await expect(stf.locator(".entries")).toContainText(text);
    }

    // FR-018: resolving needs a summary.
    await moveWithInputs(stf, "Resolve", () => stf.getByLabel("Resolution summary", { exact: true }).fill(summary));
    await expect(statusOf(stf)).toHaveText("Resolved");

    // FR-019: the Coordinator closes it, and Close waits for the confirmation.
    await coord.reload();
    await expect(statusOf(coord)).toHaveText("Resolved");
    await moveWithInputs(coord, "Close", async () => {
      await expect(coord.getByRole("button", { name: "Confirm: close" })).toBeDisabled();
      await coord.getByLabel("I confirm the work is complete and the request can be closed", { exact: true }).check();
    });
    await expect(statusOf(coord)).toHaveText("Closed");
    await expect(coord.getByText("There are no status changes you can make on this request now.")).toBeVisible();

    // FR-011, FR-025: the status history shows every status change, in order, and who made each. It holds
    // status changes only: the priority change is an audit entry and the notes are action entries, so neither
    // adds a line here, and exactly five lines is what the requirements give for this journey.
    await expect(coord.locator(".timeline li")).toHaveText([/^New/, /^Assigned.* by /, /^In Progress.* by /, /^Resolved.* by /, /^Closed.* by /]);
    await expect(summaryValue(coord, "Reported urgency")).toHaveText("Low");
    await expect(summaryValue(coord, "Priority")).toHaveText("High");

    // FR-011, FR-018: the requester sees the outcome and the visible update, and not the internal note.
    await req.goto(`/requests/${reference}`);
    await expect(statusOf(req)).toHaveText("Closed");
    await expect(req.locator(".summary-list")).toContainText(summary);
    await expect(req.locator(".entries")).toContainText(visibleUpdate);
    await expect(req.getByText(internalNote)).toHaveCount(0);
    // FR-021: the requester sees the urgency they reported, and not the Coordinator's priority.
    await expect(summaryValue(req, "Your urgency")).toHaveText("Low");
    await expect(req.locator(".summary-list dt", { hasText: /^Priority$/ })).toHaveCount(0);
  } finally {
    for (const context of contexts) await context.close();
  }
});
