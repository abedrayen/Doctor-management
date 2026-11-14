use tauri::State;

use crate::AppState;
use crate::backup;
use crate::commands::secured;
use crate::ipc::backup::BackupEntry;

/// `dest_path` (optional): target file or directory; defaults to the application's `backups` folder.
#[tauri::command]
pub async fn create_backup(state: State<'_, AppState>, dest_path: Option<String>) -> Result<BackupEntry, String> {
    secured(&state, |c| backup::create(c.conn, c.paths, c.key, dest_path.as_deref())).map(Into::into)
}

#[tauri::command]
pub async fn list_backups(state: State<'_, AppState>) -> Result<Vec<BackupEntry>, String> {
    secured(&state, |c| backup::list(c.conn)).map(|entries| entries.into_iter().map(Into::into).collect())
}

/// Restores the backup recorded under `backup_id` after writing a `pre_restore_*` safety copy.
/// The session is closed afterwards.
#[tauri::command]
pub async fn restore_backup(state: State<'_, AppState>, backup_id: String) -> Result<(), String> {
    secured(&state, |c| backup::restore(c.conn, c.paths, c.key, &backup_id))?;
    state.session.lock().clear();
    Ok(())
}
