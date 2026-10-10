// FR-010: the requester's own requests with reference, title, category, current status, submission date
// and date of last update. The server decides which requests are "own" (FR-012); this screen shows them.

import { useEffect, useState } from "react";
import { Link } from "../components/Link.jsx";
import { Page } from "../components/Page.jsx";
import { formatDate } from "../format.js";

export function MyRequests({ api, navigate }) {
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.myRequests().then(
      (data) => setRequests(data.requests),
      (e) => setError(e.message),
    );
  }, [api]);

  return (
    <Page title="My requests">
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {!requests && !error && <p className="loading">Loading your requests…</p>}
      {requests && requests.length === 0 && (
        <p>
          You have not submitted any requests yet.{" "}
          <Link to="/requests/new" navigate={navigate}>
            Submit a request
          </Link>
        </p>
      )}
      {requests && requests.length > 0 && (
        <div className="table-wrap">
          <table>
            <caption className="visually-hidden">Your requests, newest first</caption>
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col">Title</th>
                <th scope="col">Category</th>
                <th scope="col">Status</th>
                <th scope="col">Submitted</th>
                <th scope="col">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
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
                  <td>{formatDate(r.submittedAt)}</td>
                  <td>{formatDate(r.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Page>
  );
}
