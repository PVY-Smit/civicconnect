// HTTP boundary for administration (FR-003, FR-027, FR-028). Runs behind authenticate (#111); the
// permission checks are in the service, through the policy.

import { NOT_PERMITTED } from "../identity-access/http.js";
import { addCategory, createUser, deactivateCategory, deactivateUser, deleteCategory, listAllCategories, listUsers, renameCategory } from "./service.js";

const STATUS = { "not-signed-in": 401, "not-authorised": 403, "not-found": 404, invalid: 400, conflict: 409 };

function answer(res, result, okStatus, body) {
  if (result.ok) return res.status(okStatus).json(body(result));
  const status = STATUS[result.code] ?? 400;
  if (status === 401) return res.status(401).json({ error: "Sign in to continue." });
  if (status === 403) return res.status(403).json({ error: NOT_PERMITTED });
  if (status === 404) return res.status(404).json({ error: "Not found." });
  if (result.errors) return res.status(status).json({ errors: result.errors });
  return res.status(status).json({ error: result.message });
}

export function createAdministrationHandlers(deps) {
  return {
    listUsers: async (req, res) => answer(res, await listUsers({ actor: req.actor }, deps), 200, (r) => ({ users: r.users })),
    createUser: async (req, res) =>
      answer(res, await createUser({ actor: req.actor, input: req.body }, deps), 201, (r) => ({ user: r.user, setupCode: r.setupCode })),
    deactivateUser: async (req, res) => answer(res, await deactivateUser({ actor: req.actor, userId: req.params?.id }, deps), 200, () => ({})),
    listAllCategories: async (req, res) =>
      answer(res, await listAllCategories({ actor: req.actor }, deps), 200, (r) => ({ categories: r.categories })),
    addCategory: async (req, res) => answer(res, await addCategory({ actor: req.actor, name: req.body?.name }, deps), 201, (r) => r.category),
    renameCategory: async (req, res) =>
      answer(res, await renameCategory({ actor: req.actor, id: req.params?.id, name: req.body?.name }, deps), 200, (r) => r.category),
    deleteCategory: async (req, res) => answer(res, await deleteCategory({ actor: req.actor }), 200, () => ({})),
    deactivateCategory: async (req, res) =>
      answer(res, await deactivateCategory({ actor: req.actor, id: req.params?.id }, deps), 200, (r) => r.category),
  };
}
