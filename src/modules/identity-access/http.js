// The identity and access module's HTTP boundary: sign-in, sign-out, the authentication middleware,
// the permission check every protected route uses (FR-001, FR-002, NFR-005, ADR-006), and the
// Manager-assisted password reset (FR-004).
//
// The handlers take Express-style (req, res, next) arguments but do not import Express, so they are
// tested with plain objects and the server wires them in. Authorisation decisions stay in the policy
// module (ADR-001 rule 2): requirePermission only asks it.

import { FUNCTIONS, permits } from "../authorisation-policy/policy.js";
import { issueResetCode, resetPassword } from "./reset.js";
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

// hashPassword and verifyPassword wrap argon2 (ADR-002, NFR-004); the reset codes are hashed the same way.
export function createIdentityAccess({ users, verifyPassword, hashPassword, dummyHash, secret, secure, now = () => Date.now(), random }) {
  const resetDeps = { users, hashSecret: hashPassword, verifySecret: verifyPassword, dummyHash, now, random };

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

  // FR-004: POST /api/users/:id/reset-code, behind authenticate and requirePermission("manageUsers").
  // The code is in the answer once; only its hash is stored.
  async function issueResetCodeHandler(req, res) {
    const result = await issueResetCode({ actor: req.actor, userId: req.params?.id }, resetDeps);
    if (result.ok) return res.status(200).json({ code: result.code, expiresAt: result.expiresAt });
    if (result.code === "not-signed-in") return res.status(401).json({ error: NOT_SIGNED_IN });
    if (result.code === "not-authorised") return res.status(403).json({ error: NOT_PERMITTED });
    if (result.code === "not-found") return res.status(404).json({ error: "No user with that id was found." });
    return res.status(409).json({ error: result.message });
  }

  // FR-004: POST /api/auth/reset, public. 204 when the password is set. A password that breaks the length
  // rule gets its own message, checked before any lookup; every other failure gets the one generic answer.
  async function resetPasswordHandler(req, res) {
    const { email, code, newPassword } = req.body ?? {};
    const result = await resetPassword({ email, code, newPassword }, resetDeps);
    if (result.ok) return res.status(204).end();
    if (result.errors) return res.status(400).json({ errors: result.errors });
    return res.status(400).json({ error: result.message });
  }

  return {
    signIn: signInHandler,
    signOut: signOutHandler,
    authenticate,
    requirePermission,
    currentUser,
    issueResetCode: issueResetCodeHandler,
    resetPassword: resetPasswordHandler,
  };
}
