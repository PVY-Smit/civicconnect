// Cross-cutting. Owns transactions and queries (DEC-011). Re-exports the
// Prisma client so every module accesses data through one place.
export { prisma } from "../../lib/prisma.js";
