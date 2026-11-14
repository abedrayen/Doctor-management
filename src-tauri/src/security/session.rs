use rand::RngCore;
use rand::rngs::OsRng;

use crate::domain::error::{AppError, AppResult};

/// In-memory session. Locking (inactivity) keeps the identity but requires the
/// password again (`unlock`); logout clears everything.
#[derive(Debug, Default)]
pub struct Session {
    token: Option<String>,
    doctor_id: Option<String>,
    locked: bool,
}

impl Session {
    pub fn start(&mut self, doctor_id: &str) -> String {
        let mut bytes = [0u8; 32];
        OsRng.fill_bytes(&mut bytes);
        let token = hex::encode(bytes);
        self.token = Some(token.clone());
        self.doctor_id = Some(doctor_id.to_string());
        self.locked = false;
        token
    }

    pub fn clear(&mut self) {
        *self = Self::default();
    }

    pub fn lock(&mut self) {
        if self.token.is_some() {
            self.locked = true;
        }
    }

    pub fn unlock(&mut self) {
        self.locked = false;
    }

    pub fn has_identity(&self) -> bool {
        self.token.is_some()
    }

    pub fn is_locked(&self) -> bool {
        self.locked
    }

    pub fn doctor_id(&self) -> Option<&str> {
        self.doctor_id.as_deref()
    }

    /// Doctor id of an active (authenticated and unlocked) session.
    pub fn require_active(&self) -> AppResult<&str> {
        match (&self.token, &self.doctor_id, self.locked) {
            (Some(_), Some(id), false) => Ok(id),
            _ => Err(AppError::Unauthorized),
        }
    }
}
