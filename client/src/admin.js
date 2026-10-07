// The administration screens' logic (FR-003, FR-004, FR-006, FR-028), kept out of the components so it can be
// tested without a browser.

// FR-006: only active categories are offered when creating an account. GET /api/categories is the server's
// list of active categories (#115); an entry the server marks inactive is left out here as well, so a
// deactivated category is never offered even if one is sent.
export const assignableCategories = (categories) => (categories ?? []).filter((c) => c.active !== false);

// A refused action names the account it was for. The in-page confirmation has closed by the time the server
// answers, so without the name the Manager cannot tell which account was refused.
export const refusalText = (action, user, message) => `Could not ${action} ${user.name}. ${message}`;
