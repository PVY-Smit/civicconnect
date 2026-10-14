// Tests for the client's API wrapper and router (FR-001, FR-007, FR-012). The screens themselves are
// exercised in a browser by the Playwright journeys under #123.

import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, createApi } from "../src/api.js";
import { HOME, matchRoute, safeReturnPath } from "../src/router.js";

function fakeFetch(status, body) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, ...init });
    return { ok: status >= 200 && status < 300, status, json: async () => (body === undefined ? Promise.reject(new Error("no body")) : body) };
  };
  return { fetchImpl, calls };
}

test("every call goes to the application's own /api with the session cookie and JSON", async () => {
  const { fetchImpl, calls } = fakeFetch(201, { reference: "CC-123456", createdAt: "2026-10-05T10:00:00Z" });
  const api = createApi({ fetchImpl });
  await api.submitRequest({ title: "t" });
  assert.equal(calls[0].url, "/api/requests");
  assert.equal(calls[0].method, "POST");
  assert.equal(calls[0].credentials, "same-origin");
  assert.equal(calls[0].headers["Content-Type"], "application/json");
  assert.equal(calls[0].body, JSON.stringify({ title: "t" }));
});

test("FR-007: a 400 carries the server's field errors to the screen", async () => {
  const errors = { title: "Title is required.", location: "Location is required." };
  const api = createApi(fakeFetch(400, { errors }));
  await assert.rejects(api.submitRequest({}), (e) => e instanceof ApiError && e.status === 400 && e.errors === errors);
});

test("FR-001: a protected call answering 401 sends the user to sign in", async () => {
  let sentToSignIn = 0;
  const api = createApi({ ...fakeFetch(401, { error: "Sign in to continue." }), onUnauthorised: () => sentToSignIn++ });
  await assert.rejects(api.myRequests(), (e) => e.status === 401);
  assert.equal(sentToSignIn, 1);
});

test("FR-001: a failed sign-in shows the server's message and does not redirect", async () => {
  let sentToSignIn = 0;
  const api = createApi({ ...fakeFetch(401, { error: "The email or password is incorrect." }), onUnauthorised: () => sentToSignIn++ });
  await assert.rejects(api.signIn("a@b.c", "x"), { message: "The email or password is incorrect." });
  assert.equal(sentToSignIn, 0);
});

test("a reference is encoded into the path, so it cannot change which endpoint is called", async () => {
  const { fetchImpl, calls } = fakeFetch(404, { error: "No request with that reference was found." });
  await assert.rejects(createApi({ fetchImpl }).request("../auth/me"));
  assert.equal(calls[0].url, "/api/requests/..%2Fauth%2Fme");
});

test("a 204 answer and a response without JSON are handled", async () => {
  assert.equal(await createApi(fakeFetch(204)).signOut(), null);
  await assert.rejects(createApi(fakeFetch(500)).myRequests(), { message: "The server answered 500." });
});

test("the router matches each screen, with the submission form ahead of a reference", () => {
  assert.equal(matchRoute("/requests/new").name, "submit");
  assert.deepEqual(matchRoute("/requests/CC-1234-5678"), { name: "detail", pattern: "/requests/:reference", title: "Request", params: { reference: "CC-1234-5678" } });
  assert.equal(matchRoute("/requests").name, "list");
  assert.equal(matchRoute("/notifications").name, "notifications");
  assert.equal(matchRoute("/sign-in").public, true);
  for (const nowhere of ["/", "/requests/CC-1/extra", "/admin", "/requests/new/x"]) assert.equal(matchRoute(nowhere), null, nowhere);
});

test("only a path inside the application is accepted as the return address after sign-in", () => {
  assert.equal(safeReturnPath("/requests/CC-123456"), "/requests/CC-123456");
  assert.equal(safeReturnPath("/notifications"), "/notifications");
  for (const bad of ["https://evil.example/", "//evil.example/requests", "//requests", "/\\evil.example", "/\\requests", "/nowhere", "javascript:alert(1)", "", null, undefined]) {
    assert.equal(safeReturnPath(bad), HOME, String(bad));
  }
});
