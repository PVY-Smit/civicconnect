// A small path router: a handful of screens do not justify another dependency (RSK-12, ADR-002 asks for each
// package to be justified). Paths are real URLs, so a link can be bookmarked and the back button works.

export const ROUTES = Object.freeze([
  { name: "signIn", pattern: "/sign-in", title: "Sign in", public: true },
  { name: "submit", pattern: "/requests/new", title: "Submit a request" },
  { name: "detail", pattern: "/requests/:reference", title: "Request" },
  { name: "list", pattern: "/requests", title: "My requests" },
  { name: "notifications", pattern: "/notifications", title: "Notifications" },
  { name: "queue", pattern: "/queue", title: "Queue", permission: "viewRequestsInScope" },
  { name: "reports", pattern: "/reports", title: "Reports", permission: "viewManagementCounts" },
  { name: "users", pattern: "/admin/users", title: "Users", permission: "manageUsers" },
  { name: "categories", pattern: "/admin/categories", title: "Categories", permission: "maintainCategories" },
  { name: "reset", pattern: "/reset-password", title: "Reset your password", public: true },
]);

export const HOME = "/requests";

// What the signed-in user may do, as the server's policy answered at sign-in (ADR-006). The client reads
// this list to decide which links and screens to offer; it never works it out from the role name, so the
// Access Matrix stays in one place. The server still checks every call.
export const can = (user, fn) => Boolean(user?.permissions?.includes(fn));

// Where a user lands after signing in with no other page to return to.
export const homeFor = (user) => (can(user, "viewRequestsInScope") ? "/queue" : HOME);

// Whether the signed-in user is offered a route's screen: the route names the policy function it needs, and
// the user's permissions from the server decide. The server refuses the calls behind it either way.
export const routeAllowed = (route, user) => !route?.permission || can(user, route.permission);

// FR-001: a signed-out user on a protected screen is sent to sign in. A public screen never sends anyone.
export const needsSignIn = (route, user) => user === null && Boolean(route) && !route.public;

// The only screen that moves a signed-in user on is sign-in itself: to the safe return address, or to their
// home screen. Every other screen, the public reset screen included, stays where it is.
export function onwardsFor(route, user, requested) {
  if (!user || route?.name !== "signIn") return null;
  return requested ? safeReturnPath(requested) : homeFor(user);
}

// The main navigation, and the items a given user sees, by the same permissions.
export const NAV = Object.freeze([
  { to: "/queue", label: "Queue", permission: "viewRequestsInScope" },
  { to: "/requests/new", label: "Submit a request" },
  { to: "/requests", label: "My requests" },
  { to: "/notifications", label: "Notifications" },
  { to: "/reports", label: "Reports", permission: "viewManagementCounts" },
  { to: "/admin/users", label: "Users", permission: "manageUsers" },
  { to: "/admin/categories", label: "Categories", permission: "maintainCategories" },
]);
export const navFor = (user) => (user ? NAV.filter((item) => !item.permission || can(user, item.permission)) : []);

function matches(pattern, path) {
  const want = pattern.split("/").filter(Boolean);
  const got = path.split("/").filter(Boolean);
  if (want.length !== got.length) return null;
  const params = {};
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith(":")) params[want[i].slice(1)] = decodeURIComponent(got[i]);
    else if (want[i] !== got[i]) return null;
  }
  return params;
}

// The first route whose pattern fits wins, so "/requests/new" is listed before "/requests/:reference".
export function matchRoute(path) {
  for (const route of ROUTES) {
    const params = matches(route.pattern, path);
    if (params) return { ...route, params };
  }
  return null;
}

// Only a path inside this application may be a return address after sign-in, never another site.
export function safeReturnPath(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && matchRoute(value.split("?")[0]) ? value : HOME;
}
