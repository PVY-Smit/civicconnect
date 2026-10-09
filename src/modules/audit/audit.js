// The audit module (FR-025, FR-026, NFR-011, ADR-007).
//
// An audit entry is built here and appended by the persistence module in the same transaction as the
// change it records (ADR-001 rule 3). This module offers no way to edit or delete an entry, and the
// persistence interface offers only append and read (FR-026); the database privileges add the same
// restriction underneath (ADR-007, Audit immutability).

export const AUDITED_FIELDS = Object.freeze(["status", "assigneeId", "priority"]);

// One entry for one changed field, with the value before and after (ADR-007's AuditEntry).
// A missing value is recorded as null, and the comparison is made after that, so undefined to null is
// no change.
export function auditEntry({ requestId, actorId, field, previousValue, newValue }) {
  if (!AUDITED_FIELDS.includes(field)) throw new Error(`Not an audited field: ${field}`);
  const from = previousValue ?? null;
  const to = newValue ?? null;
  if (from === to) throw new Error(`No change to audit on ${field}`);
  return Object.freeze({ requestId, actorId, fieldChanged: field, previousValue: from, newValue: to });
}

// The entries for a change: exactly one per audited field whose value differs, none for the rest.
export function auditEntriesFor({ requestId, actorId, before, after }) {
  return AUDITED_FIELDS.filter((field) => field in after && (before[field] ?? null) !== (after[field] ?? null)).map(
    (field) => auditEntry({ requestId, actorId, field, previousValue: before[field], newValue: after[field] }),
  );
}
