// Post-deployment verification for a running CivicConnect (#122). Run against the deployed address after
// every deployment; it changes nothing and needs no account.
//
//   node tools/smoke-check.mjs https://localhost:8443 v1.0.0 [http://localhost:8080]
//
// It checks that the server answers its health check naming the expected release (so the evidence names
// what was deployed), that a protected route refuses a call without a session (FR-001), that a failed
// sign-in gets the generic answer (FR-001), that an unknown /api route answers 404 in JSON, and that the
// built client is served with its own page for any other path. Over HTTPS it also checks HSTS, and given a
// plain HTTP address it checks that address redirects to HTTPS (NFR-006). It exits 1 on the first failure.
// A self-signed certificate is trusted with NODE_EXTRA_CA_CERTS=<the certificate file>, never by turning
// verification off.

const [base, expectedRelease, plainUrl] = process.argv.slice(2);
if (!base || !expectedRelease) {
  console.error("Usage: node tools/smoke-check.mjs <base URL> <expected release>");
  process.exit(2);
}

const checks = [
  ["health answers ok with the deployed release", async () => {
    const res = await fetch(`${base}/health`);
    const body = await res.json();
    return res.status === 200 && body.status === "ok" && body.release === expectedRelease ? null : `${res.status} ${JSON.stringify(body)}`;
  }],
  ["a protected route refuses a call without a session", async () => {
    const res = await fetch(`${base}/api/requests/mine`);
    return res.status === 401 ? null : `answered ${res.status}`;
  }],
  ["a failed sign-in gets the one generic answer", async () => {
    const res = await fetch(`${base}/api/auth/sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "smoke-check@invalid.test", password: "not a password" }),
    });
    const body = await res.json();
    return res.status === 401 && body.error === "The email or password is incorrect." ? null : `${res.status} ${JSON.stringify(body)}`;
  }],
  ["an unknown API route answers 404 in JSON", async () => {
    const res = await fetch(`${base}/api/no-such-route`);
    return res.status === 404 && (res.headers.get("content-type") ?? "").includes("application/json") ? null : `answered ${res.status}`;
  }],
  ["the client is served for a page address", async () => {
    const res = await fetch(`${base}/requests`);
    const text = await res.text();
    return res.status === 200 && text.includes('<div id="root">') ? null : `answered ${res.status}`;
  }],
];

if (base.startsWith("https:")) {
  checks.push(["HTTPS answers carry HSTS", async () => {
    const res = await fetch(`${base}/health`);
    return (res.headers.get("strict-transport-security") ?? "").includes("max-age=") ? null : "no Strict-Transport-Security header";
  }]);
}
if (plainUrl) {
  checks.push(["plain HTTP redirects permanently to HTTPS", async () => {
    const res = await fetch(`${plainUrl}/requests`, { redirect: "manual" });
    const location = res.headers.get("location") ?? "";
    return res.status === 301 && location.startsWith("https://") && location.endsWith("/requests") ? null : `answered ${res.status} to ${location}`;
  }]);
}

let failed = false;
for (const [name, check] of checks) {
  let problem;
  try {
    problem = await check();
  } catch (error) {
    problem = error.message;
  }
  console.log(`${problem ? "FAIL" : "pass"}  ${name}${problem ? `: ${problem}` : ""}`);
  if (problem) {
    failed = true;
    break;
  }
}
console.log(failed ? "Smoke check failed." : `Smoke check passed against ${base}, release ${expectedRelease}, at ${new Date().toISOString()}.`);
process.exit(failed ? 1 : 0);
