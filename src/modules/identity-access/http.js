// The identity and access module's HTTP boundary: sign-in, sign-out, the authentication middleware
// and the permission check every protected route uses (FR-001, FR-002, NFR-005, ADR-006).
//
// The handlers take Express-style (req, res, next) arguments but do not import Express, so they are
// tested with plain objects and the server wires them in. Authorisation decisions stay in the policy
// module (ADR-001 rule 2): requirePermission only asks it.

import { FUNCTIONS, permits } from "../authorisation-policy/policy.js";
import { signIn } from "./sign-in.js";
import { clearedCookie, issueToken, readToken, sessionCookie, tokenFromCookieHeader } from "./session.js";

export const NOT_SIGNED_IN = "Sign in to continue.";
export const NOT_PERMITTED = "You are not authorised to do this.";

// The actor every later check is made against. Only what the policy needs, read fresh from the store.
const toActor = (user) => ({ id: user.id, role: user.role, categoryIds: user.categoryIds ?? [] });

// What the client is told about the signed-in user. permissions lists the policy functions this user may
// perform, so the client decides which links and screens to offer from the policy itself and never maps
// role names to screens on its own (ADR-006). The server still checks every call.
const profile = (user) => ({
  id: user.id,
  name: user.name,
  role: user.role,
  permissions: Object.keys(FUNCTIONS).filter((fn) => permits(toActor(user), fn)),
});

export function createIdentityAccess({ users, verifyPassword, dummyHash, secret, secure, now = () => Date.now() }) {
  async function signInHandler(req, res) {
    const result = await signIn(req.body ?? {}, { users, verifyPassword, dummyHash });
    if (!result.ok) {
      const status = result.code === "missing-credentials" ? 400 : 401;
      return res.status(status).json({ error: result.message });
    }
    const token = issueToken(result.user.id, { secret, now: now() });
    res.setHeader("Set-Cookie", sessionCookie(token, { secure }));
    return res.status(200).json({ user: profile(result.user) });
  }

  function signOutHandler(req, res) {
    res.setHeader("Set-Cookie", clearedCookie({ secure }));
    return res.status(204).end();
  }

  // FR-001: a protected route answers 401 with no data unless the session is valid and its user is
  // still active. A deactivated user's session stops working on their next request (FR-028).
  async function authenticate(req, res, next) {
    const userId = readToken(tokenFromCookieHeader(req.headers?.cookie), { secret, now: now() });
    const user = userId ? await users.findById(userId) : null;
    if (!user || !user.active) {
      return res.status(401).json({ error: NOT_SIGNED_IN });
    }
    req.actor = toActor(user);
    return next();
  }

  // FR-002, NFR-005: every protected function is checked on the server, whatever the client shows.
  function requirePermission(fn) {
    return function checkPermission(req, res, next) {
      if (!req.actor) return res.status(401).json({ error: NOT_SIGNED_IN });
      if (!permits(req.actor, fn)) return res.status(403).json({ error: NOT_PERMITTED });
      return next();
    };
  }

  async function currentUser(req, res) {
    const user = await users.findById(req.actor.id);
    return res.status(200).json({ user: profile(user) });
  }

  return { signIn: signInHandler, signOut: signOutHandler, authenticate, requirePermission, currentUser };
}
