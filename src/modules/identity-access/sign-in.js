// Sign-in (FR-001, FR-028, NFR-004).
//
// The store lookup and the password check are passed in, so this module holds the rules and not the
// storage: users.findByEmail comes from the persistence module, and verifyPassword wraps argon2
// (ADR-002, NFR-004).
//
// FR-001 requires one generic failure that does not reveal whether the identifier exists. The same
// message is returned for an unknown email, a wrong password and a deactivated account (FR-028), and
// the password check runs against a dummy hash when there is no usable account, so the response time
// does not reveal it either.

export const GENERIC_FAILURE = "The email or password is incorrect.";

export function normaliseEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export async function signIn({ email, password }, { users, verifyPassword, dummyHash }) {
  const identifier = normaliseEmail(email);
  if (!identifier || typeof password !== "string" || password.length === 0) {
    return { ok: false, code: "missing-credentials", message: "Enter your email and password." };
  }
  const user = await users.findByEmail(identifier);
  const usable = Boolean(user && user.active && user.passwordHash);
  const verified = await verifyPassword(usable ? user.passwordHash : dummyHash, password);
  if (!usable || !verified) {
    return { ok: false, code: "invalid-credentials", message: GENERIC_FAILURE };
  }
  return { ok: true, user };
}
