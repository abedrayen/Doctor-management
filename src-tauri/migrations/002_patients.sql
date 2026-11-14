CREATE TABLE patients (
    id             TEXT PRIMARY KEY,
    reference      TEXT NOT NULL UNIQUE,
    nom            TEXT NOT NULL,
    prenom         TEXT NOT NULL,
    date_naissance TEXT NOT NULL,
    sexe           TEXT NOT NULL CHECK (sexe IN ('M', 'F')),
    photo_path     TEXT,
    adresse        TEXT,
    gouvernorat    TEXT,
    delegation     TEXT,
    archived_at    TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
);
CREATE INDEX idx_patients_nom ON patients (nom);
CREATE INDEX idx_patients_prenom ON patients (prenom);
CREATE INDEX idx_patients_reference ON patients (reference);

CREATE TABLE parent_contacts (
    id                   TEXT PRIMARY KEY,
    patient_id           TEXT NOT NULL REFERENCES patients (id),
    nom_pere             TEXT,
    prenom_pere          TEXT,
    nom_mere             TEXT,
    prenom_mere          TEXT,
    telephone_principal  TEXT,
    telephone_secondaire TEXT,
    email                TEXT,
    contact_urgence      TEXT,
    created_at           TEXT NOT NULL,
    updated_at           TEXT NOT NULL
);
CREATE INDEX idx_parent_contacts_patient ON parent_contacts (patient_id);
CREATE INDEX idx_parent_contacts_telephone ON parent_contacts (telephone_principal);
CREATE INDEX idx_parent_contacts_telephone2 ON parent_contacts (telephone_secondaire);

CREATE TABLE patient_medical_histories (
    id                             TEXT PRIMARY KEY,
    patient_id                     TEXT NOT NULL UNIQUE REFERENCES patients (id),
    terme_naissance                TEXT,
    prematurite                    INTEGER,
    poids_naissance_kg             REAL,
    taille_naissance_cm            REAL,
    perimetre_cranien_naissance_cm REAL,
    apgar_1                        INTEGER,
    apgar_5                        INTEGER,
    type_accouchement              TEXT,
    infos_naissance                TEXT,
    allergies_connues              TEXT,
    antecedents_medicaux           TEXT,
    antecedents_chirurgicaux       TEXT,
    antecedents_familiaux          TEXT,
    maladies_chroniques            TEXT,
    traitements_en_cours           TEXT,
    autres_observations            TEXT,
    created_at                     TEXT NOT NULL,
    updated_at                     TEXT NOT NULL
);

CREATE TABLE allergies (
    id         TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients (id),
    label      TEXT NOT NULL,
    severity   TEXT,
    notes      TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX idx_allergies_patient ON allergies (patient_id);

CREATE TABLE chronic_conditions (
    id         TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients (id),
    label      TEXT NOT NULL,
    notes      TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX idx_chronic_conditions_patient ON chronic_conditions (patient_id);

CREATE TABLE medications (
    id         TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients (id),
    name       TEXT NOT NULL,
    dosage     TEXT,
    frequency  TEXT,
    notes      TEXT,
    active     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX idx_medications_patient ON medications (patient_id);

CREATE TABLE patient_notes (
    id         TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients (id),
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX idx_patient_notes_patient ON patient_notes (patient_id);
