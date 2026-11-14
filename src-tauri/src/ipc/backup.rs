use serde::Serialize;

use crate::domain::models::BackupEntry as DomainEntry;

/// `status` is `"success"` or `"failed"`; the file path is never exposed.
#[derive(Debug, Serialize)]
pub struct BackupEntry {
    pub id: String,
    pub created_at: String,
    pub size_bytes: i64,
    pub checksum: String,
    pub status: String,
}

impl From<DomainEntry> for BackupEntry {
    fn from(entry: DomainEntry) -> Self {
        Self {
            id: entry.id,
            created_at: entry.created_at,
            size_bytes: entry.size_bytes,
            checksum: entry.checksum,
            status: entry.status,
        }
    }
}
