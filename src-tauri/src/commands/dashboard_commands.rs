use tauri::State;

use crate::AppState;
use crate::application::dashboard::{self, DashboardStats};
use crate::commands::secured;

#[tauri::command]
pub async fn get_dashboard_stats(state: State<'_, AppState>) -> Result<DashboardStats, String> {
    secured(&state, |c| dashboard::stats(c.conn))
}
