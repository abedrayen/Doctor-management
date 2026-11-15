use rusqlite::{Connection, Row};
use serde::Serialize;
use serde_json::{Value, json};

use crate::application::{audit, growth, patients};
use crate::database::{cols, insert_new, list_records, now, query_all, query_opt, update_row};
use crate::domain::error::{AppError, AppResult};
use crate::domain::models::*;

/// Values accepted for `type_consultation` (shared with the frontend enum).
const CONSULTATION_TYPES: [&str; 5] = ["consultation", "controle", "urgence", "vaccination", "certificat"];

/// Read model of a consultation row in lists (shape expected by the frontend `ConsultationSummary`).
#[derive(Debug, Serialize)]
pub struct ConsultationSummary {
    pub id: String,
    pub patient_id: String,
    pub patient_name: String,
    pub consulted_at: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub motif: String,
    pub diagnostic: String,
    pub status: String,
}

impl ConsultationSummary {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            patient_id: row.get("patient_id")?,
            patient_name: row.get("patient_name")?,
            consulted_at: row.get("consulted_at")?,
            kind: row.get("kind")?,
            motif: row.get("motif")?,
            diagnostic: row.get("diagnostic")?,
            status: row.get("status")?,
        })
    }
}

fn detail(conn: &Connection, id: &str) -> AppResult<ConsultationDetail> {
    let (record, state, patient_name) = query_opt(
        conn,
        "SELECT c.*, p.prenom || ' ' || p.nom AS patient_name
         FROM consultations c JOIN patients p ON p.id = c.patient_id WHERE c.id = ?1",
        [id],
        |r| {
            Ok((
                Record::<ConsultationData>::from_row(r)?,
                ConsultationState::from_row(r)?,
                r.get::<_, String>("patient_name")?,
            ))
        },
    )?
    .ok_or_else(|| AppError::not_found("Consultation"))?;
    Ok(ConsultationDetail {
        record,
        state,
        patient_name,
        amendments: list_records(conn, "consultation_amendments", "consultation_id", id, "rowid")?,
    })
}

pub fn get(conn: &Connection, id: &str) -> AppResult<ConsultationDetail> {
    detail(conn, id)
}

/// Most recent first; every filter is optional (`limit = None` returns everything).
pub fn list_summaries(
    conn: &Connection,
    patient_id: Option<&str>,
    status: Option<&str>,
    limit: Option<i64>,
) -> AppResult<Vec<ConsultationSummary>> {
    query_all(
        conn,
        // A negative LIMIT means "no limit" in SQLite.
        "SELECT c.id, c.patient_id, p.prenom || ' ' || p.nom AS patient_name, c.consulted_at,
                COALESCE(c.type_consultation, '') AS kind, COALESCE(c.motif, '') AS motif,
                COALESCE(c.diagnostic, '') AS diagnostic, c.status
         FROM consultations c JOIN patients p ON p.id = c.patient_id
         WHERE (?1 IS NULL OR c.patient_id = ?1) AND (?2 IS NULL OR c.status = ?2)
         ORDER BY c.consulted_at DESC, c.created_at DESC LIMIT ?3",
        rusqlite::params![patient_id, status, limit.unwrap_or(-1)],
        ConsultationSummary::from_row,
    )
}

fn validate(data: &ConsultationData) -> AppResult<()> {
    if data.consulted_at.trim().is_empty() {
        return Err(AppError::validation("La date de consultation est obligatoire"));
    }
    match data.type_consultation.as_deref() {
        Some(kind) if CONSULTATION_TYPES.contains(&kind) => {}
        _ => return Err(AppError::validation("Type de consultation invalide")),
    }
    for (label, value) in [
        ("Le poids", data.poids_kg),
        ("La taille", data.taille_cm),
        ("Le périmètre crânien", data.perimetre_cranien_cm),
    ] {
        if value.is_some_and(|v| v <= 0.0) {
            return Err(AppError::validation(format!("{label} doit être positif")));
        }
    }
    if data.temperature_c.is_some_and(|t| !(30.0..=45.0).contains(&t)) {
        return Err(AppError::validation("Température invalide (30 à 45 °C)"));
    }
    Ok(())
}

pub fn create(conn: &Connection, data: ConsultationData) -> AppResult<ConsultationDetail> {
    validate(&data)?;
    patients::require_active(conn, &data.patient_id)?;
    let tx = conn.unchecked_transaction()?;
    let id = insert_new(&tx, "consultations", &data.columns(), true)?;
    audit::log(&tx, "consultation.create", "consultation", Some(&id), json!({ "patient_id": data.patient_id }))?;
    tx.commit()?;
    detail(conn, &id)
}

fn require_status(conn: &Connection, id: &str, expected: &str) -> AppResult<()> {
    let status = detail(conn, id)?.state.status;
    if status == expected {
        return Ok(());
    }
    let message = if status == "finalized" {
        "Consultation finalisée : seuls les amendements tracés sont autorisés"
    } else {
        "La consultation n'est pas encore finalisée"
    };
    Err(AppError::Conflict(message.to_string()))
}

pub fn update_draft(conn: &Connection, id: &str, data: ConsultationData) -> AppResult<ConsultationDetail> {
    validate(&data)?;
    require_status(conn, id, "draft")?;
    let tx = conn.unchecked_transaction()?;
    update_row(&tx, "consultations", id, &data.columns(), true)?;
    audit::log(&tx, "consultation.update_draft", "consultation", Some(id), json!({}))?;
    tx.commit()?;
    detail(conn, id)
}

pub fn finalize(conn: &Connection, id: &str) -> AppResult<ConsultationDetail> {
    require_status(conn, id, "draft")?;
    let current = detail(conn, id)?;
    if current.record.data.motif.as_deref().is_none_or(|m| m.trim().is_empty()) {
        return Err(AppError::validation("Le motif est obligatoire pour finaliser la consultation"));
    }
    let tx = conn.unchecked_transaction()?;
    update_row(&tx, "consultations", id, &cols!["status" => "finalized", "finalized_at" => now()], true)?;
    audit::log(&tx, "consultation.finalize", "consultation", Some(id), json!({}))?;
    tx.commit()?;
    let data = &current.record.data;
    growth::upsert_from_vitals(
        conn,
        &data.patient_id,
        &data.consulted_at,
        data.poids_kg,
        data.taille_cm,
        data.perimetre_cranien_cm,
    )?;
    detail(conn, id)
}

fn as_text(value: &Value) -> Option<String> {
    match value {
        Value::Null => None,
        Value::String(text) => Some(text.clone()),
        other => Some(other.to_string()),
    }
}

/// Traced correction of a finalized consultation: every changed field is recorded in
/// `consultation_amendments` (old value, new value, shared reason), then the row is updated.
pub fn amend(conn: &Connection, id: &str, reason: &str, new_data: ConsultationData) -> AppResult<ConsultationDetail> {
    require_status(conn, id, "finalized")?;
    validate(&new_data)?;
    if reason.trim().is_empty() {
        return Err(AppError::validation("Le motif de l'amendement est obligatoire"));
    }
    let current = detail(conn, id)?.record.data;
    if current.patient_id != new_data.patient_id {
        return Err(AppError::validation("Le patient d'une consultation ne peut pas être modifié"));
    }

    let (Value::Object(old), Value::Object(new)) = (serde_json::to_value(&current)?, serde_json::to_value(&new_data)?)
    else {
        return Err(AppError::Internal("Représentation de consultation invalide".into()));
    };
    let changes: Vec<(&String, Option<String>, Option<String>)> = old
        .iter()
        .filter_map(|(field, old_value)| {
            let new_value = new.get(field)?;
            (old_value != new_value).then(|| (field, as_text(old_value), as_text(new_value)))
        })
        .collect();
    if changes.is_empty() {
        return Err(AppError::validation("Aucune modification à enregistrer"));
    }

    let tx = conn.unchecked_transaction()?;
    for (field, old_value, new_value) in &changes {
        insert_new(
            &tx,
            "consultation_amendments",
            &cols![
                "consultation_id" => id,
                "field_name" => field,
                "old_value" => old_value,
                "new_value" => new_value,
                "reason" => reason.trim(),
            ],
            false,
        )?;
    }
    update_row(&tx, "consultations", id, &new_data.columns(), true)?;
    let fields: Vec<&String> = changes.iter().map(|(field, _, _)| *field).collect();
    audit::log(&tx, "consultation.amend", "consultation", Some(id), json!({ "fields": fields }))?;
    tx.commit()?;
    growth::upsert_from_vitals(
        conn,
        &new_data.patient_id,
        &new_data.consulted_at,
        new_data.poids_kg,
        new_data.taille_cm,
        new_data.perimetre_cranien_cm,
    )?;
    detail(conn, id)
}
