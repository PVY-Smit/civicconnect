// Playwright's global setup: before any journey starts, wait until the host's health check answers 200.
//
// A free-tier host that has gone idle takes a while to wake, and a journey that starts first fails on its
// first page for a reason that has nothing to do with the journey. The health check is GET /health, where
// the server serves it (#90). It is checked every 2 s, for up to E2E_HOST_TIMEOUT_S seconds (180 unless
// set); a host that does not answer in time stops the run with a message saying so.

export default async function waitForHost(config) {
  const base = config.projects[0].use.baseURL.replace(/\/+$/, "");
  const timeoutMs = Number(process.env.E2E_HOST_TIMEOUT_S || 180) * 1000;
  const start = Date.now();
  let checks = 0;
  let last = "no answer";
  while (true) {
    checks += 1;
    try {
      const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(10_000) });
      await res.text();
      if (res.status === 200) {
        console.log(`The host answered its health check after ${Math.round((Date.now() - start) / 1000)} s (${checks} checks).`);
        return;
      }
      last = `status ${res.status}`;
    } catch (error) {
      last = error.cause?.code ?? error.message;
    }
    if (Date.now() - start + 2000 > timeoutMs) {
      throw new Error(`${base}/health did not answer 200 within ${timeoutMs / 1000} s (${checks} checks, last: ${last}).`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}
