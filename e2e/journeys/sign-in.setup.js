// FR-001: each seeded user signs in through the form once, before the journeys, and lands on their start
// screen. The signed-in state is saved per role (support/accounts.js, stateFile) and each journey starts
// from it, so the journeys never type a password.
//
// This setup runs with no trace, screenshot or video (playwright.config.js), because a trace records every
// value typed into the form. The journeys' traces hold no password, though their requests still carry the
// session cookie, valid for one working day: see "Credentials and what a run keeps" in README.md.

import { expect, test as setup } from "@playwright/test";
import { accounts, stateFile } from "../support/accounts.js";
import { signIn } from "../support/app.js";

// Set here as well as in the config, so a run with --trace on, which overrides the config, still records
// nothing of these steps.
setup.use({ trace: "off", screenshot: "off", video: "off" });

// Where each role lands after signing in.
const START = { Requester: "My requests", Coordinator: "Queue", Staff: "Queue" };

// The accounts are read inside each step, so listing the journeys (--list) needs no credentials.
for (const [key, role] of [["requester", "Requester"], ["coordinator", "Coordinator"], ["staff", "Staff"]]) {
  setup(`FR-001: the ${role} signs in through the form and lands on ${START[role]}`, async ({ page }) => {
    await signIn(page, accounts()[key]);
    await expect(page.getByRole("heading", { level: 1, name: START[role] })).toBeVisible();
    await page.context().storageState({ path: stateFile(role) });
  });
}
