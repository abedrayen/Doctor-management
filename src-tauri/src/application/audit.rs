use rusqlite::Connection;
use serde_json::Value;

use crate::database::{cols, insert_new};
use crate::domain::error::AppResult;

/// Appends an audit entry. `metadata` must never contain secrets or clinical free text.
pub fn log(conn: &Connection, action: &str, entity_type: &str, entity_id: Option<&str>, metadata: Value) -> AppResult<()> {
    let metadata_json = metadata.to_string();
    insert_new(
        conn,
        "audit_logs",
        &cols![
            "action" => action,
            "entity_type" => entity_type,
            "entity_id" => entity_id,
            "metadata_json" => metadata_json,
        ],
        false,
    )?;
    Ok(())
}
