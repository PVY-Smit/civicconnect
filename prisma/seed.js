import "dotenv/config";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/client/client.ts";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

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

function referenceFor(index) {
  const value = String(index).padStart(8, "0");
  return `CC-${value.slice(0, 4)}-${value.slice(4)}`;
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

async function createNewRequest({
  reference,
  requesterId,
  categoryId,
  title,
  description,
  location,
  reportedUrgency,
}) {
  return prisma.request.create({
    data: {
      reference,
      requesterId,
      categoryId,
      title,
      description,
      location,
      reportedUrgency,
      status: "New",
      priority: null,
      statusHistory: {
        create: {
          fromStatus: null,
          toStatus: "New",
          actorId: requesterId,
          reason: null,
        },
      },
    },
  });
}

async function assignRequest({
  request,
  coordinatorId,
  staffId,
  priority = "Medium",
}) {
  await prisma.$transaction([
    prisma.request.update({
      where: { id: request.id },
      data: {
        status: "Assigned",
        assigneeId: staffId,
        priority,
      },
    }),

    prisma.requestStatusHistory.create({
      data: {
        requestId: request.id,
        fromStatus: "New",
        toStatus: "Assigned",
        actorId: coordinatorId,
        reason: null,
      },
    }),

    prisma.auditEntry.create({
      data: {
        requestId: request.id,
        actorId: coordinatorId,
        fieldChanged: "status",
        previousValue: "New",
        newValue: "Assigned",
      },
    }),

    prisma.auditEntry.create({
      data: {
        requestId: request.id,
        actorId: coordinatorId,
        fieldChanged: "assigneeId",
        previousValue: null,
        newValue: String(staffId),
      },
    }),

    prisma.auditEntry.create({
      data: {
        requestId: request.id,
        actorId: coordinatorId,
        fieldChanged: "priority",
        previousValue: null,
        newValue: priority,
      },
    }),
  ]);
}

async function main() {
  const requesterPassword = requiredEnv("SEED_REQUESTER_PASSWORD");
  const staffPassword = requiredEnv("SEED_STAFF_PASSWORD");
  const coordinatorPassword = requiredEnv("SEED_COORDINATOR_PASSWORD");
  const managerPassword = requiredEnv("SEED_MANAGER_PASSWORD");

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
    await prisma.$transaction([
      prisma.auditEntry.deleteMany(),
      prisma.requestStatusHistory.deleteMany(),
      prisma.actionEntry.deleteMany(),
      prisma.request.deleteMany(),
    ]);

    const categories = [roads, water, electricity];
    const urgencies = ["Low", "Medium", "High"];

    for (let i = 1; i <= 5000; i += 1) {
      const category = categories[(i - 1) % categories.length];

      const request = await createNewRequest({
        reference: referenceFor(i),
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
      reference: referenceFor(1),
      requesterId: requester.id,
      categoryId: roads.id,
      title: "Seed pothole request",
      description: "Large pothole causing traffic to slow down.",
      location: "Main Road",
      reportedUrgency: "Medium",
    });

    const second = await createNewRequest({
      reference: referenceFor(2),
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
      reference: referenceFor(3),
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
