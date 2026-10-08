// Password reset through a Manager-issued one-time code (FR-004, NFR-004).
//
// Email is deferred (SC-D-01), so the reset agreed on #109 is Manager-assisted: a Manager issues a code for
// an account from user administration and gives it to the user, who enters it with a new password. The
// same code issued when an account is created is how its user sets their first password (FR-003, #115).
//
// The rules FR-004 sets:
// - a failed reset gets one answer, whether the account does not exist, is deactivated, has no code, or
//   the code is wrong or expired, and the code is checked against a dummy hash when there is no usable
//   account, so the response time does not reveal it either (the same approach as sign-in, FR-001);
// - a code works once: using it clears it, in the same write that sets the new password, and only if it
//   is still the code that was checked, so two uses at the same moment cannot both succeed;
// - a code expires after CODE_LIFETIME_HOURS, and issuing a new one replaces the old.
//
// The code is stored only as a hash, with the same deliberately slow function as passwords (NFR-004), so
// a copy of the database does not give working codes. hashSecret and verifySecret wrap argon2 (ADR-002);
// users.setResetCode and users.completeReset are the persistence module's writes for the two fields
// agreed on #109, resetCodeHash and resetCodeExpiresAt.

import { randomInt } from "node:crypto";
import { permits } from "../authorisation-policy/policy.js";
import { normaliseEmail } from "./sign-in.js";

// Proposed in #111 for FR-004's "defined period": long enough for a Manager to pass the code on during a
// working day, short enough that a code written down and forgotten stops working.
export const CODE_LIFETIME_HOURS = 24;

// Eight characters from an alphabet without the look-alikes 0, O, 1, I and L, shown as two groups of four.
// 31^8 is about 8.5 x 10^11 codes, and each is good for one account for one day.
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;

// The new password's length (NFR-004 sets how it is stored, not its length). At least 8 characters with
// no composition rules, and at most 128 so a very long input cannot be used to make hashing slow.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const RESET_FAILURE = "That email, code and password could not be used. Check the code with your manager, or ask for a new one.";

export function generateCode(random = randomInt) {
  let raw = "";
  for (let i = 0; i < CODE_LENGTH; i++) raw += CODE_ALPHABET[random(CODE_ALPHABET.length)];
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

// What the user typed, in the form the code was hashed in: upper case, without spaces or the hyphen.
export function normaliseCode(code) {
  return typeof code === "string" ? code.toUpperCase().replace(/[\s-]/g, "") : "";
}

export function passwordProblem(password) {
  if (typeof password !== "string" || password.length === 0) return "Enter a new password.";
  if ([...password].length < PASSWORD_MIN) return `The new password must be at least ${PASSWORD_MIN} characters.`;
  if ([...password].length > PASSWORD_MAX) return `The new password must be at most ${PASSWORD_MAX} characters.`;
  return null;
}

// A Manager issues a code for an account (FR-004), or #115 issues one when it creates the account (FR-003).
export async function issueResetCode({ actor, userId }, { users, hashSecret, now = () => Date.now(), random }) {
  if (!actor) return { ok: false, code: "not-signed-in" };
  if (!permits(actor, "manageUsers")) return { ok: false, code: "not-authorised" };
  const user = await users.findById(userId);
  if (!user) return { ok: false, code: "not-found" };
  if (!user.active) return { ok: false, code: "inactive", message: "A deactivated account cannot be given a reset code." };

  const code = generateCode(random);
  const expiresAt = new Date(now() + CODE_LIFETIME_HOURS * 60 * 60 * 1000);
  await users.setResetCode(user.id, { resetCodeHash: await hashSecret(normaliseCode(code)), resetCodeExpiresAt: expiresAt });
  return { ok: true, code, expiresAt };
}

// The user sets a new password with the code (FR-004).
export async function resetPassword({ email, code, newPassword }, { users, hashSecret, verifySecret, dummyHash, now = () => Date.now() }) {
  // The password is checked first, before any lookup, so its message reveals nothing about the account.
  const problem = passwordProblem(newPassword);
  if (problem) return { ok: false, code: "invalid", errors: { newPassword: problem } };

  const identifier = normaliseEmail(email);
  const typed = normaliseCode(code);
  const user = identifier ? await users.findByEmail(identifier) : null;
  const usable = Boolean(user && user.active && user.resetCodeHash && user.resetCodeExpiresAt);
  const matches = await verifySecret(usable ? user.resetCodeHash : dummyHash, typed);
  const current = usable && new Date(user.resetCodeExpiresAt).getTime() > now();
  if (!usable || !typed || !matches || !current) return { ok: false, code: "reset-failed", message: RESET_FAILURE };

  const updated = await users.completeReset(user.id, { expectResetCodeHash: user.resetCodeHash, passwordHash: await hashSecret(newPassword) });
  if (!updated) return { ok: false, code: "reset-failed", message: RESET_FAILURE };
  return { ok: true };
}
