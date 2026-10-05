// Every screen starts with Page. It sets the document title and moves focus to the heading when the screen
// opens, so keyboard and screen reader users start at the top of the new content instead of where the
// previous screen left them (NFR-010).

import { useEffect, useRef } from "react";

export function Page({ title, children }) {
  const heading = useRef(null);
  useEffect(() => {
    document.title = `${title} - CivicConnect`;
    heading.current?.focus();
  }, [title]);
  return (
    <>
      <h1 ref={heading} tabIndex={-1}>
        {title}
      </h1>
      {children}
    </>
  );
}
