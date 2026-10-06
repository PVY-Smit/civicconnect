// The client's only way to reach the server. Every call goes to the application's own /api entry point
// with the session cookie (ADR-001 rule 1), and the server stays the authority: the client shows what the
// server answers and never decides who may see or do something.
//
// Endpoints, as defined by #130, #131 and the issues that build the rest:
//   POST /api/auth/sign-in, POST /api/auth/sign-out, GET /api/auth/me         (#111)
//   GET  /api/categories                                                     (#115, active list for FR-006)
//   POST /api/requests, GET /api/requests/mine, GET /api/requests/:reference (#112)
//   GET  /api/notifications                                                  (#116)
//   GET  /api/queue                                                          (#114)
//   GET  /api/staff, GET /api/requests/:reference/assignable-staff           (#115)
//   POST /api/requests/:reference/status, /priority, /actions                (#113)

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error ?? `The server answered ${status}.`);
    this.status = status;
    this.errors = body?.errors ?? null; // field errors from a 400 (FR-007)
  }
}

// onUnauthorised runs when a protected call answers 401, so the app can send the user to sign in (FR-001).
export function createApi({ fetchImpl = globalThis.fetch, onUnauthorised = () => {} } = {}) {
  async function call(path, { method = "GET", body, authCall = false } = {}) {
    const response = await fetchImpl(`/api${path}`, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? { Accept: "application/json" } : { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 204) return null;
    const data = await response.json().catch(() => null);
    if (response.ok) return data;
    if (response.status === 401 && !authCall) onUnauthorised();
    throw new ApiError(response.status, data);
  }

  return {
    signIn: (email, password) => call("/auth/sign-in", { method: "POST", body: { email, password }, authCall: true }),
    signOut: () => call("/auth/sign-out", { method: "POST", authCall: true }),
    me: () => call("/auth/me", { authCall: true }),
    categories: () => call("/categories"),
    submitRequest: (fields) => call("/requests", { method: "POST", body: fields }),
    myRequests: () => call("/requests/mine"),
    request: (reference) => call(`/requests/${encodeURIComponent(reference)}`),
    notifications: () => call("/notifications"),
    // Staff and coordinator calls (#119)
    queue: (search) => call(`/queue${search ?? ""}`),
    staff: () => call("/staff"),
    assignableStaff: (reference) => call(`/requests/${encodeURIComponent(reference)}/assignable-staff`),
    changeStatus: (reference, body) => call(`/requests/${encodeURIComponent(reference)}/status`, { method: "POST", body }),
    setPriority: (reference, priority) => call(`/requests/${encodeURIComponent(reference)}/priority`, { method: "POST", body: { priority } }),
    addActionEntry: (reference, body, visibility) =>
      call(`/requests/${encodeURIComponent(reference)}/actions`, { method: "POST", body: { body, visibility } }),
  };
}
