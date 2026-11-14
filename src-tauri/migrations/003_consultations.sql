CREATE TABLE consultations (
    id                      TEXT PRIMARY KEY,
    patient_id              TEXT NOT NULL REFERENCES patients (id),
    consulted_at            TEXT NOT NULL,
    type_consultation       TEXT,
    motif                   TEXT,
    symptomes               TEXT,
    temperature_c           REAL,
    poids_kg                REAL,
    taille_cm               REAL,
    perimetre_cranien_cm    REAL,
    frequence_cardiaque     INTEGER,
    frequence_respiratoire  INTEGER,
    autres_observations     TEXT,
    examen_clinique         TEXT,
    observations            TEXT,
    diagnostic              TEXT,
    diagnostic_differentiel TEXT,
    suivi_date              TEXT,
    instructions_suivi      TEXT,
    notes                   TEXT,
    status                  TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
    finalized_at            TEXT,
    created_at              TEXT NOT NULL,
    updated_at              TEXT NOT NULL
);
CREATE INDEX idx_consultations_patient ON consultations (patient_id, consulted_at);
CREATE INDEX idx_consultations_status ON consultations (status);

CREATE TABLE consultation_treatments (
    id              TEXT PRIMARY KEY,
    consultation_id TEXT NOT NULL REFERENCES consultations (id),
    medicament      TEXT NOT NULL,
    dosage          TEXT,
    frequence       TEXT,
    duree           TEXT,
    instructions    TEXT,
    created_at      TEXT NOT NULL
);
CREATE INDEX idx_consultation_treatments_consultation ON consultation_treatments (consultation_id);

CREATE TABLE consultation_amendments (
    id              TEXT PRIMARY KEY,
    consultation_id TEXT NOT NULL REFERENCES consultations (id),
    field_name      TEXT NOT NULL,
    old_value       TEXT,
    new_value       TEXT,
    reason          TEXT NOT NULL,
    created_at      TEXT NOT NULL
);
CREATE INDEX idx_consultation_amendments_consultation ON consultation_amendments (consultation_id);
