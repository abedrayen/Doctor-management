use serde::Serialize;

use crate::domain::models::{DocumentData, Record};

#[derive(Debug, Serialize)]
pub struct PatientDocument {
    pub id: String,
    pub patient_id: String,
    pub original_name: String,
    pub mime: String,
    pub size_bytes: i64,
    pub created_at: String,
}

impl From<Record<DocumentData>> for PatientDocument {
    fn from(record: Record<DocumentData>) -> Self {
        Self {
            id: record.id,
            patient_id: record.data.patient_id,
            original_name: record.data.original_name,
            mime: record.data.mime_type,
            size_bytes: record.data.size_bytes,
            created_at: record.created_at,
        }
    }
}
