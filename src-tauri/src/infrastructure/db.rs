//! Database key lifecycle: a random 32-byte key, protected with DPAPI in `configuration/key.dpapi`.

use rand::RngCore;
use rand::rngs::OsRng;
use zeroize::Zeroizing;

use crate::domain::error::{AppError, AppResult};
use crate::infrastructure::{dpapi, paths::AppPaths};

pub const KEY_LEN: usize = 32;

/// Loads the existing key, or creates one for a brand-new installation.
/// Refuses to create a key when a database already exists (it would be unreadable).
pub fn load_or_create_key(paths: &AppPaths) -> AppResult<Zeroizing<Vec<u8>>> {
    let key_file = paths.key_file();
    if key_file.exists() {
        let key = dpapi::unprotect(&std::fs::read(&key_file)?)?;
        if key.len() != KEY_LEN {
            return Err(AppError::Crypto("Fichier de clé corrompu".into()));
        }
        return Ok(key);
    }
    if paths.db_file().exists() {
        return Err(AppError::Crypto(
            "Base de données présente mais clé de chiffrement introuvable (configuration/key.dpapi)".into(),
        ));
    }
    let mut key = Zeroizing::new(vec![0u8; KEY_LEN]);
    OsRng.fill_bytes(&mut key);
    std::fs::write(&key_file, dpapi::protect(&key)?)?;
    Ok(key)
}
