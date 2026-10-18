// TC-45: accessibility of every screen (NFR-010), for each role, against the deployed product.
//
// NFR-010 asks that every control can be reached and used by keyboard with a visible focus indicator, that
// every form control is labelled, and that body text meets contrast. axe-core checks each screen against
// WCAG 2.1 A and AA, which covers labels, names, contrast, landmarks and headings; the keyboard check tabs
// through each screen from the top and requires the skip link first and a visible focus indicator on every
// control it reaches. What a tool cannot judge, such as whether a label makes sense to a first-time user,
// is NFR-009's usability check, not this one.

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { startAs } from "../support/app.js";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const TABS = 30;

async function audit(page, screen) {
  await expect(page.locator("main h1").first()).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const found = violations.map((v) => `${screen}: ${v.id} (${v.impact}) on ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
  expect(found, found.join("\n")).toEqual([]);

  // Keyboard: the skip link is the first control on the page, and tabbing on from it reaches each control
  // with a focus indicator showing (an outline or a box shadow). The app moves focus to the heading when a
  // screen opens, for screen readers, so the walk starts at the skip link rather than at the top.
  const first = await page.evaluate(() => {
    const focusable = [...document.querySelectorAll("a[href], button, input, select, textarea, [tabindex]")].filter(
      (el) => (!el.disabled && el.tabIndex >= 0 && el.offsetParent !== null) || el.matches(".skip-link"),
    );
    return (focusable[0]?.innerText ?? "").trim();
  });
  expect(first, `${screen}: the skip link is the first control`).toBe("Skip to main content");
  await page.getByRole("link", { name: "Skip to main content" }).focus();
  const reached = [];
  for (let i = 0; i < TABS; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      const visible = (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== "none";
      return { name: `${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute("aria-label") || el.name || el.id || "").trim().slice(0, 40)}"`, visible };
    });
    if (!info) break;
    reached.push(info);
  }
  expect(reached.length, `${screen}: Tab moves through the page's controls`).toBeGreaterThan(0);
  const hidden = reached.filter((r) => !r.visible).map((r) => `${screen}: ${r.name}`);
  expect(hidden, `controls without a visible focus indicator:\n${hidden.join("\n")}`).toEqual([]);
}

async function visit(page, name) {
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name, exact: true }).click();
  await audit(page, name);
}

test("TC-45: the signed-out screens meet WCAG 2.1 AA and work by keyboard", async ({ page }) => {
  await page.goto("/sign-in");
  await audit(page, "Sign in");
  await page.goto("/reset-password");
  await audit(page, "Reset password");
});

// Each role starts from the session journeys/sign-in.setup.js saved, so no password is typed here or traced.
test("TC-45: the requester's screens meet WCAG 2.1 AA and work by keyboard", async ({ browser }) => {
  const { context, page } = await startAs(browser, "Requester");
  for (const name of ["My requests", "Submit a request", "Notifications"]) await visit(page, name);
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "My requests", exact: true }).click();
  const first = page.getByRole("table").getByRole("link").first();
  if (await first.count()) {
    await first.click();
    await audit(page, "Request detail (requester)");
  }
  await context.close();
});

test("TC-45: the staff and management screens meet WCAG 2.1 AA and work by keyboard", async ({ browser }) => {
  const { context, page } = await startAs(browser, "Coordinator");
  await visit(page, "Queue");
  const first = page.getByRole("table").getByRole("link").first();
  await first.click();
  await audit(page, "Request detail (staff)");
  await visit(page, "Reports");
  await context.close();
});

test("TC-45: the Manager's administration screens meet WCAG 2.1 AA and work by keyboard", async ({ browser }) => {
  const { context, page } = await startAs(browser, "Manager");
  for (const name of ["Users", "Categories"]) await visit(page, name);
  await context.close();
});
