use std::collections::BTreeMap;
use std::ops::RangeInclusive;

use rusqlite::{Connection, params};
use serde_json::json;

use crate::application::audit;
use crate::database::query_all;
use crate::domain::error::{AppError, AppResult};

/// Every accepted key with its default value (seeded on first open).
const DEFAULTS: &[(&str, &str)] = &[
    ("cabinet_name", "Cabinet Pédiatrique"),
    ("cabinet_address", ""),
    ("cabinet_phone", ""),
    ("cabinet_email", ""),
    ("idle_timeout_minutes", "10"),
    ("default_appointment_duration_minutes", "30"),
];

pub fn seed_defaults(conn: &Connection) -> AppResult<()> {
    for (key, value) in DEFAULTS {
        conn.execute("INSERT OR IGNORE INTO application_settings (key, value) VALUES (?1, ?2)", params![key, value])?;
    }
    Ok(())
}

pub fn get(conn: &Connection) -> AppResult<BTreeMap<String, String>> {
    let rows: Vec<(String, String)> =
        query_all(conn, "SELECT key, value FROM application_settings", [], |r| Ok((r.get(0)?, r.get(1)?)))?;
    Ok(rows.into_iter().collect())
}

fn require_int_in(key: &str, value: &str, range: RangeInclusive<i64>) -> AppResult<()> {
    match value.trim().parse::<i64>() {
        Ok(n) if range.contains(&n) => Ok(()),
        _ => Err(AppError::validation(format!(
            "« {key} » doit être un entier entre {} et {}",
            range.start(),
            range.end()
        ))),
    }
}

fn validate(key: &str, value: &str) -> AppResult<()> {
    match key {
        "idle_timeout_minutes" => require_int_in(key, value, 1..=240),
        "default_appointment_duration_minutes" => require_int_in(key, value, 5..=480),
        "cabinet_name" if value.trim().is_empty() => Err(AppError::validation("Le nom du cabinet est obligatoire")),
        k if DEFAULTS.iter().any(|(known, _)| *known == k) => Ok(()),
        _ => Err(AppError::validation(format!("Paramètre inconnu : {key}"))),
    }
}

pub fn update(conn: &Connection, values: BTreeMap<String, String>) -> AppResult<BTreeMap<String, String>> {
    for (key, value) in &values {
        validate(key, value)?;
    }
    let tx = conn.unchecked_transaction()?;
    for (key, value) in &values {
        tx.execute(
            "INSERT INTO application_settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value.trim()],
        )?;
    }
    audit::log(&tx, "settings.update", "settings", None, json!({ "keys": values.keys().collect::<Vec<_>>() }))?;
    tx.commit()?;
    get(conn)
}
