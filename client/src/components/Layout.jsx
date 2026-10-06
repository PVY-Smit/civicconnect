// Page frame (NFR-010): a skip link to the main content, a labelled navigation landmark, and the current
// page marked with aria-current so a screen reader announces where the user is.

import { STAFF_ROLES } from "../router.js";
import { Link } from "./Link.jsx";

const NAV = [
  { to: "/queue", label: "Queue", staff: true },
  { to: "/requests/new", label: "Submit a request" },
  { to: "/requests", label: "My requests" },
  { to: "/notifications", label: "Notifications" },
];

export function Layout({ user, navigate, current, onSignOut, children }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <span className="site-name">CivicConnect</span>
          {user && (
            <nav aria-label="Main">
              <ul className="nav">
                {NAV.filter((item) => !item.staff || STAFF_ROLES.includes(user.role)).map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} navigate={navigate} aria-current={current === item.to ? "page" : undefined}>
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <button type="button" className="link-button" onClick={onSignOut}>
                    Sign out
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
        {user && (
          <p className="signed-in">
            Signed in as {user.name}, {user.role}
          </p>
        )}
      </header>
      <main id="main" tabIndex={-1} className="main">
        {children}
      </main>
    </>
  );
}
