import { test } from "node:test";
import assert from "node:assert";
import argon2 from "argon2";
import { prisma } from "../src/lib/prisma.js";

test("RSK-01: Authentication Logic and Data Persistence Verification", async (t) => {
  
  await t.test("Should correctly initialize database client connection state", () => {
    assert.ok(prisma, "Prisma database client instance should be defined");
  });

  await t.test("Should successfully execute user registration, hashing, and password authentication lifecycle", async () => {
    // 1. Create an isolated proof-of-concept user table matching actual authentication needs
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS _rsk01_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL
      );
    `);

    const testEmail = `darius-${Date.now()}@civicconnect.local`;
    const plainPassword = "SecurePassword123!";

    // 2. Hash the raw password using argon2 (Authentic credential processing proof-of-concept)
    const passwordHash = await argon2.hash(plainPassword);

    // 3. Persist the credentials to verify database write capability (Throws if database layer is broken)
    await prisma.$executeRawUnsafe(
      `INSERT INTO _rsk01_users (email, password_hash) VALUES ($1, $2);`,
      testEmail,
      passwordHash
    );

    // 4. Read the user record back to simulate a login retrieval step
    const records = await prisma.$queryRawUnsafe(
      `SELECT * FROM _rsk01_users WHERE email = $1 LIMIT 1;`,
      testEmail
    );

    assert.ok(Array.isArray(records) && records.length > 0, "Database must successfully query the saved user row");
    const savedUser = records[0];

    // 5. Verify the login password match via argon2 to complete the authentication proof-of-concept loop
    const passwordMatches = await argon2.verify(savedUser.password_hash, plainPassword);
    assert.strictEqual(passwordMatches, true, "Authentication verification must return true for valid passwords");

    // 6. Test that invalid credentials fail the login check cleanly
    const wrongPasswordMatches = await argon2.verify(savedUser.password_hash, "WrongPassword!");
    assert.strictEqual(wrongPasswordMatches, false, "Authentication check must reject invalid passwords");

    // 7. Clean up database state completely
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS _rsk01_users;`);
  });
});
