// The request reference (FR-008, DEC-004, ADR-007).
//
// ADR-007 takes the next value from a database sequence inside the request-creation transaction, so two
// concurrent submissions never get the same value, and this module formats that value. DEC-004 rejected
// exposing the internal identifier because a visible counter reveals volume and invites guessing. The
// sequence value is therefore mapped through a fixed permutation of 0 to 999,999 before it is shown:
// every value maps to a different six-digit number, so uniqueness is kept, and consecutive requests do
// not get consecutive references.
//
// The permutation is an affine map, n -> (A*n + B) mod 10^6, with A coprime to 10^6. It hides the counter
// from a casual reader; it does not stop someone holding several references from working out the step.
// Enumeration is stopped by FR-012's scope check on every lookup, not by the format.
//
// Format proposed in #112 for the team to agree, since FR-008 refers to an agreed format that the M1
// baseline does not state: "CC-" followed by six digits, for example CC-482915.

const MODULUS = 1_000_000;
const A = 387_913; // coprime to 10^6, so the map is a bijection
const B = 104_729;
export const PREFIX = "CC-";
export const CAPACITY = MODULUS - 1; // sequence values 1 to 999,999
export const REFERENCE_PATTERN = /^CC-\d{6}$/;

export function formatReference(sequenceValue) {
  const n = Number(sequenceValue);
  if (!Number.isSafeInteger(n) || n < 1 || n > CAPACITY) {
    throw new RangeError(`Reference sequence value out of range: ${sequenceValue}`);
  }
  const scrambled = (Number((BigInt(A) * BigInt(n)) % BigInt(MODULUS)) + B) % MODULUS;
  return PREFIX + String(scrambled).padStart(6, "0");
}

// A lookup never reaches the store with something that cannot be a reference.
export function isReference(value) {
  return typeof value === "string" && REFERENCE_PATTERN.test(value);
}
