// The application shell: who is signed in, which screen the path selects, and navigation between them.
//
// FR-001: a protected screen is never shown without a session. On load the client asks the server who is
// signed in; any protected call that answers 401 sends the user to sign in, and they return to where they
// were afterwards.

import { useCallback, useEffect, useMemo, useState } from "react";
import { createApi } from "./api.js";
import { HOME, matchRoute, safeReturnPath } from "./router.js";
import { Layout } from "./components/Layout.jsx";
import { SignIn } from "./screens/SignIn.jsx";
import { SubmitRequest } from "./screens/SubmitRequest.jsx";
import { MyRequests } from "./screens/MyRequests.jsx";
import { RequestDetail } from "./screens/RequestDetail.jsx";
import { Notifications } from "./screens/Notifications.jsx";
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
  const route = pathname === "/" ? matchRoute(HOME) : matchRoute(pathname);

  useEffect(() => {
    if (user === null && route && !route.public) toSignIn();
  }, [user, route, toSignIn]);

  if (user === undefined) return <p className="loading">Loading…</p>;

  if (route?.name === "signIn") {
    const returnTo = safeReturnPath(new URLSearchParams(search ?? "").get("return"));
    if (user) {
      navigate(returnTo, { replace: true });
      return null;
    }
    return (
      <Layout user={null} navigate={navigate}>
        <SignIn api={api} onSignedIn={(u) => (setUser(u), navigate(returnTo, { replace: true }))} />
      </Layout>
    );
  }

  if (!user) return null;

  const signOut = async () => {
    await api.signOut().catch(() => {});
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
      screen = <RequestDetail api={api} navigate={navigate} reference={route.params.reference} />;
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
