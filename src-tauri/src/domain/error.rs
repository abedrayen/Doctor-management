use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Erreur de base de données : {0}")]
    Db(#[from] rusqlite::Error),
    #[error("Erreur d'entrée/sortie : {0}")]
    Io(#[from] std::io::Error),
    #[error("Erreur de sérialisation : {0}")]
    Json(#[from] serde_json::Error),
    #[error("{0}")]
    Validation(String),
    #[error("{0}")]
    NotFound(String),
    #[error("{0}")]
    Conflict(String),
    #[error("Session absente ou verrouillée")]
    Unauthorized,
    #[error("Mot de passe incorrect")]
    InvalidCredentials,
    #[error("Erreur de chiffrement : {0}")]
    Crypto(String),
    #[error("{0}")]
    Internal(String),
}

pub type AppResult<T> = Result<T, AppError>;

impl From<AppError> for String {
    fn from(err: AppError) -> Self {
        err.to_string()
    }
}

impl AppError {
    pub fn validation(msg: impl Into<String>) -> Self {
        Self::Validation(msg.into())
    }

    pub fn not_found(what: &str) -> Self {
        Self::NotFound(format!("{what} introuvable"))
    }
}
