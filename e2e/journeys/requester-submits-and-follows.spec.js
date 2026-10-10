// TC-33: a requester submits a request and follows it (FR-001, FR-005 to FR-010).
//
// The most common journey, through the client, the server and the database together. A run creates its own
// request with a unique title, so it does not depend on data from earlier runs.

import { expect, test } from "@playwright/test";
import { accounts, category } from "../support/accounts.js";
import { REFERENCE, signIn, signOut, statusOf } from "../support/app.js";

test("TC-33: a requester submits a request, gets its reference, and finds it in their list and its detail", async ({ page }) => {
  const { requester } = accounts();
  const title = `Streetlight out, journey ${Date.now()}`;
  const description = "The light outside number 14 has been off since Monday.";
  const location = "14 Oak Street";

  // FR-001: signing in lands a requester on their own requests.
  await signIn(page, requester);
  await expect(page.getByRole("heading", { level: 1, name: "My requests" })).toBeVisible();

  // FR-007: an empty form is refused, with all five fields named at once.
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Submit a request" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Submit a request" })).toBeVisible();
  await page.getByRole("button", { name: "Submit request" }).click();
  const problems = page.getByRole("alert").filter({ hasText: "There are 5 problems" });
  await expect(problems).toBeVisible();
  await expect(problems.getByRole("listitem")).toHaveCount(5);

  // FR-005, FR-006, FR-021: a complete submission, with the category chosen from the active list.
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill(description);
  await page.getByLabel("Category").selectOption({ label: category() });
  await page.getByLabel("Location").fill(location);
  await page.getByRole("radio", { name: "Medium" }).check();
  await page.getByRole("button", { name: "Submit request" }).click();

  // FR-008, FR-009: the acknowledgement carries a reference in the agreed format.
  await expect(page.getByRole("heading", { level: 1, name: "Request submitted" })).toBeVisible();
  const reference = (await page.locator(".reference").innerText()).trim();
  expect(reference).toMatch(REFERENCE);

  // FR-011: the detail shows what was submitted, with the status New and its first history entry.
  await page.getByRole("link", { name: "View this request" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `Request ${reference}` })).toBeVisible();
  await expect(statusOf(page)).toHaveText("New");
  const details = page.locator(".summary-list");
  for (const value of [title, description, category(), location, "Medium"]) await expect(details).toContainText(value);
  await expect(page.locator(".timeline li")).toHaveText([/^New/]);

  // FR-010: the request is in the requester's list once, with its title and status.
  await page.getByRole("link", { name: "Back to my requests" }).click();
  const row = page.getByRole("row").filter({ has: page.getByRole("link", { name: reference }) });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(title);
  await expect(row).toContainText("New");

  await signOut(page);
});
