//! Encrypted document files under `documents/patients/{patient_id}/{uuid}.enc`.
//! Database rows keep the path relative to the `documents` directory.

use std::path::{Component, Path, PathBuf};

use crate::database::new_id;
use crate::domain::error::{AppError, AppResult};
use crate::infrastructure::{crypto, paths::AppPaths};

/// Encrypts and writes `plaintext`; returns the relative storage path.
pub fn store(paths: &AppPaths, key: &[u8], patient_id: &str, plaintext: &[u8]) -> AppResult<String> {
    std::fs::create_dir_all(paths.patient_documents_dir(patient_id))?;
    let relative = format!("patients/{patient_id}/{}.enc", new_id());
    std::fs::write(resolve(paths, &relative)?, crypto::encrypt(key, plaintext)?)?;
    Ok(relative)
}

pub fn load(paths: &AppPaths, key: &[u8], relative: &str) -> AppResult<Vec<u8>> {
    crypto::decrypt(key, &std::fs::read(resolve(paths, relative)?)?)
}

pub fn remove(paths: &AppPaths, relative: &str) -> AppResult<()> {
    std::fs::remove_file(resolve(paths, relative)?)?;
    Ok(())
}

/// Resolves a stored relative path, refusing anything that could escape the documents directory.
fn resolve(paths: &AppPaths, relative: &str) -> AppResult<PathBuf> {
    let safe = Path::new(relative).components().all(|c| matches!(c, Component::Normal(_)));
    if !safe {
        return Err(AppError::validation("Chemin de document invalide"));
    }
    Ok(paths.documents.join(relative))
}
