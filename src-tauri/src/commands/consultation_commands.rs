use tauri::State;

use crate::AppState;
use crate::application::consultations::{self, ConsultationSummary};
use crate::commands::secured;
use crate::ipc::consultations::{Consultation, ConsultationDetail, ConsultationInput};

#[tauri::command]
pub async fn list_consultations(
    state: State<'_, AppState>,
    patient_id: Option<String>,
    status: Option<String>,
) -> Result<Vec<ConsultationSummary>, String> {
    secured(&state, |c| consultations::list_summaries(c.conn, patient_id.as_deref(), status.as_deref(), None))
}

#[tauri::command]
pub async fn get_consultation(
    state: State<'_, AppState>,
    consultation_id: String,
) -> Result<ConsultationDetail, String> {
    secured(&state, |c| consultations::get(c.conn, &consultation_id)).map(Into::into)
}

#[tauri::command]
pub async fn create_consultation(
    state: State<'_, AppState>,
    input: ConsultationInput,
) -> Result<Consultation, String> {
    secured(&state, |c| consultations::create(c.conn, input.into())).map(Into::into)
}

#[tauri::command]
pub async fn update_draft_consultation(
    state: State<'_, AppState>,
    consultation_id: String,
    input: ConsultationInput,
) -> Result<Consultation, String> {
    secured(&state, |c| consultations::update_draft(c.conn, &consultation_id, input.into())).map(Into::into)
}

#[tauri::command]
pub async fn finalize_consultation(
    state: State<'_, AppState>,
    consultation_id: String,
) -> Result<Consultation, String> {
    secured(&state, |c| consultations::finalize(c.conn, &consultation_id)).map(Into::into)
}

/// Records every changed field (old / new value) with the shared `reason`, then applies `input`.
#[tauri::command]
pub async fn amend_consultation(
    state: State<'_, AppState>,
    consultation_id: String,
    reason: String,
    input: ConsultationInput,
) -> Result<Consultation, String> {
    secured(&state, |c| consultations::amend(c.conn, &consultation_id, &reason, input.into())).map(Into::into)
}
