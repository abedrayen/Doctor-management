use rusqlite::{Connection, params};
use serde_json::{Value, json};

use crate::application::{audit, patients};
use crate::database::{cols, count, get_record, insert_new, new_id, query_all, query_opt, today, update_row};
use crate::domain::error::{AppError, AppResult};
use crate::domain::models::*;

const SEED_VERSION: &str = "TN-2024-review";
const SEED_SOURCE: &str = "PLACEHOLDER - calendrier de démarrage configurable, NON validé : à vérifier par le médecin \
    d'après le calendrier vaccinal national officiel en vigueur. Ne constitue pas une référence clinique.";
const SEED_EFFECTIVE_FROM: &str = "2024-01-01";

const STATUSES: [&str; 4] = ["done", "upcoming", "overdue", "unknown"];

/// (code, name, dose number, min age in days, max age in days) - typical ages, to be reviewed by the doctor.
const SEED_ITEMS: &[(&str, &str, i64, i64, i64)] = &[
    ("BCG", "BCG", 1, 0, 30),
    ("HEPB", "Hépatite B", 1, 0, 7),
    ("HEPB", "Hépatite B", 2, 60, 90),
    ("HEPB", "Hépatite B", 3, 150, 210),
    ("DTC", "DTC (diphtérie, tétanos, coqueluche)", 1, 60, 90),
    ("DTC", "DTC (diphtérie, tétanos, coqueluche)", 2, 90, 120),
    ("DTC", "DTC (diphtérie, tétanos, coqueluche)", 3, 120, 150),
    ("DTC", "DTC (diphtérie, tétanos, coqueluche)", 4, 540, 730),
    ("DTC", "DTC (diphtérie, tétanos, coqueluche)", 5, 2190, 2555),
    ("POLIO", "Poliomyélite", 1, 60, 90),
    ("POLIO", "Poliomyélite", 2, 90, 120),
    ("POLIO", "Poliomyélite", 3, 120, 150),
    ("POLIO", "Poliomyélite", 4, 540, 730),
    ("POLIO", "Poliomyélite", 5, 2190, 2555),
    ("HIB", "Haemophilus influenzae b", 1, 60, 90),
    ("HIB", "Haemophilus influenzae b", 2, 90, 120),
    ("HIB", "Haemophilus influenzae b", 3, 120, 150),
    ("ROR", "ROR (rougeole, oreillons, rubéole)", 1, 365, 450),
    ("ROR", "ROR (rougeole, oreillons, rubéole)", 2, 540, 730),
];

#[derive(Debug)]
pub struct VaccinationSchedule {
    pub version: ScheduleVersion,
    pub items: Vec<ScheduleItem>,
    pub requires_doctor_review: bool,
}

/// Seeds the placeholder calendar when no schedule exists yet (first database open).
pub fn seed_default_schedule(conn: &Connection) -> AppResult<()> {
    if count(conn, "SELECT COUNT(*) FROM vaccination_schedule_versions", [])? > 0 {
        return Ok(());
    }
    let items_json: Vec<Value> = SEED_ITEMS
        .iter()
        .map(|(code, name, dose, min, max)| {
            json!({ "vaccine_code": code, "vaccine_name": name, "dose_number": dose, "age_days_min": min, "age_days_max": max })
        })
        .collect();
    let definition = json!({
        "requires_doctor_review": true,
        "disclaimer": "Jeu de données de démarrage configurable. Non validé cliniquement.",
        "items": items_json,
    })
    .to_string();

    let tx = conn.unchecked_transaction()?;
    let version_id = insert_new(
        &tx,
        "vaccination_schedule_versions",
        &cols![
            "version" => SEED_VERSION,
            "source" => SEED_SOURCE,
            "effective_from" => SEED_EFFECTIVE_FROM,
            "definition_json" => definition,
        ],
        false,
    )?;
    for (order, (code, name, dose, min, max)) in SEED_ITEMS.iter().enumerate() {
        tx.execute(
            "INSERT INTO vaccination_schedule_items
                (id, schedule_version_id, vaccine_code, vaccine_name, dose_number, age_days_min, age_days_max, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![new_id(), version_id, code, name, dose, min, max, order as i64],
        )?;
    }
    audit::log(&tx, "vaccination.seed_schedule", "vaccination_schedule", Some(&version_id), json!({ "version": SEED_VERSION }))?;
    tx.commit()?;
    Ok(())
}

pub fn get_schedule(conn: &Connection) -> AppResult<VaccinationSchedule> {
    let version = query_opt(
        conn,
        "SELECT * FROM vaccination_schedule_versions ORDER BY effective_from DESC, created_at DESC LIMIT 1",
        [],
        ScheduleVersion::from_row,
    )?
    .ok_or_else(|| AppError::not_found("Calendrier vaccinal"))?;
    let items = query_all(
        conn,
        "SELECT * FROM vaccination_schedule_items WHERE schedule_version_id = ?1 ORDER BY sort_order",
        [&version.id],
        ScheduleItem::from_row,
    )?;
    let definition: Value = serde_json::from_str(&version.definition_json)?;
    let requires_doctor_review = definition["requires_doctor_review"].as_bool() == Some(true);
    Ok(VaccinationSchedule { version, items, requires_doctor_review })
}

/// Records of a patient; an upcoming dose whose due date has passed is reported as `overdue`.
pub fn list_records(conn: &Connection, patient_id: &str) -> AppResult<Vec<Record<VaccinationData>>> {
    let today = today();
    let mut records = query_all(
        conn,
        "SELECT * FROM vaccination_records WHERE patient_id = ?1
         ORDER BY COALESCE(administered_at, next_due_at), vaccine_name, dose_number",
        [patient_id],
        Record::<VaccinationData>::from_row,
    )?;
    for record in &mut records {
        let past_due = record.data.next_due_at.as_deref().and_then(|d| d.get(..10)).is_some_and(|d| d < today.as_str());
        if record.data.status == "upcoming" && past_due {
            record.data.status = "overdue".to_string();
        }
    }
    Ok(records)
}

pub fn upsert(conn: &Connection, id: Option<&str>, data: VaccinationData) -> AppResult<Record<VaccinationData>> {
    if data.vaccine_name.trim().is_empty() {
        return Err(AppError::validation("Le nom du vaccin est obligatoire"));
    }
    if data.dose_number.is_some_and(|dose| dose < 1) {
        return Err(AppError::validation("Le numéro de dose doit être supérieur ou égal à 1"));
    }
    if !STATUSES.contains(&data.status.as_str()) {
        return Err(AppError::validation(format!("Statut de vaccination invalide : {}", data.status)));
    }
    if data.status == "done" && data.administered_at.is_none() {
        return Err(AppError::validation("La date d'administration est obligatoire pour une dose effectuée"));
    }
    patients::require_active(conn, &data.patient_id)?;

    let tx = conn.unchecked_transaction()?;
    let (record_id, action) = match id {
        Some(id) => {
            let existing: Record<VaccinationData> = get_record(&tx, "vaccination_records", id, "Vaccination")?;
            if existing.data.patient_id != data.patient_id {
                return Err(AppError::validation("Cette vaccination appartient à un autre patient"));
            }
            update_row(&tx, "vaccination_records", id, &data.columns(), true)?;
            (id.to_string(), "vaccination.update")
        }
        None => (insert_new(&tx, "vaccination_records", &data.columns(), true)?, "vaccination.create"),
    };
    audit::log(&tx, action, "vaccination_record", Some(&record_id), json!({ "patient_id": data.patient_id }))?;
    tx.commit()?;
    get_record(conn, "vaccination_records", &record_id, "Vaccination")
}
