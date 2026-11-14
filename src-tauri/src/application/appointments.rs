use chrono::{DateTime, NaiveDateTime};
use rusqlite::{Connection, Row};
use serde_json::json;

use crate::application::{audit, patients};
use crate::database::{cols, insert_new, query_all, query_opt, today, update_row};
use crate::domain::error::{AppError, AppResult};
use crate::domain::models::*;

const STATUSES: [&str; 5] = ["confirmed", "pending", "done", "cancelled", "no_show"];
const LOCAL_FORMATS: [&str; 2] = ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M"];

const VIEW_SELECT: &str = "SELECT a.*, p.prenom || ' ' || p.nom AS patient_name
    FROM appointments a JOIN patients p ON p.id = a.patient_id";

/// Appointment with the patient's display name.
#[derive(Debug)]
pub struct AppointmentView {
    pub record: Record<AppointmentData>,
    pub patient_name: String,
}

impl AppointmentView {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self { record: Record::from_row(row)?, patient_name: row.get("patient_name")? })
    }
}

fn view(conn: &Connection, id: &str) -> AppResult<AppointmentView> {
    query_opt(conn, &format!("{VIEW_SELECT} WHERE a.id = ?1"), [id], AppointmentView::from_row)?
        .ok_or_else(|| AppError::not_found("Rendez-vous"))
}

/// Appointments whose day is within `[from, to]` (dates or date-times, compared on the day), by start time.
pub fn list(conn: &Connection, from: &str, to: &str, patient_id: Option<&str>) -> AppResult<Vec<AppointmentView>> {
    query_all(
        conn,
        &format!(
            "{VIEW_SELECT}
             WHERE substr(a.starts_at, 1, 10) BETWEEN substr(?1, 1, 10) AND substr(?2, 1, 10)
               AND (?3 IS NULL OR a.patient_id = ?3)
             ORDER BY a.starts_at"
        ),
        rusqlite::params![from, to, patient_id],
        AppointmentView::from_row,
    )
}

/// Next confirmed / pending appointment of a patient, from today on.
pub fn next_for_patient(conn: &Connection, patient_id: &str) -> AppResult<Option<AppointmentView>> {
    query_opt(
        conn,
        &format!(
            "{VIEW_SELECT}
             WHERE a.patient_id = ?1 AND substr(a.starts_at, 1, 10) >= ?2 AND a.status IN ('confirmed', 'pending')
             ORDER BY a.starts_at LIMIT 1"
        ),
        rusqlite::params![patient_id, today()],
        AppointmentView::from_row,
    )
}

fn validate(data: &AppointmentData) -> AppResult<()> {
    let valid_start = DateTime::parse_from_rfc3339(&data.starts_at).is_ok()
        || LOCAL_FORMATS.iter().any(|f| NaiveDateTime::parse_from_str(&data.starts_at, f).is_ok());
    if !valid_start {
        return Err(AppError::validation("Date et heure du rendez-vous invalides (AAAA-MM-JJTHH:MM)"));
    }
    if !(5..=480).contains(&data.duration_minutes) {
        return Err(AppError::validation("La durée doit être comprise entre 5 et 480 minutes"));
    }
    if !STATUSES.contains(&data.status.as_str()) {
        return Err(AppError::validation(format!("Statut de rendez-vous invalide : {}", data.status)));
    }
    Ok(())
}

pub fn create(conn: &Connection, data: AppointmentData) -> AppResult<AppointmentView> {
    validate(&data)?;
    patients::require_active(conn, &data.patient_id)?;
    let tx = conn.unchecked_transaction()?;
    let id = insert_new(&tx, "appointments", &data.columns(), true)?;
    audit::log(&tx, "appointment.create", "appointment", Some(&id), json!({ "patient_id": data.patient_id }))?;
    tx.commit()?;
    view(conn, &id)
}

pub fn update(conn: &Connection, id: &str, data: AppointmentData) -> AppResult<AppointmentView> {
    validate(&data)?;
    if view(conn, id)?.record.data.patient_id != data.patient_id {
        return Err(AppError::validation("Un rendez-vous ne peut pas être transféré à un autre patient"));
    }
    let tx = conn.unchecked_transaction()?;
    update_row(&tx, "appointments", id, &data.columns(), true)?;
    audit::log(&tx, "appointment.update", "appointment", Some(id), json!({}))?;
    tx.commit()?;
    view(conn, id)
}

pub fn cancel(conn: &Connection, id: &str) -> AppResult<AppointmentView> {
    if view(conn, id)?.record.data.status == "cancelled" {
        return Err(AppError::Conflict("Ce rendez-vous est déjà annulé".into()));
    }
    let tx = conn.unchecked_transaction()?;
    update_row(&tx, "appointments", id, &cols!["status" => "cancelled"], true)?;
    audit::log(&tx, "appointment.cancel", "appointment", Some(id), json!({}))?;
    tx.commit()?;
    view(conn, id)
}
