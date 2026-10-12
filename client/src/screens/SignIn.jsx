// FR-001: sign in with an email and password. A failure shows the server's single generic message, so the
// screen never says whether the email exists.

import { useEffect, useRef, useState } from "react";
import { Page } from "../components/Page.jsx";

export function SignIn({ api, onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const errorRef = useRef(null);

  // Move focus to the message once it is on screen, so it is announced and the user starts from it.
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await api.signIn(email, password);
      onSignedIn(data.user);
    } catch (e) {
      setError(e.message);
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page title="Sign in">
      {error && (
        <div className="error-summary" role="alert" tabIndex={-1} ref={errorRef}>
          <p>{error}</p>
        </div>
      )}
      <form onSubmit={submit} noValidate className="form form--narrow">
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="button" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="hint">Forgotten your password? Ask a manager for a reset code.</p>
    </Page>
  );
}
