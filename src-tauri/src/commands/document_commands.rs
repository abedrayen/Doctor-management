use tauri::State;

use crate::AppState;
use crate::application::{documents, pdf};
use crate::commands::secured;
use crate::infrastructure::crypto;
use crate::ipc::documents::PatientDocument;

#[tauri::command]
pub async fn list_documents(state: State<'_, AppState>, patient_id: String) -> Result<Vec<PatientDocument>, String> {
    secured(&state, |c| documents::list(c.conn, &patient_id))
        .map(|records| records.into_iter().map(Into::into).collect())
}

/// Decodes the base64 content, encrypts it (AES-256-GCM) and stores it in the patient's folder.
#[tauri::command]
pub async fn attach_document(
    state: State<'_, AppState>,
    patient_id: String,
    file_name: String,
    mime: String,
    data_base64: String,
) -> Result<PatientDocument, String> {
    secured(&state, |c| {
        let file_key = crypto::derive_file_key(c.key);
        documents::attach(c.conn, c.paths, &file_key, &patient_id, &file_name, &mime, &data_base64)
    })
    .map(Into::into)
}

/// Decrypted content, base64 encoded.
#[tauri::command]
pub async fn get_document_bytes(state: State<'_, AppState>, document_id: String) -> Result<String, String> {
    secured(&state, |c| {
        let file_key = crypto::derive_file_key(c.key);
        documents::get_content(c.conn, c.paths, &file_key, &document_id)
    })
}

/// Soft delete (archive): the encrypted file is kept.
#[tauri::command]
pub async fn delete_document(state: State<'_, AppState>, document_id: String) -> Result<(), String> {
    secured(&state, |c| documents::archive(c.conn, &document_id))
}

/// Printable HTML for `kind` in `fiche | consultation | historique | croissance | vaccinal`.
#[tauri::command]
pub async fn generate_printable_html(
    state: State<'_, AppState>,
    kind: String,
    patient_id: String,
    consultation_id: Option<String>,
) -> Result<String, String> {
    secured(&state, |c| pdf::generate_printable_html(c.conn, &kind, &patient_id, consultation_id.as_deref()))
}
