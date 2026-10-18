// Limits on failed sign-ins and resets (FR-001, FR-004, NFR-004; the gap s36 records).
//
// The argon2 check makes each guess slow, and a reset code is withdrawn after five wrong tries on its
// account (reset.js), but without a limit by address one client could try passwords against every account,
// or codes against every account, as fast as the server answers. This counts the failed answers (any 4xx
// other than 429) for a key in a fixed window, and once the key reaches its limit answers 429 with
// Retry-After until the window ends, without running the handler. A successful answer does not count, so
// an honest user who signs in is never held back by their own earlier typo.
//
// Two keys are used: the address and the email together, so one account cannot be guessed at from one
// place, and the address alone with a higher limit, so one place cannot spread its guesses over many
// accounts. The counts are held in this process's memory, which suits the single instance the deployment
// runs (RSK-26); a second instance would need a shared store.

export const TOO_MANY = "Too many failed attempts. Wait a few minutes and try again.";

export function createFailureLimiter({ windowMs, limits, now = () => Date.now() }) {
  const counts = new Map(); // key -> { count, resetAt }

  function current(key) {
    const entry = counts.get(key);
    if (!entry || entry.resetAt <= now()) return null;
    return entry;
  }

  function sweep() {
    for (const [key, entry] of counts) if (entry.resetAt <= now()) counts.delete(key);
  }

  return function limitFailures(req, res, next) {
    if (counts.size > 10_000) sweep();
    const keys = limits.map(({ key, max }) => ({ id: key(req), max })).filter((k) => k.id);
    const blocked = keys.map((k) => ({ ...k, entry: current(k.id) })).find((k) => k.entry && k.entry.count >= k.max);
    if (blocked) {
      res.setHeader("Retry-After", String(Math.ceil((blocked.entry.resetAt - now()) / 1000)));
      return res.status(429).json({ error: TOO_MANY });
    }
    res.on("finish", () => {
      if (res.statusCode < 400 || res.statusCode >= 500 || res.statusCode === 429) return;
      for (const k of keys) {
        const entry = current(k.id) ?? { count: 0, resetAt: now() + windowMs };
        entry.count += 1;
        counts.set(k.id, entry);
      }
    });
    return next();
  };
}

const address = (req) => req.ip ?? req.socket?.remoteAddress ?? "unknown";
const email = (req) => (typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "");

// Ten failures per account from one address, and thirty from one address in all, per fifteen minutes.
export const SIGN_IN_LIMITS = Object.freeze({
  windowMs: 15 * 60 * 1000,
  limits: [
    { key: (req) => `account:${address(req)}:${email(req)}`, max: 10 },
    { key: (req) => `address:${address(req)}`, max: 30 },
  ],
});
