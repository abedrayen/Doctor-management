use tauri::State;

use crate::AppState;
use crate::application::{patients, vaccinations};
use crate::commands::secured;
use crate::ipc::vaccinations::{VaccinationRecord, VaccinationRecordInput, VaccinationSchedule};

#[tauri::command]
pub async fn list_vaccination_records(
    state: State<'_, AppState>,
    patient_id: String,
) -> Result<Vec<VaccinationRecord>, String> {
    secured(&state, |c| vaccinations::list_records(c.conn, &patient_id))
        .map(|records| records.into_iter().map(Into::into).collect())
}

/// Creates the record when `record_id` is null, updates it otherwise.
#[tauri::command]
pub async fn upsert_vaccination_record(
    state: State<'_, AppState>,
    record_id: Option<String>,
    input: VaccinationRecordInput,
) -> Result<VaccinationRecord, String> {
    secured(&state, |c| vaccinations::upsert(c.conn, record_id.as_deref(), input.into())).map(Into::into)
}

/// Reference calendar with due dates computed from the patient's birth date.
#[tauri::command]
pub async fn get_vaccination_schedule(
    state: State<'_, AppState>,
    patient_id: String,
) -> Result<VaccinationSchedule, String> {
    secured(&state, |c| {
        let (_, birth) = patients::birth_info(c.conn, &patient_id)?;
        Ok(VaccinationSchedule::for_patient(vaccinations::get_schedule(c.conn)?, birth))
    })
}
