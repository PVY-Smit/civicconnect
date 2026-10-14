// Steps the journeys share, written as a user would do them: by visible labels, roles and headings, so a
// journey fails when what the user sees changes, not when markup does.

import { expect } from "@playwright/test";
import { stateFile } from "./accounts.js";

export const REFERENCE = /^CC-\d{4}-\d{4}$/; // FR-008, DEC-017

// Every request a journey creates has a title starting with this, so it can be told apart from the
// performance dataset and other data on staging, and found or removed later (see README.md).
export const JOURNEY_PREFIX = "E2E journey:";

// Opens a page for a role from the state journeys/sign-in.setup.js saved, signed in without typing a
// password, and checks the session is live.
export async function startAs(browser, role) {
  const context = await browser.newContext({ storageState: stateFile(role) });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  return { context, page };
}

export async function signIn(page, account) {
  await page.goto("/sign-in");
  await page.getByLabel("Email address", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

export async function signOut(page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
}

// The staff detail screen's status, shown under the heading.
export const statusOf = (page) => page.locator(".status--large");

// Opens a request from the queue by searching for its reference (FR-013, FR-014).
export async function openFromQueue(page, reference) {
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Queue" }).click();
  await page.getByLabel("Reference or keyword", { exact: true }).fill(reference);
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByRole("link", { name: reference }).click();
  await expect(page.getByRole("heading", { level: 1, name: `Request ${reference}` })).toBeVisible();
}

// Status changes on the staff detail screen come in two kinds, and each journey step says which it makes:
// - a move with no inputs, such as Start work, is sent by its own button, with no confirm step (move);
// - a move with inputs, such as Assign, Resolve or Close, opens a form; the step fills it and presses its
//   "Confirm: <move>" button (moveWithInputs).
// Playwright's click waits for the Confirm button to be visible and enabled, so a form that renders a moment
// late, or a Confirm still disabled because an input is missing, fails the step after the timeout instead
// of skipping it.
export async function move(page, label) {
  await page.getByRole("button", { name: label, exact: true }).click();
}

export async function moveWithInputs(page, label, fill) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await fill();
  await page.getByRole("button", { name: `Confirm: ${label.toLowerCase()}`, exact: true }).click();
}

// The value beside a term in a request's summary list, such as "Reported urgency" or "Priority".
export const summaryValue = (page, term) =>
  page.locator(".summary-list dt", { hasText: new RegExp(`^${term}$`) }).locator("xpath=following-sibling::dd[1]");
