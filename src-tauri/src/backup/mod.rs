//! Encrypted database backups (SQLCipher online backup API; same key as the live database).
//! Backups are only readable on this Windows account, since the key is protected by DPAPI.

use std::path::{Path, PathBuf};
use std::time::Duration;

use rusqlite::{Connection, backup::Backup};
use serde_json::json;

use crate::application::{audit, initialize_database};
use crate::database::{cols, connection, insert_new, query_all, query_opt};
use crate::domain::error::{AppError, AppResult};
use crate::domain::models::{BackupEntry, Model};
use crate::infrastructure::{crypto, paths::AppPaths};

const PAGES_PER_STEP: i32 = 128;
const PAUSE: Duration = Duration::from_millis(5);
/// Only successful backups are recorded; failures are reported to the caller.
const STATUS_SUCCESS: &str = "success";

fn timestamped_name(prefix: &str) -> String {
    format!("{prefix}_{}.db", chrono::Local::now().format("%Y%m%d_%H%M%S"))
}

/// Writes an encrypted copy of `conn` to `target` (which must not exist yet).
fn write_copy(conn: &Connection, key: &[u8], target: &Path) -> AppResult<()> {
    if target.exists() {
        return Err(AppError::Conflict("Le fichier de destination existe déjà".into()));
    }
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let mut destination = connection::open(target, key)?;
    {
        let backup = Backup::new(conn, &mut destination)?;
        backup.run_to_completion(PAGES_PER_STEP, PAUSE, None)?;
    }
    Ok(())
}

fn record(conn: &Connection, path: &Path, kind: &str) -> AppResult<BackupEntry> {
    let bytes = std::fs::read(path)?;
    let path_text = path.to_string_lossy().to_string();
    let id = insert_new(
        conn,
        "backup_history",
        &cols![
            "path" => path_text,
            "size_bytes" => bytes.len() as i64,
            "checksum" => crypto::sha256_hex(&bytes),
            "status" => STATUS_SUCCESS,
        ],
        false,
    )?;
    audit::log(conn, "backup.create", "backup", Some(&id), json!({ "kind": kind }))?;
    find(conn, &id)
}

pub fn find(conn: &Connection, id: &str) -> AppResult<BackupEntry> {
    query_opt(conn, "SELECT * FROM backup_history WHERE id = ?1", [id], BackupEntry::from_row)?
        .ok_or_else(|| AppError::not_found("Sauvegarde"))
}

/// `dest`: target file (or existing directory); defaults to `backups/cabinet_<timestamp>.db`.
pub fn create(conn: &Connection, paths: &AppPaths, key: &[u8], dest: Option<&str>) -> AppResult<BackupEntry> {
    let target: PathBuf = match dest.map(Path::new) {
        None => paths.backups.join(timestamped_name("cabinet")),
        Some(p) if p.is_dir() => p.join(timestamped_name("cabinet")),
        Some(p) => p.to_path_buf(),
    };
    write_copy(conn, key, &target)?;
    record(conn, &target, "manual")
}

pub fn list(conn: &Connection) -> AppResult<Vec<BackupEntry>> {
    query_all(conn, "SELECT * FROM backup_history ORDER BY created_at DESC", [], BackupEntry::from_row)
}

/// Replaces the live database content with the backup recorded under `backup_id`. A copy of the
/// current database is first written to `backups/pre_restore_<timestamp>.db` and recorded.
/// The caller must end the current session (the restored data has its own doctor password).
pub fn restore(conn: &mut Connection, paths: &AppPaths, key: &[u8], backup_id: &str) -> AppResult<()> {
    let source_path = find(conn, backup_id)?.path;
    let source = Path::new(&source_path);
    if !source.is_file() {
        return Err(AppError::not_found("Fichier de sauvegarde"));
    }
    if source.canonicalize()? == paths.db_file().canonicalize()? {
        return Err(AppError::validation("Impossible de restaurer la base active sur elle-même"));
    }
    let source_db = connection::open(source, key)?;
    let has_schema: i64 =
        source_db.query_row("SELECT COUNT(*) FROM sqlite_master WHERE name = 'doctors'", [], |r| r.get(0))?;
    if has_schema == 0 {
        return Err(AppError::validation("Ce fichier n'est pas une sauvegarde valide du cabinet"));
    }

    let pre_restore = paths.backups.join(timestamped_name("pre_restore"));
    write_copy(conn, key, &pre_restore)?;

    {
        let backup = Backup::new(&source_db, conn)?;
        backup.run_to_completion(PAGES_PER_STEP, PAUSE, None)?;
    }
    initialize_database(conn)?;

    // The restored history does not know about the safety copy: record it again.
    let entry = record(conn, &pre_restore, "pre_restore")?;
    audit::log(conn, "backup.restore", "backup", Some(&entry.id), json!({ "restored_from": backup_id }))
}
