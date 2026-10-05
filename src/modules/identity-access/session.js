// Signed session tokens for the identity and access module (FR-001, ADR-001).
//
// The token carries only the user's id and its lifetime. Role, category scope and the active flag are
// read from the store on every request, so a deactivation or a role change takes effect at once
// (FR-028) instead of when the token expires. The token is signed with HMAC-SHA256 under a secret
// from the environment, so a client cannot forge or alter one.
//
// There is no server-side session table in the ADR-007 model. Signing out clears the cookie; a token
// copied before sign-out stays valid until it expires, which is why the lifetime is short.

import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "cc_session";
export const DEFAULT_LIFETIME_SECONDS = 8 * 60 * 60; // one working day
const MIN_SECRET_LENGTH = 32;

const b64url = (buf) => Buffer.from(buf).toString("base64url");

function assertSecret(secret) {
  if (typeof secret !== "string" || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`The session secret must be at least ${MIN_SECRET_LENGTH} characters.`);
  }
}

function sign(body, secret) {
  return createHmac("sha256", secret).update(body).digest();
}

export function issueToken(userId, { secret, now = Date.now(), lifetimeSeconds = DEFAULT_LIFETIME_SECONDS }) {
  assertSecret(secret);
  const iat = Math.floor(now / 1000);
  const body = b64url(JSON.stringify({ sub: String(userId), iat, exp: iat + lifetimeSeconds }));
  return `${body}.${b64url(sign(body, secret))}`;
}

// Returns the user id, or null for anything that is not a valid, unexpired token from this server.
export function readToken(token, { secret, now = Date.now() }) {
  assertSecret(secret);
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, mac] = parts;
  const expected = sign(body, secret);
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let claims;
  try {
    claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof claims?.sub !== "string" || !Number.isInteger(claims.exp)) return null;
  if (Math.floor(now / 1000) >= claims.exp) return null;
  return claims.sub;
}

// HttpOnly keeps the token away from page scripts; SameSite=Lax stops it being sent on cross-site form
// posts; Secure is set wherever the service runs over HTTPS (NFR-006).
export function sessionCookie(token, { secure, lifetimeSeconds = DEFAULT_LIFETIME_SECONDS }) {
  return [`${COOKIE_NAME}=${token}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${lifetimeSeconds}`]
    .concat(secure ? ["Secure"] : [])
    .join("; ");
}

export function clearedCookie({ secure }) {
  return [`${COOKIE_NAME}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"].concat(secure ? ["Secure"] : []).join("; ");
}

export function tokenFromCookieHeader(header) {
  if (typeof header !== "string") return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) return rest.join("=") || null;
  }
  return null;
}
