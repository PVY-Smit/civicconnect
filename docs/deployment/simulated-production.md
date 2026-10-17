# Simulated production

How CivicConnect's final release is deployed to the simulated production environment (#122), and what
makes that environment production-like. The go-live decision that rests on it is in the PED (s37).

## What it is

One server process and one PostgreSQL 16 database on a single machine. It is kept separate from
development in five ways.

| | Development | Simulated production |
|---|---|---|
| Code | A working tree, any branch | A fresh clone of the repository, checked out at the release tag |
| Database | `final_it` or any local database | `civicconnect_prod`, used by nothing else |
| Database role | The owner | `civicconnect_app`: no DELETE anywhere; only SELECT and INSERT on the audit, history, entry and event tables (`app-role.sql`) |
| Configuration | `.env` with test values | Its own `.env` outside every working tree, with secrets generated for it and never used elsewhere, `NODE_ENV=production` and `RELEASE` set to the tag |
| Address | `localhost:3100` | `localhost:8080`, serving the API and the built client from one origin |

## Deploying a release

Run these as the database owner, with the owner's connection in `OWNER_DATABASE_URL`. The application's
own connection goes in `.env`.

1. Clone the repository at the release tag, into a directory that is not a working tree:

   ```bash
   git clone --branch v1.0.0 https://github.com/PVY-Smit/civicconnect civicconnect-simprod
   ```

2. Write `.env` in it with:
   - `DATABASE_URL`, using the `civicconnect_app` role;
   - `SESSION_SECRET` and `REFERENCE_KEY`, each 32 characters or more, generated for this environment;
   - `OVERDUE_TARGET_DAYS`;
   - `NODE_ENV=production`, `PORT=8080`, and `RELEASE` set to the tag.

   `REFERENCE_KEY` must never change once requests exist (DEC-017).

3. Install, generate the client, migrate as the owner, and grant the application's role. The build
   tools are development dependencies, so `--include=dev` is needed under `NODE_ENV=production`:

   ```bash
   npm ci --include=dev
   npx prisma generate
   DATABASE_URL="$OWNER_DATABASE_URL" npx prisma migrate deploy
   psql -v app_password="..." -f docs/deployment/app-role.sql -d "$OWNER_DATABASE_URL"
   ```

4. The first deployment only: seed the accounts and categories as the owner, with the `SEED_*`
   passwords for this environment:

   ```bash
   DATABASE_URL="$OWNER_DATABASE_URL" npx prisma db seed
   ```

5. Build the client:

   ```bash
   npm ci --include=dev --prefix client
   npm run build --prefix client
   ```

6. Start the server, which reads `.env`:

   ```bash
   node src/server.js
   ```

7. Verify the deployment. Every check must pass, and the release must be the tag deployed:

   ```bash
   node tools/smoke-check.mjs http://localhost:8080 v1.0.0
   ```

   Then run the two journeys against it (`e2e/`, with `E2E_BASE_URL=http://localhost:8080`).

## Backup and restore

Take a backup before every deployment, and keep it outside every working tree, because a dump holds
personal data (NFR-008). `PG_BIN` names the PostgreSQL 16 bin directory if it is not on the PATH.

```bash
RELEASE=v1.0.0 node tools/backup.mjs backup "$OWNER_DATABASE_URL" <backup directory>
```

It prints the file's size and SHA-256. A backup is trusted only once it has been restored and checked.
1. Restore it into an empty database.
2. Compare the restored copy's rows with the original.
3. Start a server on the restored copy and run the smoke check and the journeys against it.

```bash
createdb civicconnect_restore
node tools/backup.mjs restore <backup file> "postgres://.../civicconnect_restore"
node tools/backup.mjs compare "$OWNER_DATABASE_URL" "postgres://.../civicconnect_restore"
```

The grants travel with the backup, so the application's role works on the restored copy as before.

## Rolling back

1. Stop the server.
2. If the release being rolled back ran a migration, restore the backup taken before it.
3. Repeat steps 1, 2, 5, 6 and 7 with the previous tag.

## What it does not have

These separate it from a real production deployment, and the go-live decision in the PED weighs them.

- **No TLS.** It is served over HTTP on localhost. NFR-006 needs HTTPS, and `COOKIE_SECURE=true` once it
  has it.
- **Backups are manual,** and they live on the same machine as the database. There is no schedule and
  no off-site copy, so a lost disk loses the backups too.
- **No hosting.** It runs on one member's machine, not the Render web service DEC-010 chose.
- **No monitoring** beyond `/health`.
