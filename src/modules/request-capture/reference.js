// The request reference (FR-008, DEC-004, ADR-007).
//
// ADR-007 takes the next value from a database sequence inside the request-creation transaction, so two
// concurrent submissions never get the same value, and this module turns that value into the reference.
// DEC-004 rejected exposing the internal identifier because a visible counter reveals volume and invites
// guessing, so the value is scrambled before it is shown.
//
// The scramble is a keyed pseudorandom permutation of 0 to 99,999,999: a four-round Feistel network over
// 28 bits, whose round function is HMAC-SHA256 under a secret key, with cycle-walking to stay inside the
// eight-digit range. Being a permutation, it gives every sequence value a different reference, so FR-008's
// uniqueness still rests on the sequence. Being keyed, it cannot be reversed without the key: a reference
// does not reveal its position in the sequence, and two consecutive requests get unrelated references.
//
// The key comes from configuration (REFERENCE_KEY), never from the source. It must stay the same for the
// life of the data: a new key is a different permutation, which could give a new request a reference an
// older one already has. The database's unique constraint would refuse that insert rather than reuse the
// reference, but submissions would start failing. If the key leaks, what is lost is the volume disclosure
// DEC-004 guards against; access to a request is still governed by FR-012's scope check on every lookup.
//
// Format: "CC-" and eight digits in two groups of four, for example CC-4829-1573, so it can be read out
// over the phone.

import { createHmac } from "node:crypto";

const HALF_BITS = 14; // two 14-bit halves: a 28-bit domain of 268,435,456 values
const RANGE = 100_000_000; // eight digits
const ROUNDS = 4;
export const CAPACITY = RANGE - 1; // sequence values 1 to 99,999,999
export const PREFIX = "CC-";
export const REFERENCE_PATTERN = /^CC-\d{4}-\d{4}$/;
const MIN_KEY_LENGTH = 32;

// A keyed permutation of 0 to range - 1. Exported with its parameters so the tests can check, on a small
// domain, that every input maps to a different output.
export function feistelPermutation(key, { halfBits = HALF_BITS, range = RANGE, rounds = ROUNDS } = {}) {
  const mask = (1 << halfBits) - 1;
  const roundValue = (round, half) => createHmac("sha256", key).update(`${round}:${half}`).digest().readUInt32BE(0) & mask;
  const encrypt = (x) => {
    let left = x >>> halfBits;
    let right = x & mask;
    for (let round = 0; round < rounds; round++) [left, right] = [right, left ^ roundValue(round, right)];
    return left * (mask + 1) + right;
  };
  return (n) => {
    let x = encrypt(n);
    while (x >= range) x = encrypt(x); // cycle-walking: stays a permutation of 0 to range - 1
    return x;
  };
}

// Build the formatter once, at start-up, with the configured key.
export function createReferenceFormatter(key) {
  if (typeof key !== "string" || key.length < MIN_KEY_LENGTH) {
    throw new Error(`REFERENCE_KEY must be at least ${MIN_KEY_LENGTH} characters.`);
  }
  const permute = feistelPermutation(key);
  return function formatReference(sequenceValue) {
    const n = Number(sequenceValue);
    if (!Number.isSafeInteger(n) || n < 1 || n > CAPACITY) {
      // Never wrapped into a reference another request already has. The persistence adapter reports this
      // as "the reference range is used up", not as a generic failure.
      throw new RangeError(`Reference sequence value out of range: ${sequenceValue}`);
    }
    const digits = String(permute(n)).padStart(8, "0");
    return `${PREFIX}${digits.slice(0, 4)}-${digits.slice(4)}`;
  };
}

// A lookup never reaches the store with something that cannot be a reference.
export function isReference(value) {
  return typeof value === "string" && REFERENCE_PATTERN.test(value);
}
