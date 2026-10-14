// A cap on how many argon2 checks run at once (NFR-003, NFR-004, the review of #146).
//
// Each argon2 check holds its memory for as long as it runs: 19 MiB with ADR-002's parameters, so about 30
// at once need some 570 MiB, more than the 512 MB of the free web service in PED s24. Sign-in and the
// password reset are public routes, so a burst on either could stop the whole instance. Every argon2 call
// in this module goes through one limiter: at most MAX_CONCURRENT_HASHES run, and the rest wait their
// turn in arrival order. A burst then costs time, not memory: 4 checks hold about 76 MiB.
//
// Waiting does not change what an answer reveals: every sign-in and every reset makes the same checks, so
// all of them wait the same way.

export const MAX_CONCURRENT_HASHES = 4;

export function limitConcurrency(limit) {
  if (!(Number.isInteger(limit) && limit >= 1)) throw new Error(`The limit must be a whole number of at least 1; it is ${limit}.`);
  let running = 0;
  const waiting = [];

  // A place that comes free goes straight to the longest waiting call, without being counted free in
  // between, so a call arriving at that moment cannot take it and make limit + 1.
  const release = () => {
    const next = waiting.shift();
    if (next) next();
    else running -= 1;
  };

  // run(fn) calls fn once a place is free, and frees the place when fn settles, whether it resolves or
  // throws, so a failed check never holds a place.
  return async function run(fn) {
    if (running >= limit) await new Promise((resolve) => waiting.push(resolve));
    else running += 1;
    try {
      return await fn();
    } finally {
      release();
    }
  };
}
