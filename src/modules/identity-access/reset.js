// Password reset through a Manager-issued one-time code (FR-004, NFR-004).
//
// Email is deferred (SC-D-01), so the reset agreed on #109 is Manager-assisted: a Manager issues a code for
// an account from user administration and gives it to the user, who enters it with a new password. The
// same code issued when an account is created is how its user sets their first password (FR-003, #115).
//
// The rules FR-004 sets:
// - a failed reset gets one answer, whether the account does not exist, is deactivated, has no code, or
//   the code is wrong, expired or withdrawn, and the code is checked against a dummy hash when there is no
//   usable account, so the response time does not reveal it either (the same approach as sign-in, FR-001);
// - a code works once: using it clears it, in the same write that sets the new password, and only if it
//   is still the code that was checked, so two uses at the same moment cannot both succeed;
// - a code expires after its lifetime, and issuing a new one replaces the old.
//
// Two further rules from the review of #146:
// - a code is withdrawn after RESET_MAX_ATTEMPTS wrong tries on its account, so it cannot be guessed at
//   whatever rate the server allows. Rate limiting by address is not here; it is to be recorded as debt
//   (#125), with the denial of service the limit allows (README.md);
// - a reset ends every session the account has, because a reset is what a user does when they suspect
//   someone else has their password. The store adds one to the account's session version in the same
//   write, and a session made before it is refused (session.js, http.js).
//
// The code is stored only as a hash, with the same deliberately slow function as passwords (NFR-004), so
// a copy of the database does not give working codes. hashSecret and verifySecret wrap argon2 (ADR-002).
//
// The store's writes (the persistence module, #109). Each is one conditional write, and each appends its
// account event in the same transaction. An event records who did what to which account and when, and
// never the code.
// - users.setResetCode(id, { resetCodeHash, resetCodeExpiresAt }, { event }): sets the code, its expiry
//   and a failure count of 0, replacing any earlier code.
// - users.recordResetFailure(id, { expectResetCodeHash, maxAttempts }, { eventIfWithdrawn }): only while the
//   account still holds that code hash, adds one to the failure count, and clears the code when the count
//   reaches maxAttempts. The count is added in the database (count = count + 1), so two wrong tries at once
//   both count.
// - users.completeReset(id, { expectResetCodeHash, maxAttempts, passwordHash }, { event }): only while the
//   account still holds that code hash and its failure count is below maxAttempts, sets the password hash,
//   clears the code and the failure count, and adds one to the session version. Returns the number of rows
//   written, which must be exactly 1 for success. The count is in the same condition as the hash, so a
//   right code checked while wrong tries are still being counted cannot succeed once they reach the limit,
//   even if withdrawing the code were ever a separate step.
// expectResetCodeHash is the hash string as read from the row. argon2 salts each hash, so hashing the code
// again would give a different string: the adapter compares the stored value with the one read, and never
// recomputes it.

import { randomInt } from "node:crypto";
import { permits } from "../authorisation-policy/policy.js";
import { normaliseEmail } from "./sign-in.js";

// Proposed in #111 for FR-004's "defined period", and agreed by Darius Mushi and Tristan Roets on #146: long enough for a
// Manager to pass the code on during a working day, short enough that a code written down and forgotten
// stops working. A caller can choose another lifetime up to MAX_LIFETIME_HOURS, so the first-password code
// for a new account (FR-003, #115) can last until its user is likely to sign in.
export const CODE_LIFETIME_HOURS = 24;
export const MAX_LIFETIME_HOURS = 7 * 24;

// Wrong tries on one account before its code is withdrawn. The Manager then issues a new one.
export const RESET_MAX_ATTEMPTS = 5;

// Eight characters from an alphabet without the look-alikes 0, O, 1, I and L, shown as two groups of four.
// 31^8 is about 8.5 x 10^11 codes, and each is good for one account for one day.
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;

// The new password's length (NFR-004 sets how it is stored, not its length). At least 8 characters with
// no composition rules, and at most 128 so a very long input cannot be used to make hashing slow. There is
// no check against a list of common passwords; that is to be recorded as debt (#125).
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const RESET_FAILURE = "That email, code and password could not be used. Check the code with your manager, or ask for a new one.";
export const SAME_PASSWORD = "Choose a password different from the current one.";

const FAILED = Object.freeze({ ok: false, code: "reset-failed", message: RESET_FAILURE });

// random defaults to crypto.randomInt. Tests pass their own; a caller that passes undefined gets the
// default, so the default must stay.
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
export async function issueResetCode(
  { actor, userId, lifetimeHours = CODE_LIFETIME_HOURS },
  { users, hashSecret, now = () => Date.now(), random },
) {
  // Who is asking is checked first, so a caller who may not issue codes gets the same answer whatever
  // lifetime they pass, if a route ever takes it from the request.
  if (!actor) return { ok: false, code: "not-signed-in" };
  if (!permits(actor, "manageUsers")) return { ok: false, code: "not-authorised" };
  if (!(Number.isFinite(lifetimeHours) && lifetimeHours > 0 && lifetimeHours <= MAX_LIFETIME_HOURS)) {
    throw new Error(`A code's lifetime must be more than 0 and at most ${MAX_LIFETIME_HOURS} hours.`);
  }
  const user = await users.findById(userId);
  if (!user) return { ok: false, code: "not-found" };
  if (!user.active) return { ok: false, code: "inactive", message: "A deactivated account cannot be given a reset code." };

  const code = generateCode(random);
  const at = new Date(now());
  const expiresAt = new Date(at.getTime() + lifetimeHours * 60 * 60 * 1000);
  await users.setResetCode(
    user.id,
    { resetCodeHash: await hashSecret(normaliseCode(code)), resetCodeExpiresAt: expiresAt },
    { event: { type: "reset-code-issued", actorId: actor.id, userId: user.id, at, expiresAt } },
  );
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
  const usable = Boolean(
    user && user.active && user.resetCodeHash && user.resetCodeExpiresAt && (user.resetFailedAttempts ?? 0) < RESET_MAX_ATTEMPTS,
  );
  const matches = await verifySecret(usable ? user.resetCodeHash : dummyHash, typed);
  const current = usable && new Date(user.resetCodeExpiresAt).getTime() > now();

  if (usable && current && !matches) {
    // A wrong try against a live code is counted, and the code is withdrawn at the limit. This write is
    // the one step a failure for an unknown account does not have, so such a failure answers a few
    // milliseconds sooner; next to the argon2 check every failure makes, the difference is small.
    await users.recordResetFailure(
      user.id,
      { expectResetCodeHash: user.resetCodeHash, maxAttempts: RESET_MAX_ATTEMPTS },
      { eventIfWithdrawn: { type: "reset-code-withdrawn", actorId: null, userId: user.id, at: new Date(now()) } },
    );
  }
  if (!usable || !typed || !matches || !current) return FAILED;

  // Only someone holding the right code gets this far, so this message reveals nothing new.
  if (user.passwordHash && (await verifySecret(user.passwordHash, newPassword))) {
    return { ok: false, code: "invalid", errors: { newPassword: SAME_PASSWORD } };
  }

  const written = await users.completeReset(
    user.id,
    { expectResetCodeHash: user.resetCodeHash, maxAttempts: RESET_MAX_ATTEMPTS, passwordHash: await hashSecret(newPassword) },
    { event: { type: "password-reset", actorId: user.id, userId: user.id, at: new Date(now()) } },
  );
  return written === 1 ? { ok: true } : FAILED;
}
