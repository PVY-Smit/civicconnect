// FR-005 to FR-009: submit a request, see every problem at once with the entered values kept, and get an
// acknowledgement with the reference and the time recorded.
//
// The server is the only validator that counts (ADR-007, validation layers). This screen sends what the
// user typed and shows the server's field messages, so the rules live in one place.

import { useEffect, useRef, useState } from "react";
import { ApiError } from "../api.js";
import { ErrorSummary, Field } from "../components/Field.jsx";
import { Link } from "../components/Link.jsx";
import { Page } from "../components/Page.jsx";
import { formatDateTime } from "../format.js";

const URGENCY = [
  { value: "Low", hint: "It can wait for routine scheduling" },
  { value: "Medium", hint: "It is affecting people and should be dealt with soon" },
  { value: "High", hint: "It is causing harm or a safety risk now" },
];
const EMPTY = { title: "", description: "", categoryId: "", location: "", reportedUrgency: "" };

export function SubmitRequest({ api, navigate }) {
  const [categories, setCategories] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);
  const [acknowledgement, setAcknowledgement] = useState(null);
  const summaryRef = useRef(null);
  const ackRef = useRef(null);

  // Focus follows the outcome: the error summary after a refused submission, the reference after success.
  useEffect(() => {
    if (Object.keys(errors).length > 0) summaryRef.current?.focus();
  }, [errors]);
  useEffect(() => {
    if (acknowledgement) ackRef.current?.focus();
  }, [acknowledgement]);

  useEffect(() => {
    api.categories().then(
      (data) => setCategories(data.categories),
      (e) => setLoadError(e.message),
    );
  }, [api]);

  const set = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setFailure(null);
    try {
      const ack = await api.submitRequest(values);
      setErrors({});
      setAcknowledgement(ack);
    } catch (e) {
      if (e instanceof ApiError && e.errors) {
        setErrors({ ...e.errors }); // values stay as typed (FR-007); a new object so focus moves on every attempt
      } else {
        setFailure(e.message);
      }
    } finally {
      setBusy(false);
    }
  };

  if (acknowledgement) {
    return (
      <Page title="Request submitted">
        <div className="panel" role="status" tabIndex={-1} ref={ackRef}>
          <p>Your reference is</p>
          <p className="reference">{acknowledgement.reference}</p>
          <p>Recorded on {formatDateTime(acknowledgement.createdAt)}</p>
        </div>
        <p>Keep this reference. Quote it if you contact the municipality about this request.</p>
        <ul className="actions">
          <li>
            <Link to={`/requests/${acknowledgement.reference}`} navigate={navigate}>
              View this request
            </Link>
          </li>
          <li>
            <button type="button" className="link-button" onClick={() => (setValues(EMPTY), setAcknowledgement(null))}>
              Submit another request
            </button>
          </li>
        </ul>
      </Page>
    );
  }

  return (
    <Page title="Submit a request">
      <ErrorSummary errors={errors} summaryRef={summaryRef} />
      {failure && (
        <p className="error-message" role="alert">
          {failure}
        </p>
      )}
      {loadError && (
        <p className="error-message" role="alert">
          The category list could not be loaded: {loadError}
        </p>
      )}
      <form onSubmit={submit} noValidate className="form">
        <Field id="title" label="Title" hint="A short summary, up to 200 characters" error={errors.title}>
          {(a) => <input {...a} type="text" value={values.title} onChange={set("title")} />}
        </Field>
        <Field id="description" label="Description" hint="What is wrong, and since when. Up to 4,000 characters" error={errors.description}>
          {(a) => <textarea {...a} rows={6} value={values.description} onChange={set("description")} />}
        </Field>
        <Field id="categoryId" label="Category" error={errors.categoryId}>
          {(a) => (
            <select {...a} value={values.categoryId} onChange={set("categoryId")} disabled={!categories}>
              <option value="">{categories ? "Choose a category" : "Loading categories…"}</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id="location" label="Location" hint="An address or a description of the place, up to 300 characters" error={errors.location}>
          {(a) => <input {...a} type="text" autoComplete="street-address" value={values.location} onChange={set("location")} />}
        </Field>
        <fieldset className={`field${errors.reportedUrgency ? " field--error" : ""}`} aria-describedby={errors.reportedUrgency ? "reportedUrgency-error" : undefined}>
          <legend>How urgent is it for you?</legend>
          {errors.reportedUrgency && (
            <p id="reportedUrgency-error" className="error-message">
              <span className="visually-hidden">Error: </span>
              {errors.reportedUrgency}
            </p>
          )}
          {URGENCY.map((u, i) => (
            <div className="radio" key={u.value}>
              <input
                type="radio"
                id={i === 0 ? "reportedUrgency" : `reportedUrgency-${u.value}`}
                name="reportedUrgency"
                value={u.value}
                checked={values.reportedUrgency === u.value}
                onChange={set("reportedUrgency")}
                aria-describedby={`urgency-${u.value}-hint`}
              />
              <label htmlFor={i === 0 ? "reportedUrgency" : `reportedUrgency-${u.value}`}>{u.value}</label>
              <p id={`urgency-${u.value}-hint`} className="hint hint--radio">
                {u.hint}
              </p>
            </div>
          ))}
        </fieldset>
        <button type="submit" className="button" disabled={busy}>
          {busy ? "Submitting…" : "Submit request"}
        </button>
      </form>
    </Page>
  );
}
