use std::path::PathBuf;

use crate::domain::error::{AppError, AppResult};

/// `%APPDATA%\CabinetPediatrique\{database,documents,backups,logs,configuration}`
#[derive(Debug, Clone)]
pub struct AppPaths {
    pub root: PathBuf,
    pub database: PathBuf,
    pub documents: PathBuf,
    pub backups: PathBuf,
    pub logs: PathBuf,
    pub configuration: PathBuf,
}

impl AppPaths {
    pub fn new() -> AppResult<Self> {
        let base = dirs::data_dir()
            .ok_or_else(|| AppError::Internal("Dossier de données utilisateur introuvable".into()))?;
        Ok(Self::from_root(base.join("CabinetPediatrique")))
    }

    pub fn from_root(root: PathBuf) -> Self {
        Self {
            database: root.join("database"),
            documents: root.join("documents"),
            backups: root.join("backups"),
            logs: root.join("logs"),
            configuration: root.join("configuration"),
            root,
        }
    }

    pub fn ensure_dirs(&self) -> AppResult<()> {
        for dir in [&self.database, &self.documents, &self.backups, &self.logs, &self.configuration] {
            std::fs::create_dir_all(dir)?;
        }
        Ok(())
    }

    pub fn db_file(&self) -> PathBuf {
        self.database.join("medical.db")
    }

    pub fn key_file(&self) -> PathBuf {
        self.configuration.join("key.dpapi")
    }

    /// Directory (absolute) holding the encrypted documents of a patient.
    pub fn patient_documents_dir(&self, patient_id: &str) -> PathBuf {
        self.documents.join("patients").join(patient_id)
    }
}
