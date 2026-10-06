// The application shell: who is signed in, which screen the path selects, and navigation between them.
//
// FR-001: a protected screen is never shown without a session. On load the client asks the server who is
// signed in; any protected call that answers 401 sends the user to sign in, and they return to where they
// were afterwards.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createApi } from "./api.js";
import { homeFor, matchRoute, safeReturnPath, STAFF_ROLES } from "./router.js";
import { Layout } from "./components/Layout.jsx";
import { SignIn } from "./screens/SignIn.jsx";
import { clearDraft, SubmitRequest } from "./screens/SubmitRequest.jsx";
import { MyRequests } from "./screens/MyRequests.jsx";
import { RequestDetail } from "./screens/RequestDetail.jsx";
import { Notifications } from "./screens/Notifications.jsx";
import { Queue } from "./screens/Queue.jsx";
import { StaffRequestDetail } from "./screens/StaffRequestDetail.jsx";
import { NotFound } from "./screens/NotFound.jsx";

const currentPath = () => window.location.pathname + window.location.search;

export function App() {
  const [path, setPath] = useState(currentPath);
  const [user, setUser] = useState(undefined); // undefined while checking, null when signed out

  const navigate = useCallback((to, { replace = false } = {}) => {
    window.history[replace ? "replaceState" : "pushState"](null, "", to);
    setPath(to);
  }, []);

  const toSignIn = useCallback(() => {
    setUser(null);
    const here = currentPath();
    if (!here.startsWith("/sign-in")) navigate(`/sign-in?return=${encodeURIComponent(here)}`, { replace: true });
  }, [navigate]);

  const api = useMemo(() => createApi({ onUnauthorised: toSignIn }), [toSignIn]);

  useEffect(() => {
    const onPop = () => setPath(currentPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    api.me().then(
      (data) => setUser(data.user),
      () => setUser(null),
    );
  }, [api]);

  const [pathname, search] = path.split("?");
  const route = pathname === "/" ? matchRoute(homeFor(user)) : matchRoute(pathname);
  const isStaff = Boolean(user && STAFF_ROLES.includes(user.role));
  // Effects depend on these plain values, not on the route object, which is new on every render.
  const routeName = route?.name ?? null;
  const routeIsPublic = Boolean(route?.public);
  const requested = routeName === "signIn" ? new URLSearchParams(search ?? "").get("return") : null;

  // Navigation is a side effect, so it happens in effects after render, never during it.
  useEffect(() => {
    if (user === null && routeName && !routeIsPublic) toSignIn();
  }, [user, routeName, routeIsPublic, toSignIn]);

  // A signed-in user on the sign-in page goes to the safe return address, or to their home screen.
  useEffect(() => {
    if (user && routeName === "signIn") navigate(requested ? safeReturnPath(requested) : homeFor(user), { replace: true });
  }, [user, routeName, requested, navigate]);

  if (user === undefined) return <p className="loading">Loading…</p>;

  if (routeName === "signIn") {
    if (user) return null; // the effect above is moving the user on
    return (
      <Layout user={null} navigate={navigate}>
        <SignIn api={api} onSignedIn={(u) => (setUser(u), navigate(requested ? safeReturnPath(requested) : homeFor(u), { replace: true }))} />
      </Layout>
    );
  }

  if (!user) return null;

  const signOut = async () => {
    await api.signOut().catch(() => {});
    clearDraft();
    setUser(null);
    navigate("/sign-in", { replace: true });
  };

  let screen;
  switch (route?.name) {
    case "submit":
      screen = <SubmitRequest api={api} navigate={navigate} />;
      break;
    case "list":
      screen = <MyRequests api={api} navigate={navigate} />;
      break;
    case "detail":
      screen = isStaff ? (
        <StaffRequestDetail api={api} navigate={navigate} reference={route.params.reference} />
      ) : (
        <RequestDetail api={api} navigate={navigate} reference={route.params.reference} />
      );
      break;
    case "queue":
      // The server refuses the queue to a Requester (FR-013); the screen is not offered to them either.
      screen = isStaff ? <Queue api={api} navigate={navigate} search={search ? `?${search}` : ""} /> : <NotFound navigate={navigate} />;
      break;
    case "notifications":
      screen = <Notifications api={api} navigate={navigate} />;
      break;
    default:
      screen = <NotFound navigate={navigate} />;
  }
  return (
    <Layout user={user} navigate={navigate} current={pathname} onSignOut={signOut}>
      {screen}
    </Layout>
  );
}
