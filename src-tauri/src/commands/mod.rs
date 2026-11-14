//! Tauri command layer: thin wrappers mapping `AppError` to `String`.
//!
//! Lock order (deadlock-free): `session` is only held alone or after `db`; `db_key` before `db`.

pub mod appointment_commands;
pub mod auth_commands;
pub mod backup_commands;
pub mod consultation_commands;
pub mod dashboard_commands;
pub mod document_commands;
pub mod growth_commands;
pub mod patient_commands;
pub mod settings_commands;
pub mod vaccination_commands;

use rusqlite::Connection;

use crate::AppState;
use crate::domain::error::{AppError, AppResult};
use crate::infrastructure::paths::AppPaths;
use crate::security::session::Session;

/// Everything a protected command may need.
pub struct Ctx<'a> {
    pub conn: &'a mut Connection,
    pub paths: &'a AppPaths,
    /// Database key (documents are encrypted with a key derived from it).
    pub key: &'a [u8],
}

fn not_initialized() -> AppError {
    AppError::Internal("Base de données non initialisée".into())
}

/// Runs `f` only if the session is authenticated and unlocked.
pub fn secured<T>(state: &AppState, f: impl FnOnce(&mut Ctx<'_>) -> AppResult<T>) -> Result<T, String> {
    let run = || -> AppResult<T> {
        state.session.lock().require_active().map(|_| ())?;
        let key = state.db_key.lock();
        let key = key.as_ref().ok_or_else(not_initialized)?;
        let mut db = state.db.lock();
        let conn = db.as_mut().ok_or_else(not_initialized)?;
        f(&mut Ctx { conn, paths: &state.paths, key })
    };
    run().map_err(String::from)
}

/// Runs `f` without requiring an active session (setup, login, unlock, logout...).
pub fn public<T>(state: &AppState, f: impl FnOnce(&Connection, &mut Session) -> AppResult<T>) -> Result<T, String> {
    let run = || -> AppResult<T> {
        let db = state.db.lock();
        let conn = db.as_ref().ok_or_else(not_initialized)?;
        let mut session = state.session.lock();
        f(conn, &mut session)
    };
    run().map_err(String::from)
}
