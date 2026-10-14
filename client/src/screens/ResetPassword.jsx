// FR-004: set a new password with the one-time code a Manager issued (or the setup code from account
// creation). A failure shows the server's single message, which does not say whether the account exists
// or which part was wrong.

import { useEffect, useRef, useState } from "react";
import { Link } from "../components/Link.jsx";
import { Page } from "../components/Page.jsx";

export function ResetPassword({ api, navigate }) {
  const [values, setValues] = useState({ email: "", code: "", password: "", repeat: "" });
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const messageRef = useRef(null);
  useEffect(() => {
    if (error || done) messageRef.current?.focus();
  }, [error, done]);

  const set = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    if (values.password !== values.repeat) {
      setError("The two new passwords do not match.");
      return;
    }
    try {
      await api.resetPassword(values.email, values.code, values.password);
      setDone(true);
    } catch (e) {
      setError(e.errors ? Object.values(e.errors).join(" ") : e.message);
      setValues((v) => ({ ...v, password: "", repeat: "" }));
    }
  };

  if (done) {
    return (
      <Page title="Password set">
        <div className="notice" role="status" tabIndex={-1} ref={messageRef}>
          <p>Your new password is set. The code no longer works.</p>
        </div>
        <Link to="/sign-in" navigate={navigate}>
          Sign in
        </Link>
      </Page>
    );
  }

  return (
    <Page title="Set a new password">
      {error && (
        <div className="error-summary" role="alert" tabIndex={-1} ref={messageRef}>
          <p>{error}</p>
        </div>
      )}
      <p>Use the one-time code your manager gave you.</p>
      <form className="form form--narrow" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="reset-email">Email address</label>
          <input id="reset-email" type="email" autoComplete="username" value={values.email} onChange={set("email")} />
        </div>
        <div className="field">
          <label htmlFor="reset-code">Code</label>
          <input id="reset-code" type="text" inputMode="text" autoComplete="one-time-code" value={values.code} onChange={set("code")} />
        </div>
        <div className="field">
          <label htmlFor="reset-password">New password</label>
          <input id="reset-password" type="password" autoComplete="new-password" value={values.password} onChange={set("password")} />
        </div>
        <div className="field">
          <label htmlFor="reset-repeat">New password again</label>
          <input id="reset-repeat" type="password" autoComplete="new-password" value={values.repeat} onChange={set("repeat")} />
        </div>
        <button type="submit" className="button">
          Set password
        </button>
      </form>
      <p>
        <Link to="/sign-in" navigate={navigate}>
          Back to sign in
        </Link>
      </p>
    </Page>
  );
}
