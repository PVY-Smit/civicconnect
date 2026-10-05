import { Link } from "../components/Link.jsx";
import { Page } from "../components/Page.jsx";

export function NotFound({ navigate }) {
  return (
    <Page title="Page not found">
      <p>There is no page at this address.</p>
      <Link to="/requests" navigate={navigate}>
        Go to my requests
      </Link>
    </Page>
  );
}
