// Playwright configuration for the end-to-end journeys (#123, TC-33 and TC-34 in the test catalogue).
//
// The journeys run against a deployed CivicConnect, staging (#122), named by E2E_BASE_URL. They use seeded
// accounts whose credentials come from the environment (see support/accounts.js), never from the
// repository. One worker: the journeys share those accounts, and each one creates its own request, so they
// do not depend on each other's data.
//
// Before anything runs, support/wait-for-host.js waits for the host's health check, so a host waking from
// idle does not fail the first journey. The setup project then signs each role in through the form once,
// with no trace, screenshot or video, since a trace records what is typed; the journeys start from the
// saved state and never type a password.

import { defineConfig, devices } from "@playwright/test";

// Without a target the run stops here with this message, rather than failing every journey on a missing
// address. CI runs the journeys only where E2E_BASE_URL is configured (see README.md).
const baseURL = process.env.E2E_BASE_URL;
if (!baseURL) throw new Error("Set E2E_BASE_URL to the CivicConnect instance to test, for example the staging URL (#122).");
const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./journeys",
  globalSetup: "./support/wait-for-host.js",
  fullyParallel: false,
  workers: 1,
  // In CI one retry, with a trace of it, tells a flaky step from a real failure: a journey that passes on
  // its retry is reported as flaky, not passed. Locally a failure is shown at once.
  retries: ci ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: ci,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: ci ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.js/, use: { ...devices["Desktop Chrome"], trace: "off", screenshot: "off", video: "off" } },
    { name: "chromium", testMatch: /.*\.spec\.js/, dependencies: ["setup"], use: { ...devices["Desktop Chrome"] } },
  ],
});
