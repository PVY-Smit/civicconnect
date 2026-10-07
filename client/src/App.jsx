// The application shell: who is signed in, which screen the path selects, and navigation between them.
//
// FR-001: a protected screen is never shown without a session. On load the client asks the server who is
// signed in; any protected call that answers 401 sends the user to sign in, and they return to where they
// were afterwards.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createApi } from "./api.js";
import { can, homeFor, matchRoute, needsSignIn, onwardsFor, routeAllowed } from "./router.js";
import { Layout } from "./components/Layout.jsx";
import { SignIn } from "./screens/SignIn.jsx";
import { clearDraft, SubmitRequest } from "./screens/SubmitRequest.jsx";
import { MyRequests } from "./screens/MyRequests.jsx";
import { RequestDetail } from "./screens/RequestDetail.jsx";
import { Notifications } from "./screens/Notifications.jsx";
import { Queue } from "./screens/Queue.jsx";
import { StaffRequestDetail } from "./screens/StaffRequestDetail.jsx";
import { Reports } from "./screens/Reports.jsx";
import { Users } from "./screens/Users.jsx";
import { Categories } from "./screens/Categories.jsx";
import { ResetPassword } from "./screens/ResetPassword.jsx";
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
  const isStaff = can(user, "viewRequestsInScope");
  // Effects depend on these plain values, not on the route object, which is new on every render.
  const routeName = route?.name ?? null;
  const requested = routeName === "signIn" ? new URLSearchParams(search ?? "").get("return") : null;
  const mustSignIn = needsSignIn(route, user);
  const onwards = onwardsFor(route, user, requested);

  // Navigation is a side effect, so it happens in effects after render, never during it.
  useEffect(() => {
    if (mustSignIn) toSignIn();
  }, [mustSignIn, toSignIn]);

  useEffect(() => {
    if (onwards) navigate(onwards, { replace: true });
  }, [onwards, navigate]);

  if (user === undefined) return <p className="loading">Loading…</p>;

  if (routeName === "signIn") {
    if (user) return null; // the effect above is moving the user on
    return (
      <Layout user={null} navigate={navigate}>
        <SignIn api={api} navigate={navigate} onSignedIn={(u) => (setUser(u), navigate(onwardsFor(route, u, requested), { replace: true }))} />
      </Layout>
    );
  }

  if (route?.name === "reset") {
    return (
      <Layout user={null} navigate={navigate}>
        <ResetPassword api={api} navigate={navigate} />
      </Layout>
    );
  }

  if (!user) return null;

  // A screen the user's permissions do not include is not offered (the server refuses its calls anyway).
  const allowed = routeAllowed(route, user);

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
      screen = allowed ? <Queue api={api} navigate={navigate} search={search ? `?${search}` : ""} /> : <NotFound navigate={navigate} />;
      break;
    case "reports":
      screen = allowed ? <Reports api={api} navigate={navigate} search={search ? `?${search}` : ""} /> : <NotFound navigate={navigate} />;
      break;
    case "users":
      screen = allowed ? <Users api={api} currentUserId={user.id} /> : <NotFound navigate={navigate} />;
      break;
    case "categories":
      screen = allowed ? <Categories api={api} /> : <NotFound navigate={navigate} />;
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
