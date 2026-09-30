CREATE SEQUENCE request_reference_seq START WITH 1;

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(320) NOT NULL UNIQUE,
    role VARCHAR(30) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);action_entries 

CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_categories (
    user_id BIGINT NOT NULL REFERENCES users(id),
    category_id BIGINT NOT NULL REFERENCES categories(id),
    PRIMARY KEY (user_id, category_id)
);

CREATE TABLE requests (
    id BIGSERIAL PRIMARY KEY,
    reference VARCHAR(40) NOT NULL UNIQUE,
    requester_id BIGINT NOT NULL REFERENCES users(id),
    category_id BIGINT NOT NULL REFERENCES categories(id),
    assignee_id BIGINT REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    reported_urgency VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'New',
    priority VARCHAR(30),
    resolution_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_request_status CHECK (
        status IN (
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

CREATE INDEX idx_requests_requester
    ON requests(requester_id);

CREATE INDEX idx_requests_category
    ON requests(category_id);

CREATE INDEX idx_requests_status
    ON requests(status);

CREATE INDEX idx_requests_assignee
    ON requests(assignee_id);

CREATE INDEX idx_requests_created
    ON requests(created_at);

CREATE TABLE action_entries (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES requests(id),
    author_id BIGINT NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    visibility VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_action_entry_visibility CHECK (
        visibility IN ('internal', 'requester-visible')
    )
);

CREATE INDEX idx_action_entries_request
    ON action_entries(request_id, created_at);

CREATE TABLE request_status_history (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES requests(id),
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    actor_id BIGINT NOT NULL REFERENCES users(id),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_request_status_history_request
    ON request_status_history(request_id, created_at);

CREATE TABLE audit_entries (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT REFERENCES requests(id),
    actor_id BIGINT NOT NULL REFERENCES users(id),
    field_changed VARCHAR(100) NOT NULL,
    previous_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_entries_request
    ON audit_entries(request_id, created_at);

-- request_reference_seq is consumed application-side through the
-- persistence layer when a new Request is created. The returned
-- sequence value is formatted into the externally visible reference.
-- The application does not calculate the next reference using MAX().
--
-- prisma/schema.prisma is the authoritative application schema.
-- These snake_case PostgreSQL names are mapped from Prisma fields
-- such as requesterId and categoryId using @map / @@map.
