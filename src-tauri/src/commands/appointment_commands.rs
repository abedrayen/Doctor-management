use tauri::State;

use crate::AppState;
use crate::application::appointments;
use crate::commands::secured;
use crate::ipc::appointments::{Appointment, AppointmentInput};

#[tauri::command]
pub async fn list_appointments(
    state: State<'_, AppState>,
    from: String,
    to: String,
    patient_id: Option<String>,
) -> Result<Vec<Appointment>, String> {
    secured(&state, |c| appointments::list(c.conn, &from, &to, patient_id.as_deref()))
        .map(|views| views.into_iter().map(Into::into).collect())
}

#[tauri::command]
pub async fn create_appointment(state: State<'_, AppState>, input: AppointmentInput) -> Result<Appointment, String> {
    secured(&state, |c| appointments::create(c.conn, input.into())).map(Into::into)
}

#[tauri::command]
pub async fn update_appointment(
    state: State<'_, AppState>,
    appointment_id: String,
    input: AppointmentInput,
) -> Result<Appointment, String> {
    secured(&state, |c| appointments::update(c.conn, &appointment_id, input.into())).map(Into::into)
}

#[tauri::command]
pub async fn cancel_appointment(state: State<'_, AppState>, appointment_id: String) -> Result<Appointment, String> {
    secured(&state, |c| appointments::cancel(c.conn, &appointment_id)).map(Into::into)
}
