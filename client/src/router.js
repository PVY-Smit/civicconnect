// A small path router: five screens do not justify another dependency (RSK-12, ADR-002 asks for each
// package to be justified). Paths are real URLs, so a link can be bookmarked and the back button works.

export const ROUTES = Object.freeze([
  { name: "signIn", pattern: "/sign-in", title: "Sign in", public: true },
  { name: "submit", pattern: "/requests/new", title: "Submit a request" },
  { name: "detail", pattern: "/requests/:reference", title: "Request" },
  { name: "list", pattern: "/requests", title: "My requests" },
  { name: "notifications", pattern: "/notifications", title: "Notifications" },
  { name: "queue", pattern: "/queue", title: "Queue", staff: true },
]);

export const HOME = "/requests";
export const STAFF_ROLES = Object.freeze(["Staff", "Coordinator", "Manager"]);

// Where a user lands after signing in with no other page to return to.
export const isStaffUser = (user) => Boolean(user && STAFF_ROLES.includes(user.role));
export const homeFor = (user) => (isStaffUser(user) ? "/queue" : HOME);

// Whether the signed-in user is offered a route's screen. The server refuses the queue to a Requester
// (FR-013) whatever the client does; this only keeps the screen from being offered.
export const routeAllowed = (route, user) => !route?.staff || isStaffUser(user);

// The main navigation, and the items a given user sees.
export const NAV = Object.freeze([
  { to: "/queue", label: "Queue", staff: true },
  { to: "/requests/new", label: "Submit a request" },
  { to: "/requests", label: "My requests" },
  { to: "/notifications", label: "Notifications" },
]);
export const navFor = (user) => (user ? NAV.filter((item) => !item.staff || isStaffUser(user)) : []);

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
