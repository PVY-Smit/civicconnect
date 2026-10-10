// A small path router: five screens do not justify another dependency (RSK-12, ADR-002 asks for each
// package to be justified). Paths are real URLs, so a link can be bookmarked and the back button works.

export const ROUTES = Object.freeze([
  { name: "signIn", pattern: "/sign-in", title: "Sign in", public: true },
  { name: "submit", pattern: "/requests/new", title: "Submit a request" },
  { name: "detail", pattern: "/requests/:reference", title: "Request" },
  { name: "list", pattern: "/requests", title: "My requests" },
  { name: "notifications", pattern: "/notifications", title: "Notifications" },
]);

export const HOME = "/requests";

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
