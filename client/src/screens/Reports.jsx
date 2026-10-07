// FR-022 to FR-024: the management view for Coordinators and Managers. Counts of open, overdue, resolved
// and closed requests for a chosen period, the breakdown by category and status, and the overdue list.
//
// "Overdue" uses the single organisation-wide response target the server holds (SC-D-03 deferred
// per-category targets); the screen states the target it was given rather than assuming one.

import { useEffect, useState } from "react";
import { Link } from "../components/Link.jsx";
import { Page } from "../components/Page.jsx";
import { ageText, breakdownNote, defaultPeriod, overdueHint, periodProblem, pivot } from "../reports.js";

export function Reports({ api, navigate, search }) {
  const params = new URLSearchParams(search ?? "");
  const fallback = defaultPeriod();
  const period = { from: params.get("from") || fallback.from, to: params.get("to") || fallback.to };
  const [form, setForm] = useState(period);
  const [summary, setSummary] = useState(null);
  const [overdue, setOverdue] = useState(null);
  const [error, setError] = useState(null);
  const problem = periodProblem(form);

  useEffect(() => {
    setForm(period);
    setSummary(null);
    setError(null);
    if (periodProblem(period)) return;
    api.reportSummary(period.from, period.to).then(setSummary, (e) => setError(e.errors ? Object.values(e.errors).join(" ") : e.message));
  }, [api, period.from, period.to]);

  useEffect(() => {
    api.overdue().then(setOverdue, (e) => setError(e.message));
  }, [api]);

  const apply = (event) => {
    event.preventDefault();
    if (!problem) navigate(`/reports?${new URLSearchParams(form)}`);
  };
  const table = summary ? pivot(summary.breakdown) : null;

  return (
    <Page title="Reports">
      <form className="inline-form" onSubmit={apply} noValidate aria-label="Reporting period">
        <div className="field">
          <label htmlFor="period-from">From</label>
          <input id="period-from" type="date" value={form.from} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))} aria-describedby={problem ? "period-error" : undefined} />
        </div>
        <div className="field">
          <label htmlFor="period-to">To</label>
          <input id="period-to" type="date" value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} aria-invalid={problem ? "true" : undefined} aria-describedby={problem ? "period-error" : undefined} />
        </div>
        <button type="submit" className="button button--secondary" disabled={Boolean(problem)}>
          Show
        </button>
        {problem && (
          <p id="period-error" className="error-message" role="alert">
            {problem}
          </p>
        )}
      </form>

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {!summary && !error && <p className="loading">Loading the counts…</p>}
      {summary && (
        <>
          <h2>Requests from {summary.from} to {summary.to}</h2>
          <dl className="counts">
            {[
              ["Open", summary.counts.open],
              ["Overdue", summary.counts.overdue],
              ["Resolved", summary.counts.resolved],
              ["Closed", summary.counts.closed],
            ].map(([label, n]) => (
              <div key={label} className="count">
                <dt>{label}</dt>
                <dd>{n}</dd>
              </div>
            ))}
          </dl>
          <p className="hint">{overdueHint(summary.overdueTargetDays)}</p>

          <h2>By category and status</h2>
          {breakdownNote(table) ? (
            <p>{breakdownNote(table)}</p>
          ) : (
            <div className="table-wrap">
              <table className="numbers">
                <caption className="visually-hidden">Requests by category and status, with totals</caption>
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    {table.statuses.map((s) => (
                      <th scope="col" key={s}>
                        {s}
                      </th>
                    ))}
                    <th scope="col">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((r) => (
                    <tr key={r.category}>
                      <th scope="row">{r.category}</th>
                      {r.counts.map((n, i) => (
                        <td key={table.statuses[i]}>{n}</td>
                      ))}
                      <td>{r.total}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    {table.columnTotals.map((n, i) => (
                      <td key={table.statuses[i]}>{n}</td>
                    ))}
                    <td>{table.total}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}

      <h2>Overdue requests</h2>
      {!overdue && !error && <p className="loading">Loading overdue requests…</p>}
      {overdue && overdue.requests.length === 0 && <p>No request is overdue.</p>}
      {overdue && overdue.requests.length > 0 && (
        <div className="table-wrap">
          <table>
            <caption className="visually-hidden">Overdue requests, oldest first</caption>
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Category</th>
                <th scope="col">Age</th>
                <th scope="col">Assignee</th>
              </tr>
            </thead>
            <tbody>
              {overdue.requests.map((r) => (
                <tr key={r.reference}>
                  <td>
                    <Link to={`/requests/${r.reference}`} navigate={navigate}>
                      {r.reference}
                    </Link>
                  </td>
                  <td>{r.category}</td>
                  <td>{ageText(r.ageDays)}</td>
                  <td>{r.assignee?.name ?? <span className="muted">Unassigned</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
