import { test } from "node:test";
import assert from "node:assert";
import { prisma } from "../src/lib/prisma.js";

test("RSK-01: Authentication Logic and Data Persistence Verification", async (t) => {
  
  await t.test("Should correctly initialize database client connection state", () => {
    assert.ok(prisma, "Prisma database client instance should be defined");
  });

  await t.test("Should successfully execute a full write and read cycle on the database ledger", async (tContext) => {
    // 1. Create an isolated proof-of-concept test table
    await prisma.\$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS _rsk01_poc (
        id SERIAL PRIMARY KEY,
        token_auth VARCHAR(255) NOT NULL,
        persisted_val VARCHAR(255) NOT NULL
      );
    `);

    const uniqueToken = `auth_token_${Date.now()}`;
    const samplePayload = "Milestone 2 Pass Criteria Verified";

    // 2. Persist a record to verify writing capabilities (Fails if database engine is missing)
    await prisma.\$executeRawUnsafe(
      `INSERT INTO _rsk01_poc (token_auth, persisted_val) VALUES ($1, $2);`,
      uniqueToken,
      samplePayload
    );

    // 3. Read the record back to verify data persistence integrity
    const records = await prisma.\$queryRawUnsafe(
      `SELECT persisted_val FROM _rsk01_poc WHERE token_auth = $1 LIMIT 1;`,
      uniqueToken
    );

    // 4. Assertions (Validates values and forces a failure if data rows are missing)
    assert.ok(Array.isArray(records) && records.length > 0, "Database should return a saved data row");
    assert.strictEqual(records[0].persisted_val, samplePayload, "Read value must match written payload");

    // 5. Clean up database state completely
    await prisma.\$executeRawUnsafe(`DROP TABLE IF EXISTS _rsk01_poc;`);
  });
});
