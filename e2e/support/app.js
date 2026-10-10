// Steps the journeys share, written as a user would do them: by visible labels, roles and headings, so a
// journey fails when what the user sees changes, not when markup does.

import { expect } from "@playwright/test";

export const REFERENCE = /^CC-\d{4}-\d{4}$/; // FR-008, DEC-017

export async function signIn(page, account) {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
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
  await page.getByLabel("Reference or keyword").fill(reference);
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByRole("link", { name: reference }).click();
  await expect(page.getByRole("heading", { level: 1, name: `Request ${reference}` })).toBeVisible();
}

// Makes a status change on the staff detail screen: opens the move, fills its inputs, and confirms.
export async function move(page, label, fill = async () => {}) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await fill();
  const confirm = page.getByRole("button", { name: `Confirm: ${label.toLowerCase()}` });
  if (await confirm.count()) await confirm.click();
}
