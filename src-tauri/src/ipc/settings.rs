use std::collections::BTreeMap;

use rusqlite::Connection;
use serde::{Deserialize, Serialize};

use crate::domain::error::{AppError, AppResult};

const KEY_PROTECTION: &str = "Windows DPAPI (compte utilisateur Windows)";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsInput {
    pub cabinet_name: String,
    pub cabinet_address: String,
    pub cabinet_phone: String,
    pub cabinet_email: String,
    pub idle_timeout_minutes: i64,
    pub default_appointment_duration_minutes: i64,
}

#[derive(Debug, Serialize)]
pub struct EncryptionStatus {
    pub database_encrypted: bool,
    pub documents_encrypted: bool,
    pub key_protection: String,
}

#[derive(Debug, Serialize)]
pub struct AppSettings {
    #[serde(flatten)]
    pub input: SettingsInput,
    pub encryption: EncryptionStatus,
}

impl SettingsInput {
    pub fn into_map(self) -> BTreeMap<String, String> {
        BTreeMap::from([
            ("cabinet_name".to_string(), self.cabinet_name),
            ("cabinet_address".to_string(), self.cabinet_address),
            ("cabinet_phone".to_string(), self.cabinet_phone),
            ("cabinet_email".to_string(), self.cabinet_email),
            ("idle_timeout_minutes".to_string(), self.idle_timeout_minutes.to_string()),
            (
                "default_appointment_duration_minutes".to_string(),
                self.default_appointment_duration_minutes.to_string(),
            ),
        ])
    }
}

impl AppSettings {
    /// Settings from the key-value store; the encryption status is read from the live connection.
    pub fn from_store(conn: &Connection, mut values: BTreeMap<String, String>) -> AppResult<Self> {
        let mut text = |key: &str| {
            values.remove(key).ok_or_else(|| AppError::Internal(format!("Paramètre manquant : {key}")))
        };
        let mut number = |key: &str| -> AppResult<i64> {
            text(key)?.parse().map_err(|_| AppError::Internal(format!("Paramètre numérique invalide : {key}")))
        };
        let idle_timeout_minutes = number("idle_timeout_minutes")?;
        let default_appointment_duration_minutes = number("default_appointment_duration_minutes")?;
        let input = SettingsInput {
            cabinet_name: text("cabinet_name")?,
            cabinet_address: text("cabinet_address")?,
            cabinet_phone: text("cabinet_phone")?,
            cabinet_email: text("cabinet_email")?,
            idle_timeout_minutes,
            default_appointment_duration_minutes,
        };
        // `PRAGMA cipher_version` only returns a row when the SQLCipher codec is active.
        let database_encrypted = conn
            .query_row("PRAGMA cipher_version", [], |r| r.get::<_, String>(0))
            .is_ok_and(|version| !version.is_empty());
        Ok(Self {
            input,
            encryption: EncryptionStatus {
                database_encrypted,
                documents_encrypted: true,
                key_protection: KEY_PROTECTION.to_string(),
            },
        })
    }
}
