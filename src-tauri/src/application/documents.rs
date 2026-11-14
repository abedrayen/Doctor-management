use std::path::Path;

use base64::{Engine, engine::general_purpose::STANDARD};
use rusqlite::Connection;
use serde_json::json;

use crate::application::{audit, patients};
use crate::database::{insert_new, now, query_all, query_opt};
use crate::domain::error::{AppError, AppResult};
use crate::domain::models::*;
use crate::infrastructure::{crypto, paths::AppPaths};
use crate::storage;

const MAX_DOCUMENT_BYTES: usize = 25 * 1024 * 1024;

const ALLOWED_MIME_TYPES: [&str; 7] = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/bmp",
    "text/plain",
];

pub fn list(conn: &Connection, patient_id: &str) -> AppResult<Vec<Record<DocumentData>>> {
    query_all(
        conn,
        "SELECT * FROM patient_documents WHERE patient_id = ?1 AND archived_at IS NULL ORDER BY created_at DESC",
        [patient_id],
        Record::<DocumentData>::from_row,
    )
}

fn find(conn: &Connection, id: &str) -> AppResult<(Record<DocumentData>, ArchiveState)> {
    query_opt(conn, "SELECT * FROM patient_documents WHERE id = ?1", [id], |r| {
        Ok((Record::<DocumentData>::from_row(r)?, ArchiveState::from_row(r)?))
    })?
    .ok_or_else(|| AppError::not_found("Document"))
}

fn insert_meta(conn: &Connection, data: &DocumentData) -> AppResult<String> {
    let tx = conn.unchecked_transaction()?;
    let id = insert_new(&tx, "patient_documents", &data.columns(), false)?;
    audit::log(
        &tx,
        "document.attach",
        "patient_document",
        Some(&id),
        json!({ "patient_id": data.patient_id, "size_bytes": data.size_bytes, "mime_type": data.mime_type }),
    )?;
    tx.commit()?;
    Ok(id)
}

/// Decodes the base64 content, encrypts it (AES-256-GCM) into the patient's document folder and records its metadata.
pub fn attach(
    conn: &Connection,
    paths: &AppPaths,
    key: &[u8],
    patient_id: &str,
    file_name: &str,
    mime: &str,
    data_base64: &str,
) -> AppResult<Record<DocumentData>> {
    patients::require_active(conn, patient_id)?;
    let original_name = Path::new(file_name)
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| AppError::validation("Nom de fichier invalide"))?
        .to_string();
    if !ALLOWED_MIME_TYPES.contains(&mime) {
        return Err(AppError::validation("Type de fichier non pris en charge (PDF, images, texte)"));
    }
    if data_base64.len() / 4 * 3 > MAX_DOCUMENT_BYTES {
        return Err(AppError::validation("Fichier trop volumineux (25 Mo maximum)"));
    }
    let bytes = STANDARD
        .decode(data_base64)
        .map_err(|_| AppError::validation("Contenu du document invalide (base64)"))?;

    let storage_path = storage::documents::store(paths, key, patient_id, &bytes)?;
    let data = DocumentData {
        patient_id: patient_id.to_string(),
        original_name,
        mime_type: mime.to_string(),
        size_bytes: bytes.len() as i64,
        storage_path,
        checksum: crypto::sha256_hex(&bytes),
    };
    match insert_meta(conn, &data) {
        Ok(id) => Ok(find(conn, &id)?.0),
        Err(err) => {
            // Do not leave an orphan encrypted file behind.
            let _ = storage::documents::remove(paths, &data.storage_path);
            Err(err)
        }
    }
}

/// Decrypted content as base64 (integrity verified against the stored checksum).
pub fn get_content(conn: &Connection, paths: &AppPaths, key: &[u8], id: &str) -> AppResult<String> {
    let (record, state) = find(conn, id)?;
    if state.archived_at.is_some() {
        return Err(AppError::Conflict("Ce document est archivé".into()));
    }
    let bytes = storage::documents::load(paths, key, &record.data.storage_path)?;
    if crypto::sha256_hex(&bytes) != record.data.checksum {
        return Err(AppError::Crypto("Somme de contrôle du document invalide".into()));
    }
    Ok(STANDARD.encode(bytes))
}

/// Soft delete: the encrypted file is kept, the document is hidden from lists.
pub fn archive(conn: &Connection, id: &str) -> AppResult<()> {
    if find(conn, id)?.1.archived_at.is_some() {
        return Err(AppError::Conflict("Ce document est déjà archivé".into()));
    }
    let tx = conn.unchecked_transaction()?;
    tx.execute("UPDATE patient_documents SET archived_at = ?1 WHERE id = ?2", rusqlite::params![now(), id])?;
    audit::log(&tx, "document.archive", "patient_document", Some(id), json!({}))?;
    tx.commit()?;
    Ok(())
}
