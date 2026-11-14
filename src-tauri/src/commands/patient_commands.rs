use tauri::State;

use crate::AppState;
use crate::application::patients::{self, PatientSummary};
use crate::commands::secured;
use crate::ipc::patients::{Patient, PatientInput, PatientOverview};

#[tauri::command]
pub async fn list_patients(
    state: State<'_, AppState>,
    query: String,
    include_archived: bool,
    limit: Option<i64>,
) -> Result<Vec<PatientSummary>, String> {
    secured(&state, |c| patients::list(c.conn, &query, include_archived, limit))
}

#[tauri::command]
pub async fn get_patient(state: State<'_, AppState>, patient_id: String) -> Result<Patient, String> {
    secured(&state, |c| patients::get(c.conn, &patient_id)).map(Into::into)
}

#[tauri::command]
pub async fn create_patient(state: State<'_, AppState>, input: PatientInput) -> Result<Patient, String> {
    secured(&state, |c| patients::create(c.conn, input.into_form())).map(Into::into)
}

#[tauri::command]
pub async fn update_patient(
    state: State<'_, AppState>,
    patient_id: String,
    input: PatientInput,
) -> Result<Patient, String> {
    secured(&state, |c| patients::update(c.conn, &patient_id, input.into_form())).map(Into::into)
}

/// Soft archive (`archived = true`) or restore (`archived = false`).
#[tauri::command]
pub async fn archive_patient(state: State<'_, AppState>, patient_id: String, archived: bool) -> Result<(), String> {
    secured(&state, |c| patients::set_archived(c.conn, &patient_id, archived))
}

/// `patient_id` (optional) excludes the patient being edited from the matches.
#[tauri::command]
pub async fn find_possible_duplicates(
    state: State<'_, AppState>,
    input: PatientInput,
    patient_id: Option<String>,
) -> Result<Vec<PatientSummary>, String> {
    secured(&state, |c| {
        patients::find_possible_duplicates(
            c.conn,
            &input.nom,
            &input.prenom,
            &input.date_naissance,
            patient_id.as_deref(),
        )
    })
}

#[tauri::command]
pub async fn get_patient_overview(
    state: State<'_, AppState>,
    patient_id: String,
) -> Result<PatientOverview, String> {
    secured(&state, |c| patients::overview(c.conn, &patient_id)).map(Into::into)
}
