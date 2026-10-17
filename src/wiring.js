// Builds the server's dependencies from the configuration (NFR-007: every value comes from the
// environment, none from the source). Kept apart from server.js so the integration tests (TC-32) build
// the same application against their own database.

import argon2 from "argon2";
import { randomBytes } from "node:crypto";
import { createStore } from "./modules/persistence/store.js";
import { createReferenceFormatter } from "./modules/request-capture/reference.js";

function required(env, name) {
  const value = env[name];
  if (!value) throw new Error(`${name} is not set. See .env.example.`);
  return value;
}

export async function createDependencies({ prisma, env = process.env, clientDir, log } = {}) {
  const sessionSecret = required(env, "SESSION_SECRET");
  const formatReference = createReferenceFormatter(required(env, "REFERENCE_KEY"));
  // FR-022, FEC-02: the organisation-wide response target in whole days. Its value is the organisation's
  // to give, so it is configuration; reports/http.js refuses to start without a whole number of at least 1.
  const overdueTargetDays = Number(required(env, "OVERDUE_TARGET_DAYS"));
  // FR-001, FR-004: sign-in and reset check a dummy hash when there is no usable account, so the answer
  // takes as long either way. It is made with the same function and parameters as a real hash.
  const dummyHash = await argon2.hash(randomBytes(32).toString("hex"));
  return {
    store: createStore(prisma),
    hashPassword: (secret) => argon2.hash(secret),
    verifyPassword: async (hash, secret) => {
      try {
        return await argon2.verify(hash, secret);
      } catch {
        return false; // a stored value that is not an argon2 hash never verifies
      }
    },
    dummyHash,
    sessionSecret,
    overdueTargetDays,
    formatReference,
    // NFR-006: the cookie is Secure wherever the service runs over HTTPS.
    secureCookies: env.COOKIE_SECURE === "true",
    release: env.RELEASE ?? null,
    clientDir,
    log,
  };
}
