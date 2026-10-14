-- ADR-007 / #109
-- Extends the existing User migration from #108/#90.
-- This migration deliberately does not recreate users or password_hash.

CREATE SEQUENCE "request_reference_seq"
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 99999999
    NO CYCLE;

ALTER TABLE "users"
    ADD CONSTRAINT "chk_user_role"
    CHECK ("role" IN ('Requester', 'Staff', 'Coordinator', 'Manager'));

CREATE TABLE "categories" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categories_name_key"
    ON "categories"("name");

CREATE TABLE "user_categories" (
    "user_id" BIGINT NOT NULL,
    "category_id" BIGINT NOT NULL,

    CONSTRAINT "user_categories_pkey"
        PRIMARY KEY ("user_id", "category_id")
);

CREATE TABLE "requests" (
    "id" BIGSERIAL NOT NULL,
    "reference" VARCHAR(40) NOT NULL,
    "requester_id" BIGINT NOT NULL,
    "category_id" BIGINT NOT NULL,
    "assignee_id" BIGINT,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "reported_urgency" VARCHAR(30) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'New',
    "priority" VARCHAR(30),
    "resolution_summary" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id"),

    CONSTRAINT "chk_request_status"
        CHECK (
            "status" IN (
                'New',
                'Assigned',
                'In Progress',
                'On Hold',
                'Resolved',
                'Closed',
                'Rejected'
            )
        ),

    CONSTRAINT "chk_request_reported_urgency"
        CHECK ("reported_urgency" IN ('Low', 'Medium', 'High')),

    CONSTRAINT "chk_request_priority"
        CHECK (
            "priority" IS NULL
            OR "priority" IN ('Low', 'Medium', 'High')
        )
);

CREATE UNIQUE INDEX "requests_reference_key"
    ON "requests"("reference");

CREATE INDEX "requests_requester_id_idx"
    ON "requests"("requester_id");

CREATE INDEX "requests_category_id_idx"
    ON "requests"("category_id");

CREATE INDEX "requests_status_idx"
    ON "requests"("status");

CREATE INDEX "requests_assignee_id_idx"
    ON "requests"("assignee_id");

CREATE INDEX "requests_created_at_idx"
    ON "requests"("created_at");

CREATE INDEX "requests_updated_at_idx"
    ON "requests"("updated_at");

CREATE INDEX "requests_status_created_at_idx"
    ON "requests"("status", "created_at");

CREATE INDEX "requests_priority_idx"
    ON "requests"("priority");

CREATE TABLE "action_entries" (
    "id" BIGSERIAL NOT NULL,
    "request_id" BIGINT NOT NULL,
    "author_id" BIGINT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_entries_pkey" PRIMARY KEY ("id"),

    CONSTRAINT "chk_action_entry_visibility"
        CHECK ("visibility" IN ('internal', 'requester-visible'))
);

CREATE INDEX "action_entries_request_id_created_at_idx"
    ON "action_entries"("request_id", "created_at");

CREATE TABLE "request_status_history" (
    "id" BIGSERIAL NOT NULL,
    "request_id" BIGINT NOT NULL,
    "from_status" VARCHAR(30),
    "to_status" VARCHAR(30) NOT NULL,
    "actor_id" BIGINT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_status_history_pkey" PRIMARY KEY ("id"),

    CONSTRAINT "chk_request_status_history_from"
        CHECK (
            "from_status" IS NULL
            OR "from_status" IN (
                'New',
                'Assigned',
                'In Progress',
                'On Hold',
                'Resolved',
                'Closed',
                'Rejected'
            )
        ),

    CONSTRAINT "chk_request_status_history_to"
        CHECK (
            "to_status" IN (
                'New',
                'Assigned',
                'In Progress',
                'On Hold',
                'Resolved',
                'Closed',
                'Rejected'
            )
        )
);

CREATE INDEX "request_status_history_request_id_created_at_idx"
    ON "request_status_history"("request_id", "created_at");

CREATE TABLE "audit_entries" (
    "id" BIGSERIAL NOT NULL,
    "request_id" BIGINT NOT NULL,
    "actor_id" BIGINT NOT NULL,
    "field_changed" VARCHAR(100) NOT NULL,
    "previous_value" TEXT,
    "new_value" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_entries_request_id_created_at_idx"
    ON "audit_entries"("request_id", "created_at");

ALTER TABLE "user_categories"
    ADD CONSTRAINT "user_categories_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "user_categories"
    ADD CONSTRAINT "user_categories_category_id_fkey"
    FOREIGN KEY ("category_id")
    REFERENCES "categories"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "requests"
    ADD CONSTRAINT "requests_requester_id_fkey"
    FOREIGN KEY ("requester_id")
    REFERENCES "users"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "requests"
    ADD CONSTRAINT "requests_category_id_fkey"
    FOREIGN KEY ("category_id")
    REFERENCES "categories"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "requests"
    ADD CONSTRAINT "requests_assignee_id_fkey"
    FOREIGN KEY ("assignee_id")
    REFERENCES "users"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE "action_entries"
    ADD CONSTRAINT "action_entries_request_id_fkey"
    FOREIGN KEY ("request_id")
    REFERENCES "requests"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "action_entries"
    ADD CONSTRAINT "action_entries_author_id_fkey"
    FOREIGN KEY ("author_id")
    REFERENCES "users"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "request_status_history"
    ADD CONSTRAINT "request_status_history_request_id_fkey"
    FOREIGN KEY ("request_id")
    REFERENCES "requests"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "request_status_history"
    ADD CONSTRAINT "request_status_history_actor_id_fkey"
    FOREIGN KEY ("actor_id")
    REFERENCES "users"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "audit_entries"
    ADD CONSTRAINT "audit_entries_request_id_fkey"
    FOREIGN KEY ("request_id")
    REFERENCES "requests"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "audit_entries"
    ADD CONSTRAINT "audit_entries_actor_id_fkey"
    FOREIGN KEY ("actor_id")
    REFERENCES "users"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
