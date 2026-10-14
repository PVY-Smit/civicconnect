// FR-029: the in-application indications for the requester's requests, each naming the request by
// reference and the event. The server derives them from saved history (ADR-008).

import { useEffect, useState } from "react";
import { Link } from "../components/Link.jsx";
import { Page } from "../components/Page.jsx";
import { EVENT_TEXT, formatDateTime } from "../format.js";

export function Notifications({ api, navigate }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.notifications().then(
      (data) => setItems(data.notifications),
      (e) => setError(e.message),
    );
  }, [api]);

  return (
    <Page title="Notifications">
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {!items && !error && <p className="loading">Loading notifications…</p>}
      {items && items.length === 0 && <p>You have no notifications.</p>}
      {items && items.length > 0 && (
        <ol className="entries">
          {items.map((n, i) => (
            <li key={`${n.reference}-${n.event}-${i}`}>
              <time dateTime={n.at}>{formatDateTime(n.at)}</time>
              <p>
                Request{" "}
                <Link to={`/requests/${n.reference}`} navigate={navigate}>
                  {n.reference}
                </Link>{" "}
                {EVENT_TEXT[n.event] ?? n.event}.
              </p>
            </li>
          ))}
        </ol>
      )}
    </Page>
  );
}
