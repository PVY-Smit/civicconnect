-- The application's own database role for the simulated production environment (#122, ADR-007, NFR-007).
--
-- Migrations run as the database owner. The running server connects as civicconnect_app, which can read and
-- write what the application needs and nothing more: it has no DELETE on any table, and only SELECT and
-- INSERT on the append-only tables, so an audit entry, a status history row, an action entry or an account
-- event cannot be changed or removed through the application's connection (FR-026, ADR-007 "Audit
-- immutability"). It cannot create or alter tables.
--
-- Run after `npx prisma migrate deploy`, as the owner, with the password passed in so it is never in a file:
--   psql -v app_password="..." -d <database> -f docs/deployment/app-role.sql
-- It can be run again: the role is created once, and the grants are idempotent.

SELECT format('CREATE ROLE civicconnect_app LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'civicconnect_app') \gexec
SELECT format('ALTER ROLE civicconnect_app PASSWORD %L', :'app_password') \gexec

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM civicconnect_app;
GRANT USAGE ON SCHEMA public TO civicconnect_app;

-- Records the application changes.
GRANT SELECT, INSERT, UPDATE ON users, categories, requests TO civicconnect_app;
GRANT SELECT, INSERT ON user_categories TO civicconnect_app;

-- Append-only records (FR-025, FR-026, FR-017, FR-004).
GRANT SELECT, INSERT ON audit_entries, request_status_history, action_entries, account_events TO civicconnect_app;

-- Ids and the reference sequence (DEC-017).
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO civicconnect_app;
