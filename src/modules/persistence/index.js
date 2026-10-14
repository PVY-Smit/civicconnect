// Cross-cutting. Owns transactions and queries (DEC-011). ADR-001 rules 2 and 5:
// queries live behind this module. Other modules call the named operations it
// exposes (for example requests.findOne, users.setResetCode) and must not import
// prisma directly. The raw client is exported only for this module's own
// operations, for tests and for the seed script.
export { prisma } from "../../lib/prisma.js";
export { prisma } from "../../lib/prisma.js";
