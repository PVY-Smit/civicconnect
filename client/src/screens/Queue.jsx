// FR-013, FR-014: the work queue for Staff and Coordinators, with search, filters and sort. The server
// limits it to the actor's authorised categories; filters only narrow that further.

import { useEffect, useState } from "react";
import { Link } from "../components/Link.jsx";
import { Page } from "../components/Page.jsx";
import { formatDate } from "../format.js";
import { DEFAULT_SORT, filtersFromSearch, rangeProblem, searchFromFilters, SORTS } from "../queue-filters.js";

const STATUSES = ["New", "Assigned", "In Progress", "On Hold", "Resolved", "Closed", "Rejected"];

export function Queue({ api, navigate, search }) {
  const applied = filtersFromSearch(search);
  const [form, setForm] = useState(applied);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [staff, setStaff] = useState([]);
  const query = searchFromFilters(applied);

  useEffect(() => {
    api.categories().then((d) => setCategories(d.categories), () => {});
    api.staff().then((d) => setStaff(d.staff), () => {});
  }, [api]);

  useEffect(() => {
    setForm(filtersFromSearch(search));
    setResult(null);
    setError(null);
    api.queue(query).then(setResult, (e) => setError(e.errors ? Object.values(e.errors).join(" ") : e.message));
  }, [api, query, search]);

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const problem = rangeProblem(form);

  const apply = (event) => {
    event.preventDefault();
    if (problem) return;
    navigate(`/queue${searchFromFilters({ ...form, page: "1" })}`);
  };
  const toPage = (page) => navigate(`/queue${searchFromFilters({ ...applied, page: String(page) })}`);
  const pages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  const current = Number(applied.page);

  return (
    <Page title="Queue">
      <form className="filters" onSubmit={apply} role="search" aria-label="Search and filter the queue">
        <div className="field">
          <label htmlFor="q">Reference or keyword</label>
          <input id="q" type="search" value={form.q} onChange={set("q")} />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" value={form.status} onChange={set("status")}>
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="categoryId">Category</label>
          <select id="categoryId" value={form.categoryId} onChange={set("categoryId")}>
            <option value="">Any category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="assigneeId">Assignee</label>
          <select id="assigneeId" value={form.assigneeId} onChange={set("assigneeId")}>
            <option value="">Anyone</option>
            <option value="none">Unassigned</option>
            <option value="me">Assigned to me</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="from">Submitted from</label>
          <input id="from" type="date" value={form.from} onChange={set("from")} aria-describedby={problem ? "range-error" : undefined} />
        </div>
        <div className="field">
          <label htmlFor="to">Submitted to</label>
          <input id="to" type="date" value={form.to} onChange={set("to")} aria-invalid={problem ? "true" : undefined} aria-describedby={problem ? "range-error" : undefined} />
        </div>
        <div className="field">
          <label htmlFor="sort">Sort</label>
          <select id="sort" value={form.sort || DEFAULT_SORT} onChange={set("sort")}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="filters__actions">
          <button type="submit" className="button" disabled={Boolean(problem)}>
            Apply
          </button>
          <Link to="/queue" navigate={navigate}>
            Clear filters
          </Link>
        </div>
        {problem && (
          <p id="range-error" className="error-message filters__error" role="alert">
            {problem}
          </p>
        )}
      </form>

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {!result && !error && <p className="loading">Loading the queue…</p>}
      {result && (
        <>
          <p role="status">
            {result.total === 0 ? "No requests match." : `${result.total} request${result.total === 1 ? "" : "s"}${pages > 1 ? `, page ${current} of ${pages}` : ""}.`}
          </p>
          {result.requests.length > 0 && (
            <div className="table-wrap">
              <table>
                <caption className="visually-hidden">Requests in your queue</caption>
                <thead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Title</th>
                    <th scope="col">Category</th>
                    <th scope="col">Status</th>
                    <th scope="col">Priority</th>
                    <th scope="col">Urgency</th>
                    <th scope="col">Assignee</th>
                    <th scope="col">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {result.requests.map((r) => (
                    <tr key={r.reference}>
                      <td>
                        <Link to={`/requests/${r.reference}`} navigate={navigate}>
                          {r.reference}
                        </Link>
                      </td>
                      <td>{r.title}</td>
                      <td>{r.category}</td>
                      <td>
                        <span className="status">{r.status}</span>
                      </td>
                      <td>{r.priority ?? <span className="muted">Not set</span>}</td>
                      <td>{r.reportedUrgency}</td>
                      <td>{r.assignee?.name ?? <span className="muted">Unassigned</span>}</td>
                      <td>{formatDate(r.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pages > 1 && (
            <nav aria-label="Queue pages" className="pager">
              {current > 1 && (
                <button type="button" className="link-button" onClick={() => toPage(current - 1)}>
                  Previous page
                </button>
              )}
              {current < pages && (
                <button type="button" className="link-button" onClick={() => toPage(current + 1)}>
                  Next page
                </button>
              )}
            </nav>
          )}
        </>
      )}
    </Page>
  );
}
