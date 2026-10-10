// FR-011: the full detail and status history of the requester's own request, with only the entries the
// server marks requester-visible (the server never sends the others, so there is nothing to hide here).
// FR-020: a rejection shows its reason. FR-012: a request that is not theirs looks exactly like one that
// does not exist.

import { useEffect, useState } from "react";
import { Link } from "../components/Link.jsx";
import { Page } from "../components/Page.jsx";
import { formatDateTime } from "../format.js";

export function RequestDetail({ api, navigate, reference }) {
  const [request, setRequest] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setRequest(null);
    setError(null);
    api.request(reference).then(
      (data) => setRequest(data.request),
      (e) => setError(e.status === 404 ? "notFound" : e.message),
    );
  }, [api, reference]);

  if (error === "notFound") {
    return (
      <Page title="Request not found">
        <p>No request with the reference {reference} was found.</p>
        <Link to="/requests" navigate={navigate}>
          Back to my requests
        </Link>
      </Page>
    );
  }

  return (
    <Page title={request ? `Request ${request.reference}` : "Request"}>
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
            <dt>Your urgency</dt>
            <dd>{request.reportedUrgency}</dd>
            <dt>Submitted</dt>
            <dd>{formatDateTime(request.submittedAt)}</dd>
            <dt>Last updated</dt>
            <dd>{formatDateTime(request.updatedAt)}</dd>
            {request.resolutionSummary && (
              <>
                <dt>Resolution</dt>
                <dd className="prewrap">{request.resolutionSummary}</dd>
              </>
            )}
          </dl>

          <h2>Status history</h2>
          <ol className="timeline">
            {request.statusHistory.map((h, i) => (
              <li key={i}>
                <span className="timeline__status">{h.to}</span> <time dateTime={h.at}>{formatDateTime(h.at)}</time>
                {h.to === "Rejected" && h.reason && <p className="timeline__reason">Reason: {h.reason}</p>}
              </li>
            ))}
          </ol>

          <h2>Updates</h2>
          {request.actionEntries.length === 0 ? (
            <p>There are no updates on this request yet.</p>
          ) : (
            <ol className="entries">
              {request.actionEntries.map((e, i) => (
                <li key={i}>
                  <time dateTime={e.at}>{formatDateTime(e.at)}</time>
                  <p className="prewrap">{e.body}</p>
                </li>
              ))}
            </ol>
          )}
          <p>
            <Link to="/requests" navigate={navigate}>
              Back to my requests
            </Link>
          </p>
        </>
      )}
    </Page>
  );
}
