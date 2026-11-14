CREATE TABLE doctors (
    id            TEXT PRIMARY KEY,
    display_name  TEXT NOT NULL,
    specialty     TEXT,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE TABLE application_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE audit_logs (
    id            TEXT PRIMARY KEY,
    action        TEXT NOT NULL,
    entity_type   TEXT NOT NULL,
    entity_id     TEXT,
    metadata_json TEXT,
    created_at    TEXT NOT NULL
);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);

CREATE TABLE backup_history (
    id         TEXT PRIMARY KEY,
    path       TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    checksum   TEXT NOT NULL,
    status     TEXT NOT NULL,
    created_at TEXT NOT NULL
);
