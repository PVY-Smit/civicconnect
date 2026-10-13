// User administration for Managers: create an account with exactly one role (FR-003), deactivate one
// (FR-028), and issue a one-time reset code (FR-004).
//
// The Manager never chooses or sees a user's password. Creating an account returns a one-time setup code,
// and a forgotten password gets a reset code; the user sets their own password with it on the reset
// screen. The server stores only the code's hash and an expiry (#109), so the code is shown here once.

import { useCallback, useEffect, useRef, useState } from "react";
import { assignableCategories, refusalText } from "../admin.js";
import { ApiError } from "../api.js";
import { ErrorSummary, Field } from "../components/Field.jsx";
import { Page } from "../components/Page.jsx";
import { formatDateTime } from "../format.js";

const ROLES = ["Requester", "Staff", "Coordinator", "Manager"];
const SCOPED = ["Staff", "Manager"]; // roles whose request scope is by category (ADR-006, FEC-01)
const EMPTY = { name: "", email: "", role: "", categoryIds: [] };

// A one-time code, shown once with who it is for and when it stops working.
function CodePanel({ code, onDismiss }) {
  const panel = useRef(null);
  useEffect(() => panel.current?.focus(), [code]);
  return (
    <div className="panel panel--code" role="status" tabIndex={-1} ref={panel}>
      <p>{code.purpose === "setup" ? "Account created. Give this setup code to" : "Reset code for"} {code.name}:</p>
      <p className="reference">{code.code}</p>
      <p>It works once and stops working at {formatDateTime(code.expiresAt)}. It will not be shown again.</p>
      <button type="button" className="button button--on-dark" onClick={onDismiss}>
        Done
      </button>
    </div>
  );
}

// A Manager cannot deactivate their own account here, so the last Manager cannot lock everyone out of
// administration; the server refuses it as well (#115).
export function Users({ api, currentUserId }) {
  const [users, setUsers] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [code, setCode] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [notice, setNotice] = useState(null);
  const summaryRef = useRef(null);
  useEffect(() => {
    if (Object.keys(errors).length > 0) summaryRef.current?.focus();
  }, [errors]);

  const load = useCallback(() => {
    api.users().then((d) => setUsers(d.users), (e) => setError(e.message));
  }, [api]);
  useEffect(() => {
    load();
    api.categories().then((d) => setCategories(assignableCategories(d.categories)), () => {});
  }, [api, load]);

  const set = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }));
  const toggleCategory = (id) => (event) =>
    setValues((v) => ({ ...v, categoryIds: event.target.checked ? [...v.categoryIds, id] : v.categoryIds.filter((c) => c !== id) }));

  const create = async (event) => {
    event.preventDefault();
    setErrors({});
    setNotice(null);
    try {
      const body = { ...values, categoryIds: SCOPED.includes(values.role) ? values.categoryIds : [] };
      const result = await api.createUser(body);
      setCode({ purpose: "setup", name: result.user.name, code: result.setupCode.code, expiresAt: result.setupCode.expiresAt });
      setValues(EMPTY);
      load();
    } catch (e) {
      setErrors(e instanceof ApiError && e.errors ? { ...e.errors } : { name: e.message });
    }
  };

  const deactivate = async (user) => {
    setConfirming(null);
    try {
      await api.deactivateUser(user.id);
      setNotice(`${user.name} is deactivated and can no longer sign in. Their history is kept.`);
      load();
    } catch (e) {
      setNotice(refusalText("deactivate", user, e.message));
    }
  };

  const reset = async (user) => {
    try {
      const result = await api.issueResetCode(user.id);
      setCode({ purpose: "reset", name: user.name, code: result.code, expiresAt: result.expiresAt });
    } catch (e) {
      setNotice(refusalText("issue a reset code for", user, e.message));
    }
  };

  return (
    <Page title="Users">
      {code && <CodePanel code={code} onDismiss={() => setCode(null)} />}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      <h2>Accounts</h2>
      {!users && !error && <p className="loading">Loading users…</p>}
      {users && (
        <div className="table-wrap">
          <table>
            <caption className="visually-hidden">User accounts</caption>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Categories</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{(u.categories ?? []).join(", ") || <span className="muted">None</span>}</td>
                  <td>{u.active ? "Active" : "Deactivated"}</td>
                  <td className="row-actions">
                    {u.active && confirming !== u.id && (
                      <>
                        <button type="button" className="link-button" onClick={() => reset(u)}>
                          Issue reset code<span className="visually-hidden"> for {u.name}</span>
                        </button>
                        {u.id === currentUserId ? (
                          <span className="muted">This is you</span>
                        ) : (
                          <button type="button" className="link-button" onClick={() => setConfirming(u.id)}>
                            Deactivate<span className="visually-hidden"> {u.name}</span>
                          </button>
                        )}
                      </>
                    )}
                    {confirming === u.id && (
                      <span role="group" aria-label={`Confirm deactivating ${u.name}`}>
                        Deactivate {u.name}?{" "}
                        <button type="button" className="link-button link-button--danger" onClick={() => deactivate(u)}>
                          Yes, deactivate
                        </button>{" "}
                        <button type="button" className="link-button" onClick={() => setConfirming(null)}>
                          Cancel
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Create an account</h2>
      <ErrorSummary errors={errors} summaryRef={summaryRef} />
      <form className="form" onSubmit={create} noValidate>
        <Field id="name" label="Full name" error={errors.name}>
          {(a) => <input {...a} type="text" autoComplete="off" value={values.name} onChange={set("name")} />}
        </Field>
        <Field id="email" label="Email address" hint="They sign in with this." error={errors.email}>
          {(a) => <input {...a} type="email" autoComplete="off" value={values.email} onChange={set("email")} />}
        </Field>
        <fieldset className={`field${errors.role ? " field--error" : ""}`}>
          <legend>Role</legend>
          <p className="hint">Each account has exactly one role (FR-003).</p>
          {errors.role && <p className="error-message">{errors.role}</p>}
          {ROLES.map((r, i) => (
            <div className="radio" key={r}>
              <input type="radio" id={i === 0 ? "role" : `role-${r}`} name="role" value={r} checked={values.role === r} onChange={set("role")} />
              <label htmlFor={i === 0 ? "role" : `role-${r}`}>{r}</label>
            </div>
          ))}
        </fieldset>
        {SCOPED.includes(values.role) && (
          <fieldset className={`field${errors.categoryIds ? " field--error" : ""}`}>
            <legend>Categories they work in</legend>
            <p className="hint">They see requests in these categories (FR-013).</p>
            {errors.categoryIds && <p className="error-message">{errors.categoryIds}</p>}
            {categories.map((c, i) => (
              <div className="checkbox" key={c.id}>
                <input type="checkbox" id={i === 0 ? "categoryIds" : `category-${c.id}`} checked={values.categoryIds.includes(c.id)} onChange={toggleCategory(c.id)} />
                <label htmlFor={i === 0 ? "categoryIds" : `category-${c.id}`}>{c.name}</label>
              </div>
            ))}
          </fieldset>
        )}
        <button type="submit" className="button">
          Create account
        </button>
      </form>
    </Page>
  );
}
