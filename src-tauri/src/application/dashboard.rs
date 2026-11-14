use rusqlite::Connection;
use serde::Serialize;

use crate::application::patients::{self, PatientSummary};
use crate::database::{count, today};
use crate::domain::error::AppResult;

const RECENT_PATIENTS: i64 = 5;

/// Shape expected by the frontend `DashboardStats`.
#[derive(Debug, Serialize)]
pub struct DashboardStats {
    pub patients_total: i64,
    pub consultations_today: i64,
    pub appointments_today: i64,
    pub draft_consultations: i64,
    pub overdue_vaccinations: i64,
    pub recent_patients: Vec<PatientSummary>,
}

pub fn stats(conn: &Connection) -> AppResult<DashboardStats> {
    let today = today();
    Ok(DashboardStats {
        patients_total: count(conn, "SELECT COUNT(*) FROM patients WHERE archived_at IS NULL", [])?,
        consultations_today: count(
            conn,
            "SELECT COUNT(*) FROM consultations WHERE substr(consulted_at, 1, 10) = ?1",
            [&today],
        )?,
        appointments_today: count(
            conn,
            "SELECT COUNT(*) FROM appointments WHERE substr(starts_at, 1, 10) = ?1 AND status <> 'cancelled'",
            [&today],
        )?,
        draft_consultations: count(conn, "SELECT COUNT(*) FROM consultations WHERE status = 'draft'", [])?,
        overdue_vaccinations: count(
            conn,
            "SELECT COUNT(*) FROM vaccination_records r JOIN patients p ON p.id = r.patient_id
             WHERE p.archived_at IS NULL
               AND (r.status = 'overdue'
                    OR (r.status = 'upcoming' AND r.next_due_at IS NOT NULL AND substr(r.next_due_at, 1, 10) < ?1))",
            [&today],
        )?,
        recent_patients: patients::recent(conn, RECENT_PATIENTS)?,
    })
}
