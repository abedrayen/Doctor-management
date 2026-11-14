use tauri::State;

use crate::AppState;
use crate::application::growth;
use crate::commands::secured;
use crate::ipc::growth::{GrowthChartData, GrowthMeasurement, GrowthMeasurementInput};

#[tauri::command]
pub async fn list_growth_measurements(
    state: State<'_, AppState>,
    patient_id: String,
) -> Result<Vec<GrowthMeasurement>, String> {
    secured(&state, |c| growth::list(c.conn, &patient_id))
        .map(|records| records.into_iter().map(Into::into).collect())
}

#[tauri::command]
pub async fn add_growth_measurement(
    state: State<'_, AppState>,
    input: GrowthMeasurementInput,
) -> Result<GrowthMeasurement, String> {
    secured(&state, |c| growth::add(c.conn, input.into())).map(Into::into)
}

/// Hard delete for mistaken entries only; the removed values are kept in the audit log.
#[tauri::command]
pub async fn delete_growth_measurement(state: State<'_, AppState>, measurement_id: String) -> Result<(), String> {
    secured(&state, |c| growth::delete(c.conn, &measurement_id))
}

#[tauri::command]
pub async fn get_growth_chart_data(
    state: State<'_, AppState>,
    patient_id: String,
) -> Result<GrowthChartData, String> {
    secured(&state, |c| growth::chart(c.conn, &patient_id)).map(Into::into)
}
