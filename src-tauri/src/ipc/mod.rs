//! Frontend contract (`src/types/models.ts`): serde DTOs exchanged over IPC and their mapping
//! to / from the domain models. Field names are snake_case, exactly as the frontend expects.

pub mod appointments;
pub mod auth;
pub mod backup;
pub mod consultations;
pub mod documents;
pub mod growth;
pub mod patients;
pub mod settings;
pub mod vaccinations;

/// Trimmed text, `None` when blank (the frontend sends `""` for empty fields).
pub fn blank_to_none(value: &str) -> Option<String> {
    let trimmed = value.trim();
    (!trimmed.is_empty()).then(|| trimmed.to_string())
}

pub fn clean(value: Option<String>) -> Option<String> {
    value.and_then(|v| blank_to_none(&v))
}
