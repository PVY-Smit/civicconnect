import "dotenv/config";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/client/client.ts";
import { createStore } from "../src/modules/persistence/store.js";
import { createReferenceFormatter } from "../src/modules/request-capture/reference.js";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

// Seeded requests are created and assigned through the persistence module's own operations, so each one
// takes its reference from request_reference_seq through REFERENCE_KEY's permutation (DEC-017), exactly as
// a submission does, and a later submission can never be given a seeded reference.
const store = createStore(prisma);
let formatReference;

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for database seeding`);
  }

  return value;
}

function assertSafeVolumeMode() {
  if (process.env.SEED_VOLUME !== "5000") {
    return false;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SEED_VOLUME=5000 must never run in production");
  }

  if (process.env.ALLOW_DESTRUCTIVE_SEED !== "true") {
    throw new Error(
      "ALLOW_DESTRUCTIVE_SEED=true is required for SEED_VOLUME=5000",
    );
  }

  return true;
}

async function upsertUser({ name, email, role, passwordHash }) {
  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      passwordHash,
      active: true,
    },
    create: {
      name,
      email,
      role,
      passwordHash,
    },
  });
}

async function createNewRequest({ requesterId, categoryId, title, description, location, reportedUrgency }) {
  const { reference } = await store.requests.create(
    { requesterId, categoryId, title, description, location, reportedUrgency, status: "New", priority: null },
    { formatReference },
  );
  return store.requests.findOne({ where: { reference } });
}

// A Coordinator assigning a New request and setting its priority, written as the workflow service writes
// it: the change, its status history row and one audit entry per changed field, in one transaction.
async function assignRequest({ request, coordinatorId, staffId, priority = "Medium" }) {
  await store.store.transaction(async (tx) => {
    const updated = await tx.updateRequest(
      { id: request.id, expect: { status: "New", assigneeId: null, priority: null } },
      { status: "Assigned", assigneeId: staffId, priority },
    );
    if (!updated) throw new Error(`Seed request ${request.reference} was not New.`);
    await tx.appendStatusHistory({ requestId: request.id, fromStatus: "New", toStatus: "Assigned", actorId: coordinatorId, reason: null });
    for (const [field, newValue] of [["status", "Assigned"], ["assigneeId", staffId], ["priority", priority]]) {
      const previousValue = field === "status" ? "New" : null;
      await tx.appendAudit({ requestId: request.id, actorId: coordinatorId, fieldChanged: field, previousValue, newValue });
    }
  });
}

async function main() {
  const requesterPassword = requiredEnv("SEED_REQUESTER_PASSWORD");
  const staffPassword = requiredEnv("SEED_STAFF_PASSWORD");
  const coordinatorPassword = requiredEnv("SEED_COORDINATOR_PASSWORD");
  const managerPassword = requiredEnv("SEED_MANAGER_PASSWORD");
  formatReference = createReferenceFormatter(requiredEnv("REFERENCE_KEY"));

  const [
    requesterHash,
    staffHash,
    coordinatorHash,
    managerHash,
  ] = await Promise.all([
    argon2.hash(requesterPassword),
    argon2.hash(staffPassword),
    argon2.hash(coordinatorPassword),
    argon2.hash(managerPassword),
  ]);

  const requester = await upsertUser({
    name: "Seed Requester",
    email: "requester@civicconnect.test",
    role: "Requester",
    passwordHash: requesterHash,
  });

  const staff = await upsertUser({
    name: "Seed Staff",
    email: "staff@civicconnect.test",
    role: "Staff",
    passwordHash: staffHash,
  });

  const coordinator = await upsertUser({
    name: "Seed Coordinator",
    email: "coordinator@civicconnect.test",
    role: "Coordinator",
    passwordHash: coordinatorHash,
  });

  await upsertUser({
    name: "Seed Manager",
    email: "manager@civicconnect.test",
    role: "Manager",
    passwordHash: managerHash,
  });

  // A second Manager, because a Manager's reset code has to come from another Manager (FR-004), so one
  // Manager who forgets their password would otherwise have no way back in.
  await upsertUser({
    name: "Seed Manager Two",
    email: "manager2@civicconnect.test",
    role: "Manager",
    passwordHash: managerHash,
  });

  const roads = await prisma.category.upsert({
    where: { name: "Roads" },
    update: { active: true },
    create: { name: "Roads" },
  });

  const water = await prisma.category.upsert({
    where: { name: "Water" },
    update: { active: true },
    create: { name: "Water" },
  });

  const electricity = await prisma.category.upsert({
    where: { name: "Electricity" },
    update: { active: true },
    create: { name: "Electricity" },
  });

  for (const category of [roads, water, electricity]) {
    await prisma.userCategory.upsert({
      where: {
        userId_categoryId: {
          userId: staff.id,
          categoryId: category.id,
        },
      },
      update: {},
      create: {
        userId: staff.id,
        categoryId: category.id,
      },
    });
  }

  const volumeMode = assertSafeVolumeMode();

  if (volumeMode) {
    // Audit entries can only be appended (FR-026, ADR-007), so volume mode deletes nothing. It needs a
    // database with no requests: npx prisma migrate reset first.
    if ((await prisma.request.count()) > 0) {
      throw new Error("SEED_VOLUME=5000 needs a database with no requests. Run npx prisma migrate reset first.");
    }

    const categories = [roads, water, electricity];
    const urgencies = ["Low", "Medium", "High"];

    for (let i = 1; i <= 5000; i += 1) {
      const category = categories[(i - 1) % categories.length];

      const request = await createNewRequest({
        requesterId: requester.id,
        categoryId: category.id,
        title: `Seed request ${i}`,
        description: `Generated request ${i} for NFR-001 performance testing.`,
        location: `Seed location ${i}`,
        reportedUrgency: urgencies[(i - 1) % urgencies.length],
      });

      if (i % 3 === 0) {
        await assignRequest({
          request,
          coordinatorId: coordinator.id,
          staffId: staff.id,
          priority: "Medium",
        });
      }
    }

    console.log("Seeded 5,000 requests for NFR-001.");
    return;
  }

  const existing = await prisma.request.count({
    where: {
      title: {
        startsWith: "Seed ",
      },
    },
  });

  if (existing === 0) {
    const first = await createNewRequest({
      requesterId: requester.id,
      categoryId: roads.id,
      title: "Seed pothole request",
      description: "Large pothole causing traffic to slow down.",
      location: "Main Road",
      reportedUrgency: "Medium",
    });

    const second = await createNewRequest({
      requesterId: requester.id,
      categoryId: water.id,
      title: "Seed water leak request",
      description: "Water is leaking continuously from a municipal pipe.",
      location: "Oak Street",
      reportedUrgency: "High",
    });

    await assignRequest({
      request: second,
      coordinatorId: coordinator.id,
      staffId: staff.id,
      priority: "High",
    });

    await createNewRequest({
      requesterId: requester.id,
      categoryId: electricity.id,
      title: "Seed street light request",
      description: "Street light has been off for several nights.",
      location: "Pine Avenue",
      reportedUrgency: "Low",
    });

    void first;
  }

  console.log("Seed data created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
