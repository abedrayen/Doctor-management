use tauri::State;

use crate::AppState;
use crate::application::auth;
use crate::commands::public;
use crate::ipc::auth::{DoctorDto, SetupInput};

#[tauri::command]
pub async fn is_setup_required(state: State<'_, AppState>) -> Result<bool, String> {
    public(&state, |conn, _| auth::is_setup_required(conn))
}

/// First launch only. Starts the session on success.
#[tauri::command]
pub async fn setup_doctor(state: State<'_, AppState>, input: SetupInput) -> Result<DoctorDto, String> {
    public(&state, |conn, session| {
        let specialty = Some(input.specialty.trim()).filter(|s| !s.is_empty());
        auth::setup_doctor(conn, session, &input.display_name, specialty, &input.password)
    })
    .map(Into::into)
}

#[tauri::command]
pub async fn login(state: State<'_, AppState>, password: String) -> Result<DoctorDto, String> {
    public(&state, |conn, session| auth::login(conn, session, &password)).map(Into::into)
}

#[tauri::command]
pub async fn logout(state: State<'_, AppState>) -> Result<(), String> {
    public(&state, |conn, session| auth::logout(conn, session))
}

/// Called by the frontend after the inactivity timeout: the session stays but requires the password again.
#[tauri::command]
pub async fn lock_session(state: State<'_, AppState>) -> Result<(), String> {
    let mut session = state.session.lock();
    session.lock();
    Ok(())
}

#[tauri::command]
pub async fn unlock_session(state: State<'_, AppState>, password: String) -> Result<(), String> {
    public(&state, |conn, session| auth::unlock(conn, session, &password))
}

/// `null` when nobody is logged in (or the session is locked).
#[tauri::command]
pub async fn get_current_doctor(state: State<'_, AppState>) -> Result<Option<DoctorDto>, String> {
    public(&state, |conn, session| auth::current_doctor(conn, session)).map(|doctor| doctor.map(Into::into))
}

#[tauri::command]
pub async fn change_password(
    state: State<'_, AppState>,
    current_password: String,
    new_password: String,
) -> Result<(), String> {
    public(&state, |conn, session| auth::change_password(conn, session, &current_password, &new_password))
}
