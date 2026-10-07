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

function referenceFor(index) {
  return `CC-${String(index).padStart(8, "0").slice(0, 4)}-${String(index)
    .padStart(8, "0")
    .slice(4)}`;
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

  const requester = await prisma.user.upsert({
    where: { email: "requester@civicconnect.test" },
    update: {},
    create: {
      name: "Seed Requester",
      email: "requester@civicconnect.test",
      role: "Requester",
      passwordHash: requesterHash,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@civicconnect.test" },
    update: {},
    create: {
      name: "Seed Staff",
      email: "staff@civicconnect.test",
      role: "Staff",
      passwordHash: staffHash,
    },
  });

  const coordinator = await prisma.user.upsert({
    where: { email: "coordinator@civicconnect.test" },
    update: {},
    create: {
      name: "Seed Coordinator",
      email: "coordinator@civicconnect.test",
      role: "Coordinator",
      passwordHash: coordinatorHash,
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@civicconnect.test" },
    update: {},
    create: {
      name: "Seed Manager",
      email: "manager@civicconnect.test",
      role: "Manager",
      passwordHash: managerHash,
    },
  });

  const roads = await prisma.category.upsert({
    where: { name: "Roads" },
    update: {},
    create: { name: "Roads" },
  });

  const water = await prisma.category.upsert({
    where: { name: "Water" },
    update: {},
    create: { name: "Water" },
  });

  const electricity = await prisma.category.upsert({
    where: { name: "Electricity" },
    update: {},
    create: { name: "Electricity" },
  });

  await prisma.userCategory.upsert({
    where: {
      userId_categoryId: {
        userId: staff.id,
        categoryId: roads.id,
      },
    },
    update: {},
    create: {
      userId: staff.id,
      categoryId: roads.id,
    },
  });

  await prisma.userCategory.upsert({
    where: {
      userId_categoryId: {
        userId: coordinator.id,
        categoryId: roads.id,
      },
    },
    update: {},
    create: {
      userId: coordinator.id,
      categoryId: roads.id,
    },
  });

  const volume = Number(process.env.SEED_VOLUME ?? 0);

  if (volume === 5000) {
    await prisma.auditEntry.deleteMany();
    await prisma.requestStatusHistory.deleteMany();
    await prisma.actionEntry.deleteMany();
    await prisma.request.deleteMany();

    const categories = [roads, water, electricity];

    for (let i = 1; i <= 5000; i += 1) {
      const category = categories[(i - 1) % categories.length];

      await prisma.request.create({
        data: {
          reference: referenceFor(i),
          requesterId: requester.id,
          categoryId: category.id,
          assigneeId: i % 3 === 0 ? staff.id : null,
          title: `Seed request ${i}`,
          description: `Generated request ${i} for NFR-001 performance testing.`,
          location: `Seed location ${i}`,
          reportedUrgency: ["Low", "Medium", "High"][(i - 1) % 3],
          status: i % 3 === 0 ? "Assigned" : "New",
          priority: i % 3 === 0 ? "Medium" : null,
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: i % 3 === 0 ? "Assigned" : "New",
              actorId: requester.id,
              reason: null,
            },
          },
        },
      });
    }

    console.log("Seeded 5,000 requests for NFR-001.");
    return;
  }

  const existingSeedRequest = await prisma.request.findUnique({
    where: { reference: "CC-0000-0001" },
  });

  if (!existingSeedRequest) {
    await prisma.request.create({
      data: {
        reference: "CC-0000-0001",
        requesterId: requester.id,
        categoryId: roads.id,
        title: "Pothole on Main Road",
        description: "Large pothole causing traffic to slow down.",
        location: "Main Road",
        reportedUrgency: "Medium",
        status: "New",
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: "New",
            actorId: requester.id,
          },
        },
      },
    });

    await prisma.request.create({
      data: {
        reference: "CC-0000-0002",
        requesterId: requester.id,
        categoryId: water.id,
        assigneeId: staff.id,
        title: "Water leak",
        description: "Water is leaking continuously from a municipal pipe.",
        location: "Oak Street",
        reportedUrgency: "High",
        status: "Assigned",
        priority: "High",
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: "Assigned",
            actorId: coordinator.id,
          },
        },
      },
    });

    await prisma.request.create({
      data: {
        reference: "CC-0000-0003",
        requesterId: requester.id,
        categoryId: electricity.id,
        title: "Street light not working",
        description: "Street light has been off for several nights.",
        location: "Pine Avenue",
        reportedUrgency: "Low",
        status: "New",
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: "New",
            actorId: requester.id,
          },
        },
      },
    });
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
