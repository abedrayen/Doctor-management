use tauri::State;

use crate::AppState;
use crate::application::settings;
use crate::commands::secured;
use crate::ipc::settings::{AppSettings, SettingsInput};

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    secured(&state, |c| AppSettings::from_store(c.conn, settings::get(c.conn)?))
}

#[tauri::command]
pub async fn update_settings(state: State<'_, AppState>, input: SettingsInput) -> Result<AppSettings, String> {
    secured(&state, |c| AppSettings::from_store(c.conn, settings::update(c.conn, input.into_map())?))
}
