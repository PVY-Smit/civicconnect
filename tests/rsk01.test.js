import { test, after } from "node:test";
import assert from "node:assert/strict";
import argon2 from "argon2";
import { prisma } from "../src/lib/prisma.js";

after(() => prisma.$disconnect());

test("RSK-01: a User is persisted and authenticates through argon2", async (t) => {
  const email = `rsk01-${Date.now()}-${Math.random().toString(36).slice(2)}@civicconnect.test`;
  const password = "correct horse battery staple";

  const user = await prisma.user.create({
    data: {
      name: "RSK-01 probe",
      email,
      role: "Requester",
      passwordHash: await argon2.hash(password),
    },
  });
  t.after(() => prisma.user.delete({ where: { id: user.id } }));

  const saved = await prisma.user.findUnique({ where: { email } });
  assert.ok(saved, "the row is read back from the database");
  assert.equal(saved.active, true);
  assert.equal(await argon2.verify(saved.passwordHash, password), true);
  assert.equal(await argon2.verify(saved.passwordHash, "wrong password"), false);
});
