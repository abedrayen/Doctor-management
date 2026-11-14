CREATE TABLE appointments (
    id               TEXT PRIMARY KEY,
    patient_id       TEXT NOT NULL REFERENCES patients (id),
    starts_at        TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    reason           TEXT,
    notes            TEXT,
    status           TEXT NOT NULL CHECK (status IN ('confirmed', 'pending', 'done', 'cancelled', 'no_show')),
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);
CREATE INDEX idx_appointments_starts_at ON appointments (starts_at);
CREATE INDEX idx_appointments_patient ON appointments (patient_id);

CREATE TABLE patient_documents (
    id            TEXT PRIMARY KEY,
    patient_id    TEXT NOT NULL REFERENCES patients (id),
    original_name TEXT NOT NULL,
    mime_type     TEXT NOT NULL,
    size_bytes    INTEGER NOT NULL,
    storage_path  TEXT NOT NULL,
    checksum      TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    archived_at   TEXT
);
CREATE INDEX idx_patient_documents_patient ON patient_documents (patient_id);
