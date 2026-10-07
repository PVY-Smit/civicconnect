// The request detail for Staff, Coordinators and Managers (FR-015 to FR-021).
//
// What the actor may do comes from the server with the request: `moves` lists the status changes this
// actor may make now, each with the inputs it needs (ADR-005's allowedMoves), and `capabilities` says
// whether they may set the priority or record an entry (ADR-006). The screen offers exactly those. The
// server checks every action again when it arrives, so hiding a control is a convenience, not the control.

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api.js";
import { Link } from "../components/Link.jsx";
import { Page } from "../components/Page.jsx";
import { formatDateTime } from "../format.js";
import { detailControls, inputsFor, moveBody, moveFieldId, moveLabel, readyToSend } from "../workflow-ui.js";

const PRIORITIES = ["Low", "Medium", "High"];

function Feedback({ message }) {
  if (!message) return null;
  return (
    <p className={message.ok ? "notice" : "error-message"} role={message.ok ? "status" : "alert"}>
      {message.text}
    </p>
  );
}

// One status change: its button opens the inputs the move needs, and Confirm sends it.
// A 409 means the request changed on the server after this screen read it (a conflict, or a move that is no
// longer in the model). The parent reloads the request and shows the reason, so the moves on offer are the
// ones that apply now and the same move cannot simply be sent again.
function MoveForm({ move, from, reference, api, onDone, onConflict, staffOptions }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputs = inputsFor(move, from);
  const id = (field) => moveFieldId(from, move.to, field);

  const send = async (event) => {
    event?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.changeStatus(reference, moveBody(move, values));
      onDone(`${moveLabel(from, move.to)}: done. The request is now ${move.to}.`);
    } catch (e) {
      if (e.status === 409) return onConflict(e.message);
      setError(e.errors ? Object.values(e.errors).join(" ") : e.message);
    } finally {
      setBusy(false);
    }
  };

  if (inputs.length === 0) {
    return (
      <div className="move">
        <button type="button" className="button button--secondary" onClick={send} disabled={busy}>
          {moveLabel(from, move.to)}
        </button>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="move">
      <button type="button" className="button button--secondary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {moveLabel(from, move.to)}
      </button>
      {open && (
        <form className="move__form" onSubmit={send} noValidate>
          {inputs.map((input) => (
            <div className="field" key={input.field}>
              {input.kind === "confirm" ? (
                <div className="checkbox">
                  <input id={id(input.field)} type="checkbox" checked={values.confirmed === true} onChange={(e) => setValues((v) => ({ ...v, confirmed: e.target.checked }))} />
                  <label htmlFor={id(input.field)}>{input.label}</label>
                </div>
              ) : input.kind === "staff" ? (
                <>
                  <label htmlFor={id(input.field)}>{input.label}</label>
                  <select id={id(input.field)} value={values.assigneeId ?? ""} onChange={(e) => setValues((v) => ({ ...v, assigneeId: e.target.value }))}>
                    <option value="">{staffOptions ? "Choose a staff member" : "Loading staff…"}</option>
                    {(staffOptions ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label htmlFor={id(input.field)}>{input.label}</label>
                  {input.hint && (
                    <p className="hint" id={`${id(input.field)}-hint`}>
                      {input.hint}
                    </p>
                  )}
                  <textarea
                    id={id(input.field)}
                    rows={3}
                    aria-describedby={input.hint ? `${id(input.field)}-hint` : undefined}
                    value={values[input.field] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [input.field]: e.target.value }))}
                  />
                </>
              )}
            </div>
          ))}
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="button" disabled={busy || !readyToSend(move, values)}>
            Confirm: {moveLabel(from, move.to).toLowerCase()}
          </button>
        </form>
      )}
    </div>
  );
}

function PriorityForm({ request, api, onDone, onConflict }) {
  const [value, setValue] = useState(request.priority ?? "");
  const [error, setError] = useState(null);
  const send = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      await api.setPriority(request.reference, value);
      onDone(`Priority set to ${value}.`);
    } catch (e) {
      if (e.status === 409) return onConflict(e.message);
      setError(e.errors ? Object.values(e.errors).join(" ") : e.message);
    }
  };
  return (
    <form onSubmit={send} className="inline-form" noValidate>
      <div className="field">
        <label htmlFor="priority">Priority</label>
        <p className="hint" id="priority-hint">
          The requester reported {request.reportedUrgency} urgency. Priority is yours to set (FR-021).
        </p>
        <select id="priority" value={value} onChange={(e) => setValue(e.target.value)} aria-describedby="priority-hint">
          <option value="">Not set</option>
          {PRIORITIES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      <button type="submit" className="button button--secondary" disabled={!value || value === request.priority}>
        Set priority
      </button>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function EntryForm({ reference, api, onDone }) {
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState(""); // no default (FR-017, DEC-003)
  const [errors, setErrors] = useState({});
  const send = async (event) => {
    event.preventDefault();
    setErrors({});
    try {
      await api.addActionEntry(reference, body, visibility);
      setBody("");
      setVisibility("");
      onDone(visibility === "internal" ? "Internal note added." : "Update added. The requester can see it.");
    } catch (e) {
      setErrors(e instanceof ApiError && e.errors ? e.errors : { body: e.message });
    }
  };
  return (
    <form onSubmit={send} noValidate className="form">
      <div className={`field${errors.body ? " field--error" : ""}`}>
        <label htmlFor="entry-body">Entry</label>
        {errors.body && (
          <p className="error-message" id="entry-body-error">
            {errors.body}
          </p>
        )}
        <textarea id="entry-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} aria-invalid={errors.body ? "true" : undefined} aria-describedby={errors.body ? "entry-body-error" : undefined} />
      </div>
      <fieldset className={`field${errors.visibility ? " field--error" : ""}`}>
        <legend>Who can see this entry?</legend>
        {errors.visibility && <p className="error-message">{errors.visibility}</p>}
        <div className="radio">
          <input type="radio" id="visibility-internal" name="visibility" value="internal" checked={visibility === "internal"} onChange={(e) => setVisibility(e.target.value)} />
          <label htmlFor="visibility-internal">Internal: staff only</label>
        </div>
        <div className="radio">
          <input type="radio" id="visibility-requester" name="visibility" value="requester-visible" checked={visibility === "requester-visible"} onChange={(e) => setVisibility(e.target.value)} />
          <label htmlFor="visibility-requester">Requester can see it</label>
        </div>
      </fieldset>
      <button type="submit" className="button button--secondary">
        Add entry
      </button>
    </form>
  );
}

export function StaffRequestDetail({ api, navigate, reference }) {
  const [request, setRequest] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [staffOptions, setStaffOptions] = useState(null);

  const load = useCallback(() => {
    api.request(reference).then(
      (data) => setRequest(data.request),
      (e) => setError(e.status === 404 ? "notFound" : e.message),
    );
  }, [api, reference]);

  useEffect(() => {
    setRequest(null);
    setError(null);
    setMessage(null);
    load();
  }, [load]);

  const needsStaff = request?.moves?.some((m) => m.requires.includes("assigneeId"));
  useEffect(() => {
    if (!needsStaff) return;
    api.assignableStaff(reference).then((d) => setStaffOptions(d.staff), () => setStaffOptions([]));
  }, [api, reference, needsStaff]);

  // After any action the request is read again, so the screen shows what the server now holds.
  const done = (text) => {
    setMessage({ ok: true, text });
    load();
  };
  const conflicted = (text) => {
    setMessage({ ok: false, text: `${text} The request has been reloaded with its current state.` });
    load();
  };
  const controls = detailControls(request);

  if (error === "notFound") {
    return (
      <Page title="Request not found">
        <p>No request with the reference {reference} was found.</p>
        <Link to="/queue" navigate={navigate}>
          Back to the queue
        </Link>
      </Page>
    );
  }

  return (
    <Page title={request ? `Request ${request.reference}` : "Request"}>
      <Feedback message={message} />
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {!request && !error && <p className="loading">Loading the request…</p>}
      {request && (
        <>
          <p>
            <span className="status status--large">{request.status}</span>
          </p>
          <dl className="summary-list">
            <dt>Title</dt>
            <dd>{request.title}</dd>
            <dt>Description</dt>
            <dd className="prewrap">{request.description}</dd>
            <dt>Category</dt>
            <dd>{request.category}</dd>
            <dt>Location</dt>
            <dd>{request.location}</dd>
            <dt>Reported urgency</dt>
            <dd>{request.reportedUrgency}</dd>
            <dt>Priority</dt>
            <dd>{request.priority ?? "Not set"}</dd>
            <dt>Assignee</dt>
            <dd>{request.assignee?.name ?? "Unassigned"}</dd>
            <dt>Submitted</dt>
            <dd>{formatDateTime(request.submittedAt)}</dd>
            {request.resolutionSummary && (
              <>
                <dt>Resolution</dt>
                <dd className="prewrap">{request.resolutionSummary}</dd>
              </>
            )}
          </dl>

          <h2>Actions</h2>
          {controls.moves.length === 0 ? (
            <p>There are no status changes you can make on this request now.</p>
          ) : (
            <div className="moves">
              {controls.moves.map((m) => (
                <MoveForm key={`${request.status}-${m.to}`} move={m} from={request.status} reference={request.reference} api={api} onDone={done} onConflict={conflicted} staffOptions={staffOptions} />
              ))}
            </div>
          )}
          {controls.priority && <PriorityForm request={request} api={api} onDone={done} onConflict={conflicted} />}

          <h2>Status history</h2>
          <ol className="timeline">
            {request.statusHistory.map((h, i) => (
              <li key={i}>
                <span className="timeline__status">{h.to}</span> <time dateTime={h.at}>{formatDateTime(h.at)}</time>
                {h.by && <span className="muted"> by {h.by}</span>}
                {h.reason && <p className="timeline__reason">Reason: {h.reason}</p>}
              </li>
            ))}
          </ol>

          <h2>Action entries</h2>
          {request.actionEntries.length === 0 ? (
            <p>No entries yet.</p>
          ) : (
            <ol className="entries">
              {request.actionEntries.map((e, i) => (
                <li key={i} className={e.visibility === "internal" ? "entry--internal" : undefined}>
                  <time dateTime={e.at}>{formatDateTime(e.at)}</time>
                  {e.author && <span className="muted"> by {e.author}</span>}{" "}
                  <span className="tag">{e.visibility === "internal" ? "Internal" : "Visible to requester"}</span>
                  <p className="prewrap">{e.body}</p>
                </li>
              ))}
            </ol>
          )}
          {controls.entry && (
            <>
              <h3>Add an entry</h3>
              <EntryForm reference={request.reference} api={api} onDone={done} />
            </>
          )}
          <p>
            <Link to="/queue" navigate={navigate}>
              Back to the queue
            </Link>
          </p>
        </>
      )}
    </Page>
  );
}
