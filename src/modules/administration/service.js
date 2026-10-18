// User and category administration (FR-003, FR-006, FR-027, FR-028), for the administration module
// (ADR-001). Managers only, through the policy: manageUsers for accounts, maintainCategories for the list.
//
// FR-003: a Manager creates an account with a role and, for Staff and Managers, the categories it covers.
// The account has no password. Its user sets one with a setup code, issued the same way as a reset code
// (reset.js) and shown to the Manager once, so no password ever passes through the Manager.
//
// FR-028: deactivating an account stops its next request (http.js reads active on every call) and keeps
// everything it did. It is refused while the account still has open requests assigned, so no request is
// left with an assignee who can no longer act on it, and a Manager cannot deactivate their own account.
//
// FR-027: a category is added, renamed or deactivated, never deleted, because requests keep the category
// they were submitted under. A deactivated category is no longer offered at submission (FR-006). Names
// are unique ignoring case, so "Roads" and "roads" cannot both exist.
//
// The store's operations are the persistence module's: users.listAll, users.create, users.deactivate,
// users.countOpenAssigned, categories.listAll, categories.findByName, categories.create, categories.rename
// and categories.deactivate. Each write that records an account change appends its account event in the
// same transaction, as the reset does.

import { permits, ROLES } from "../authorisation-policy/policy.js";
import { normaliseEmail } from "../identity-access/sign-in.js";
import { issueResetCode, MAX_LIFETIME_HOURS } from "../identity-access/reset.js";
import { characters, hasControlCharacter } from "../../shared/text.js";

export const NAME_MAX = 200;
export const EMAIL_MAX = 320;
export const SETUP_CODE_HOURS = MAX_LIFETIME_HOURS; // a week, so the new user has time to sign in
// Roles whose request scope is by category (ADR-006): they are given categories when created.
export const CATEGORY_ROLES = Object.freeze(["Staff", "Manager"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NOT_SIGNED_IN = Object.freeze({ ok: false, code: "not-signed-in" });
const NOT_AUTHORISED = Object.freeze({ ok: false, code: "not-authorised" });

function refuse(actor, fn) {
  if (!actor) return NOT_SIGNED_IN;
  if (!permits(actor, fn)) return NOT_AUTHORISED;
  return null;
}

function nameProblem(label, value) {
  if (typeof value !== "string" || value.trim() === "") return `${label} is required.`;
  if (hasControlCharacter(value.trim(), { multiline: false })) return `${label} cannot contain control characters.`;
  if (characters(value.trim()) > NAME_MAX) return `${label} must be at most ${NAME_MAX} characters.`;
  return null;
}

// ---- users ----

export async function listUsers({ actor }, { users }) {
  const refused = refuse(actor, "manageUsers");
  if (refused) return refused;
  const rows = await users.listAll();
  return {
    ok: true,
    users: rows.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, categories: u.categoryNames })),
  };
}

export async function createUser({ actor, input }, deps) {
  const refused = refuse(actor, "manageUsers");
  if (refused) return refused;
  const { users, categories } = deps;
  const body = input ?? {};
  const errors = {};

  const nameIssue = nameProblem("Full name", body.name);
  if (nameIssue) errors.name = nameIssue;
  const email = normaliseEmail(body.email);
  if (!email) errors.email = "Email address is required.";
  else if (email.length > EMAIL_MAX || !EMAIL_RE.test(email)) errors.email = "Enter an email address like name@example.org.";
  if (!ROLES.includes(body.role)) errors.role = "Choose one role.";

  let categoryIds = [];
  if (CATEGORY_ROLES.includes(body.role)) {
    const given = Array.isArray(body.categoryIds) ? body.categoryIds.map(String) : [];
    const active = new Set((await categories.activeIds()).map(String));
    if (given.length === 0 && body.role === "Staff") errors.categoryIds = "Choose at least one category for a Staff member.";
    else if (given.some((id) => !active.has(id))) errors.categoryIds = "Choose categories from the list of active categories.";
    categoryIds = [...new Set(given)];
  }
  if (!errors.email && (await users.findByEmail(email))) errors.email = "An account with that email address already exists.";
  if (Object.keys(errors).length > 0) return { ok: false, code: "invalid", errors };

  const user = await users.create(
    { name: body.name.trim(), email, role: body.role, categoryIds },
    { event: { type: "account-created", actorId: actor.id, at: new Date(deps.now?.() ?? Date.now()) } },
  );
  const setup = await issueResetCode({ actor, userId: user.id, lifetimeHours: SETUP_CODE_HOURS }, deps);
  if (!setup.ok) throw new Error(`The setup code for a new account could not be issued: ${setup.code}`);
  return { ok: true, user: { id: user.id, name: user.name }, setupCode: { code: setup.code, expiresAt: setup.expiresAt } };
}

export async function deactivateUser({ actor, userId }, { users, now = () => Date.now() }) {
  const refused = refuse(actor, "manageUsers");
  if (refused) return refused;
  const user = await users.findById(userId);
  if (!user) return { ok: false, code: "not-found" };
  if (String(user.id) === String(actor.id)) return { ok: false, code: "conflict", message: "You cannot deactivate your own account." };
  if (!user.active) return { ok: true, changed: false };
  if ((await users.countOpenAssigned(user.id)) > 0) {
    return { ok: false, code: "conflict", message: "This account still has open requests assigned. Reassign them first." };
  }
  const written = await users.deactivate(user.id, { event: { type: "account-deactivated", actorId: actor.id, userId: user.id, at: new Date(now()) } });
  return written === 1 ? { ok: true, changed: true } : { ok: false, code: "conflict", message: "The account was changed by someone else. Reload and try again." };
}

// ---- categories ----

export async function listAllCategories({ actor }, { categories }) {
  const refused = refuse(actor, "maintainCategories");
  if (refused) return refused;
  return { ok: true, categories: await categories.listAll() };
}

async function nameErrors(name, { categories }, exceptId = null) {
  const problem = nameProblem("Name", name);
  if (problem) return { name: problem };
  const existing = await categories.findByName(name.trim());
  if (existing && String(existing.id) !== String(exceptId)) return { name: "A category with that name already exists." };
  return null;
}

export async function addCategory({ actor, name }, deps) {
  const refused = refuse(actor, "maintainCategories");
  if (refused) return refused;
  const errors = await nameErrors(name, deps);
  if (errors) return { ok: false, code: "invalid", errors };
  return { ok: true, category: await deps.categories.create(name.trim()) };
}

export async function renameCategory({ actor, id, name }, deps) {
  const refused = refuse(actor, "maintainCategories");
  if (refused) return refused;
  const errors = await nameErrors(name, deps, id);
  if (errors) return { ok: false, code: "invalid", errors };
  const category = await deps.categories.rename(id, name.trim());
  return category ? { ok: true, category } : { ok: false, code: "not-found" };
}

// FR-027: a category is never deleted, because requests keep the category they were submitted under. An
// attempt is refused with the reason and what to do instead, for a Manager; anyone else is not authorised.
export const NOT_DELETED = "A category is never deleted, because existing requests keep it. Deactivate it instead, so it is no longer offered for new requests.";

export async function deleteCategory({ actor }) {
  const refused = refuse(actor, "maintainCategories");
  if (refused) return refused;
  return { ok: false, code: "conflict", message: NOT_DELETED };
}

export async function deactivateCategory({ actor, id }, { categories }) {
  const refused = refuse(actor, "maintainCategories");
  if (refused) return refused;
  const category = await categories.deactivate(id);
  return category ? { ok: true, category } : { ok: false, code: "not-found" };
}
