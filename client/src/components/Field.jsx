// A labelled form field with its hint and error tied to the input (FR-007, NFR-010). The error names the
// field and the correction, as the server sends it, and the value the user typed stays in the input.

export function Field({ id, label, hint, error, children }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`field${error ? " field--error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {hint && (
        <p id={hintId} className="hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="error-message">
          <span className="visually-hidden">Error: </span>
          {error}
        </p>
      )}
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? "true" : undefined })}
    </div>
  );
}

// The list of every failing field at the top of the form, each linking to its field. It takes focus when it
// appears, so the user hears how many things need correcting before they start.
export function ErrorSummary({ errors, summaryRef }) {
  const entries = Object.entries(errors ?? {});
  if (entries.length === 0) return null;
  return (
    <div className="error-summary" role="alert" tabIndex={-1} ref={summaryRef} aria-labelledby="error-summary-title">
      <h2 id="error-summary-title">There {entries.length === 1 ? "is a problem" : `are ${entries.length} problems`}</h2>
      <ul>
        {entries.map(([field, message]) => (
          <li key={field}>
            <a href={`#${field}`}>{message}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
