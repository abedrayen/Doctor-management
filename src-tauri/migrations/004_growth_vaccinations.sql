CREATE TABLE growth_measurements (
    id                   TEXT PRIMARY KEY,
    patient_id           TEXT NOT NULL REFERENCES patients (id),
    measured_at          TEXT NOT NULL,
    poids_kg             REAL,
    taille_cm            REAL,
    perimetre_cranien_cm REAL,
    notes                TEXT,
    created_at           TEXT NOT NULL
);
CREATE INDEX idx_growth_measurements_patient ON growth_measurements (patient_id, measured_at);

CREATE TABLE vaccination_schedule_versions (
    id              TEXT PRIMARY KEY,
    version         TEXT NOT NULL UNIQUE,
    source          TEXT NOT NULL,
    effective_from  TEXT NOT NULL,
    definition_json TEXT NOT NULL,
    created_at      TEXT NOT NULL
);

CREATE TABLE vaccination_schedule_items (
    id                  TEXT PRIMARY KEY,
    schedule_version_id TEXT NOT NULL REFERENCES vaccination_schedule_versions (id),
    vaccine_code        TEXT NOT NULL,
    vaccine_name        TEXT NOT NULL,
    dose_number         INTEGER NOT NULL,
    age_days_min        INTEGER,
    age_days_max        INTEGER,
    sort_order          INTEGER NOT NULL
);
CREATE INDEX idx_vaccination_schedule_items_version ON vaccination_schedule_items (schedule_version_id, sort_order);

CREATE TABLE vaccination_records (
    id               TEXT PRIMARY KEY,
    patient_id       TEXT NOT NULL REFERENCES patients (id),
    schedule_item_id TEXT REFERENCES vaccination_schedule_items (id),
    vaccine_code     TEXT,
    vaccine_name     TEXT NOT NULL,
    dose_number      INTEGER,
    status           TEXT NOT NULL CHECK (status IN ('done', 'upcoming', 'overdue', 'unknown')),
    administered_at  TEXT,
    next_due_at      TEXT,
    lot_number       TEXT,
    observations     TEXT,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);
CREATE INDEX idx_vaccination_records_patient ON vaccination_records (patient_id);
