use chrono::NaiveDate;
use rusqlite::{Connection, Row, params_from_iter, types::ToSql};
use serde::Serialize;
use serde_json::json;

use crate::application::appointments::{self, AppointmentView};
use crate::application::consultations::{self, ConsultationSummary};
use crate::application::{audit, growth, vaccinations};
use crate::database::{cols, count, insert_new, list_records, now, query_all, query_opt, replace_children, update_row};
use crate::domain::error::{AppError, AppResult};
use crate::domain::models::*;

/// Read model of a patient row in lists (shape expected by the frontend `PatientSummary`).
#[derive(Debug, Serialize)]
pub struct PatientSummary {
    pub id: String,
    pub reference: String,
    pub nom: String,
    pub prenom: String,
    pub date_naissance: String,
    pub sexe: String,
    pub telephone: Option<String>,
    pub derniere_consultation: Option<String>,
    pub archived: bool,
}

impl PatientSummary {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            reference: row.get("reference")?,
            nom: row.get("nom")?,
            prenom: row.get("prenom")?,
            date_naissance: row.get("date_naissance")?,
            sexe: row.get("sexe")?,
            telephone: row.get("telephone")?,
            derniere_consultation: row.get("derniere_consultation")?,
            archived: row.get("archived")?,
        })
    }
}

#[derive(Debug)]
pub struct PatientOverview {
    pub detail: PatientDetail,
    pub consultation_count: i64,
    pub documents_count: i64,
    pub overdue_vaccinations: i64,
    pub last_consultation: Option<ConsultationSummary>,
    pub last_measurement: Option<Record<GrowthData>>,
    pub next_appointment: Option<AppointmentView>,
}

const SUMMARY_SELECT: &str = "SELECT p.id, p.reference, p.nom, p.prenom, p.date_naissance, p.sexe,
    (SELECT COALESCE(c.telephone_principal, c.telephone_secondaire)
       FROM parent_contacts c WHERE c.patient_id = p.id LIMIT 1) AS telephone,
    (SELECT MAX(x.consulted_at) FROM consultations x WHERE x.patient_id = p.id) AS derniere_consultation,
    p.archived_at IS NOT NULL AS archived
    FROM patients p";

/// Whitespace-separated terms, all of which must match name, reference or a phone number.
pub fn list(conn: &Connection, query: &str, include_archived: bool, limit: Option<i64>) -> AppResult<Vec<PatientSummary>> {
    let tokens: Vec<String> = query.split_whitespace().map(|t| format!("%{t}%")).collect();
    // A negative LIMIT means "no limit" in SQLite.
    let limit = limit.unwrap_or(-1);
    let mut params: Vec<&dyn ToSql> = tokens.iter().map(|t| t as &dyn ToSql).collect();
    params.push(&limit);

    let mut clauses: Vec<String> = Vec::new();
    if !include_archived {
        clauses.push("p.archived_at IS NULL".to_string());
    }
    for i in 1..=tokens.len() {
        clauses.push(format!(
            "(p.nom LIKE ?{i} OR p.prenom LIKE ?{i} OR p.reference LIKE ?{i} OR EXISTS (
                SELECT 1 FROM parent_contacts c WHERE c.patient_id = p.id
                AND (c.telephone_principal LIKE ?{i} OR c.telephone_secondaire LIKE ?{i})))"
        ));
    }
    let where_sql = if clauses.is_empty() { String::new() } else { format!(" WHERE {}", clauses.join(" AND ")) };
    query_all(
        conn,
        &format!(
            "{SUMMARY_SELECT}{where_sql} ORDER BY p.nom COLLATE NOCASE, p.prenom COLLATE NOCASE LIMIT ?{}",
            tokens.len() + 1
        ),
        params_from_iter(params),
        PatientSummary::from_row,
    )
}

/// Most recently created active patients.
pub fn recent(conn: &Connection, limit: i64) -> AppResult<Vec<PatientSummary>> {
    query_all(
        conn,
        &format!("{SUMMARY_SELECT} WHERE p.archived_at IS NULL ORDER BY p.created_at DESC LIMIT ?1"),
        [limit],
        PatientSummary::from_row,
    )
}

fn find_patient(conn: &Connection, id: &str) -> AppResult<PatientRecord> {
    query_opt(conn, "SELECT * FROM patients WHERE id = ?1", [id], PatientRecord::from_row)?
        .ok_or_else(|| AppError::not_found("Patient"))
}

fn find_by_patient<T: Model>(conn: &Connection, table: &str, patient_id: &str) -> AppResult<Option<Record<T>>> {
    query_opt(
        conn,
        &format!("SELECT * FROM {table} WHERE patient_id = ?1"),
        [patient_id],
        Record::<T>::from_row,
    )
}

pub fn get(conn: &Connection, id: &str) -> AppResult<PatientDetail> {
    Ok(PatientDetail {
        patient: find_patient(conn, id)?,
        contact: find_by_patient(conn, "parent_contacts", id)?,
        history: find_by_patient(conn, "patient_medical_histories", id)?,
        notes: list_records(conn, "patient_notes", "patient_id", id, "created_at DESC")?,
    })
}

pub fn parse_date(value: &str) -> AppResult<NaiveDate> {
    value
        .get(..10)
        .and_then(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
        .ok_or_else(|| AppError::validation(format!("Date invalide : {value}")))
}

/// Sex (`M`/`F`) and birth date of a patient.
pub fn birth_info(conn: &Connection, patient_id: &str) -> AppResult<(String, NaiveDate)> {
    let (sexe, birth): (String, String) = query_opt(
        conn,
        "SELECT sexe, date_naissance FROM patients WHERE id = ?1",
        [patient_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?
    .ok_or_else(|| AppError::not_found("Patient"))?;
    Ok((sexe, parse_date(&birth)?))
}

fn normalize(form: &mut PatientForm) -> AppResult<()> {
    let p = &mut form.patient;
    p.nom = p.nom.trim().to_string();
    p.prenom = p.prenom.trim().to_string();
    if p.nom.is_empty() || p.prenom.is_empty() {
        return Err(AppError::validation("Le nom et le prénom sont obligatoires"));
    }
    if p.sexe != "M" && p.sexe != "F" {
        return Err(AppError::validation("Le sexe doit être « M » ou « F »"));
    }
    let birth = NaiveDate::parse_from_str(&p.date_naissance, "%Y-%m-%d")
        .map_err(|_| AppError::validation("Date de naissance invalide (format AAAA-MM-JJ)"))?;
    if birth > chrono::Local::now().date_naive() {
        return Err(AppError::validation("La date de naissance ne peut pas être dans le futur"));
    }
    Ok(())
}

/// Insert-or-update of a one-to-one child row (contact, medical history).
fn upsert_one<T: Model>(conn: &Connection, table: &str, patient_id: &str, data: &T) -> AppResult<()> {
    let existing: Option<String> =
        query_opt(conn, &format!("SELECT id FROM {table} WHERE patient_id = ?1"), [patient_id], |r| r.get(0))?;
    let mut columns = data.columns();
    match existing {
        Some(id) => update_row(conn, table, &id, &columns, true)?,
        None => {
            columns.push(("patient_id", &patient_id));
            insert_new(conn, table, &columns, true)?;
        }
    }
    Ok(())
}

fn save_related(conn: &Connection, patient_id: &str, form: &PatientForm) -> AppResult<()> {
    upsert_one(conn, "parent_contacts", patient_id, &form.contact)?;
    upsert_one(conn, "patient_medical_histories", patient_id, &form.history)?;
    replace_children(conn, "patient_notes", patient_id, &form.notes, true)
}

fn next_reference(conn: &Connection) -> AppResult<String> {
    let next = count(conn, "SELECT COUNT(*) FROM patients", [])? + 1;
    Ok(format!("P{}-{next:05}", chrono::Local::now().format("%Y")))
}

pub fn create(conn: &Connection, mut form: PatientForm) -> AppResult<PatientDetail> {
    normalize(&mut form)?;
    let tx = conn.unchecked_transaction()?;
    let reference = next_reference(&tx)?;
    let mut columns = form.patient.columns();
    columns.push(("reference", &reference));
    let id = insert_new(&tx, "patients", &columns, true)?;
    save_related(&tx, &id, &form)?;
    audit::log(&tx, "patient.create", "patient", Some(&id), json!({ "reference": reference }))?;
    tx.commit()?;
    get(conn, &id)
}

pub fn update(conn: &Connection, id: &str, mut form: PatientForm) -> AppResult<PatientDetail> {
    normalize(&mut form)?;
    if find_patient(conn, id)?.meta.archived_at.is_some() {
        return Err(AppError::Conflict("Ce dossier est archivé et ne peut pas être modifié".into()));
    }
    let tx = conn.unchecked_transaction()?;
    update_row(&tx, "patients", id, &form.patient.columns(), true)?;
    save_related(&tx, id, &form)?;
    audit::log(&tx, "patient.update", "patient", Some(id), json!({}))?;
    tx.commit()?;
    get(conn, id)
}

/// Soft archive (`archived = true`) or restore (`archived = false`) a patient file.
pub fn set_archived(conn: &Connection, id: &str, archived: bool) -> AppResult<()> {
    if find_patient(conn, id)?.meta.archived_at.is_some() == archived {
        let message = if archived { "Ce dossier est déjà archivé" } else { "Ce dossier n'est pas archivé" };
        return Err(AppError::Conflict(message.to_string()));
    }
    let archived_at = archived.then(now);
    let tx = conn.unchecked_transaction()?;
    update_row(&tx, "patients", id, &cols!["archived_at" => archived_at], true)?;
    let action = if archived { "patient.archive" } else { "patient.unarchive" };
    audit::log(&tx, action, "patient", Some(id), json!({}))?;
    tx.commit()?;
    Ok(())
}

/// Same birth date and (same surname or same first name), or same full name. Archived patients included.
pub fn find_possible_duplicates(
    conn: &Connection,
    nom: &str,
    prenom: &str,
    date_naissance: &str,
    exclude_id: Option<&str>,
) -> AppResult<Vec<PatientSummary>> {
    query_all(
        conn,
        &format!(
            "{SUMMARY_SELECT} WHERE p.id <> COALESCE(?4, '')
             AND ((p.date_naissance = ?3 AND (LOWER(p.nom) = LOWER(?1) OR LOWER(p.prenom) = LOWER(?2)))
                  OR (LOWER(p.nom) = LOWER(?1) AND LOWER(p.prenom) = LOWER(?2)))
             ORDER BY p.nom COLLATE NOCASE, p.prenom COLLATE NOCASE"
        ),
        rusqlite::params![nom.trim(), prenom.trim(), date_naissance, exclude_id],
        PatientSummary::from_row,
    )
}

pub fn overview(conn: &Connection, id: &str) -> AppResult<PatientOverview> {
    let overdue_vaccinations = vaccinations::list_records(conn, id)?
        .iter()
        .filter(|record| record.data.status == "overdue")
        .count() as i64;
    Ok(PatientOverview {
        detail: get(conn, id)?,
        consultation_count: count(conn, "SELECT COUNT(*) FROM consultations WHERE patient_id = ?1", [id])?,
        documents_count: count(
            conn,
            "SELECT COUNT(*) FROM patient_documents WHERE patient_id = ?1 AND archived_at IS NULL",
            [id],
        )?,
        overdue_vaccinations,
        last_consultation: consultations::list_summaries(conn, Some(id), None, Some(1))?.into_iter().next(),
        last_measurement: growth::latest(conn, id)?,
        next_appointment: appointments::next_for_patient(conn, id)?,
    })
}

/// Ensures the patient exists and is not archived (used before attaching new clinical data).
pub fn require_active(conn: &Connection, id: &str) -> AppResult<()> {
    if find_patient(conn, id)?.meta.archived_at.is_some() {
        return Err(AppError::Conflict("Ce dossier est archivé".into()));
    }
    Ok(())
}
