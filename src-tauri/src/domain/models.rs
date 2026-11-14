//! Domain models mapped 1:1 on database columns.
//!
//! `model!` generates the struct plus `Model::from_row` / `Model::columns`, so SQL
//! mapping is declared once. Input structs (`*Data`) hold the user-editable columns;
//! persisted entities are exposed as `Record<*Data>` (id + timestamps + data).
//! The frontend contract lives in `crate::ipc`; these models are never sent as-is.

use rusqlite::{Row, types::ToSql};
use serde::{Deserialize, Serialize};

pub trait Model: Sized {
    fn from_row(row: &Row) -> rusqlite::Result<Self>;
    fn columns(&self) -> Vec<(&'static str, &dyn ToSql)>;
}

macro_rules! model {
    ($(#[$sm:meta])* $name:ident { $( $(#[$fm:meta])* $field:ident : $ty:ty ),* $(,)? }) => {
        $(#[$sm])*
        #[derive(Debug, Clone, Default, Serialize, Deserialize)]
        pub struct $name { $( $(#[$fm])* pub $field: $ty ),* }

        impl Model for $name {
            fn from_row(row: &Row) -> rusqlite::Result<Self> {
                Ok(Self { $( $field: row.get(stringify!($field))? ),* })
            }

            fn columns(&self) -> Vec<(&'static str, &dyn ToSql)> {
                vec![ $( (stringify!($field), &self.$field as &dyn ToSql) ),* ]
            }
        }
    };
}

/// A persisted row: `id`, `created_at`, optional `updated_at` + the data columns.
#[derive(Debug, Clone)]
pub struct Record<T> {
    pub id: String,
    pub data: T,
    pub created_at: String,
    pub updated_at: Option<String>,
}

impl<T: Model> Record<T> {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        let has_updated = row.as_ref().column_names().contains(&"updated_at");
        Ok(Self {
            id: row.get("id")?,
            data: T::from_row(row)?,
            created_at: row.get("created_at")?,
            updated_at: if has_updated { row.get("updated_at")? } else { None },
        })
    }
}

// ---------------------------------------------------------------- Doctor

model!(Doctor {
    id: String,
    display_name: String,
    specialty: Option<String>,
    created_at: String,
    updated_at: String,
});

// ---------------------------------------------------------------- Patients

model!(PatientData {
    nom: String,
    prenom: String,
    date_naissance: String,
    sexe: String,
    photo_path: Option<String>,
    adresse: Option<String>,
    gouvernorat: Option<String>,
    delegation: Option<String>,
});

model!(PatientMeta {
    reference: String,
    archived_at: Option<String>,
});

model!(ContactData {
    nom_pere: Option<String>,
    prenom_pere: Option<String>,
    nom_mere: Option<String>,
    prenom_mere: Option<String>,
    telephone_principal: Option<String>,
    telephone_secondaire: Option<String>,
    email: Option<String>,
    contact_urgence: Option<String>,
});

model!(HistoryData {
    terme_naissance: Option<String>,
    prematurite: Option<bool>,
    poids_naissance_kg: Option<f64>,
    taille_naissance_cm: Option<f64>,
    perimetre_cranien_naissance_cm: Option<f64>,
    apgar_1: Option<i64>,
    apgar_5: Option<i64>,
    type_accouchement: Option<String>,
    infos_naissance: Option<String>,
    allergies_connues: Option<String>,
    antecedents_medicaux: Option<String>,
    antecedents_chirurgicaux: Option<String>,
    antecedents_familiaux: Option<String>,
    maladies_chroniques: Option<String>,
    traitements_en_cours: Option<String>,
    autres_observations: Option<String>,
});

model!(NoteData { body: String });

// ---------------------------------------------------------------- Consultations

model!(ConsultationData {
    patient_id: String,
    consulted_at: String,
    type_consultation: Option<String>,
    motif: Option<String>,
    symptomes: Option<String>,
    temperature_c: Option<f64>,
    poids_kg: Option<f64>,
    taille_cm: Option<f64>,
    perimetre_cranien_cm: Option<f64>,
    frequence_cardiaque: Option<i64>,
    frequence_respiratoire: Option<i64>,
    autres_observations: Option<String>,
    examen_clinique: Option<String>,
    observations: Option<String>,
    diagnostic: Option<String>,
    diagnostic_differentiel: Option<String>,
    suivi_date: Option<String>,
    instructions_suivi: Option<String>,
    notes: Option<String>,
});

model!(ConsultationState {
    status: String,
    finalized_at: Option<String>,
});

model!(AmendmentData {
    field_name: String,
    old_value: Option<String>,
    new_value: Option<String>,
    reason: String,
});

// ---------------------------------------------------------------- Growth

model!(GrowthData {
    patient_id: String,
    measured_at: String,
    poids_kg: Option<f64>,
    taille_cm: Option<f64>,
    perimetre_cranien_cm: Option<f64>,
    notes: Option<String>,
});

// ---------------------------------------------------------------- Vaccinations

model!(ScheduleVersion {
    id: String,
    version: String,
    source: String,
    effective_from: String,
    definition_json: String,
    created_at: String,
});

model!(ScheduleItem {
    id: String,
    schedule_version_id: String,
    vaccine_code: String,
    vaccine_name: String,
    dose_number: i64,
    age_days_min: Option<i64>,
    age_days_max: Option<i64>,
    sort_order: i64,
});

model!(VaccinationData {
    patient_id: String,
    vaccine_code: Option<String>,
    vaccine_name: String,
    dose_number: Option<i64>,
    status: String,
    administered_at: Option<String>,
    next_due_at: Option<String>,
    lot_number: Option<String>,
    observations: Option<String>,
});

// ---------------------------------------------------------------- Appointments & documents

model!(AppointmentData {
    patient_id: String,
    starts_at: String,
    duration_minutes: i64,
    reason: Option<String>,
    notes: Option<String>,
    status: String,
});

model!(DocumentData {
    patient_id: String,
    original_name: String,
    mime_type: String,
    size_bytes: i64,
    storage_path: String,
    checksum: String,
});

model!(ArchiveState { archived_at: Option<String> });

// ---------------------------------------------------------------- Backups

model!(BackupEntry {
    id: String,
    path: String,
    size_bytes: i64,
    checksum: String,
    status: String,
    created_at: String,
});

// ---------------------------------------------------------------- Composite views

#[derive(Debug, Clone)]
pub struct PatientRecord {
    pub record: Record<PatientData>,
    pub meta: PatientMeta,
}

impl PatientRecord {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self { record: Record::from_row(row)?, meta: PatientMeta::from_row(row)? })
    }
}

/// Patient with its one-to-one records and free notes (most recent first).
#[derive(Debug, Clone)]
pub struct PatientDetail {
    pub patient: PatientRecord,
    pub contact: Option<Record<ContactData>>,
    pub history: Option<Record<HistoryData>>,
    pub notes: Vec<Record<NoteData>>,
}

/// Input for creating / updating a patient with its related records.
#[derive(Debug, Clone)]
pub struct PatientForm {
    pub patient: PatientData,
    pub contact: ContactData,
    pub history: HistoryData,
    pub notes: Vec<NoteData>,
}

/// Consultation header + state + traced amendments.
#[derive(Debug, Clone)]
pub struct ConsultationDetail {
    pub record: Record<ConsultationData>,
    pub state: ConsultationState,
    pub patient_name: String,
    pub amendments: Vec<Record<AmendmentData>>,
}
