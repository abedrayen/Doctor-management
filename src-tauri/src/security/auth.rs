use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::{Algorithm, Argon2, Params, Version};
use rand::RngCore;
use rand::rngs::OsRng;

use crate::domain::error::{AppError, AppResult};

const MIN_PASSWORD_LEN: usize = 8;

fn argon2id() -> AppResult<Argon2<'static>> {
    // 64 MiB, 3 iterations, 1 lane.
    let params = Params::new(64 * 1024, 3, 1, None).map_err(|e| AppError::Crypto(e.to_string()))?;
    Ok(Argon2::new(Algorithm::Argon2id, Version::V0x13, params))
}

pub fn validate_password(password: &str) -> AppResult<()> {
    if password.chars().count() < MIN_PASSWORD_LEN {
        return Err(AppError::validation(format!(
            "Le mot de passe doit contenir au moins {MIN_PASSWORD_LEN} caractères"
        )));
    }
    Ok(())
}

pub fn hash_password(password: &str) -> AppResult<String> {
    let mut salt_bytes = [0u8; 16];
    OsRng.fill_bytes(&mut salt_bytes);
    let salt = SaltString::encode_b64(&salt_bytes).map_err(|e| AppError::Crypto(e.to_string()))?;
    let hash = argon2id()?
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AppError::Crypto(e.to_string()))?;
    Ok(hash.to_string())
}

pub fn verify_password(password: &str, stored_hash: &str) -> AppResult<()> {
    let parsed = PasswordHash::new(stored_hash).map_err(|e| AppError::Crypto(e.to_string()))?;
    argon2id()?
        .verify_password(password.as_bytes(), &parsed)
        .map_err(|_| AppError::InvalidCredentials)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_password_enforces_minimum_length() {
        assert!(matches!(validate_password("1234567"), Err(AppError::Validation(_))));
        assert!(validate_password("12345678").is_ok());
        // Length is counted in characters, not bytes.
        assert!(validate_password("éééééééé").is_ok());
    }

    #[test]
    fn hash_then_verify_roundtrip() {
        let hash = hash_password("motdepasse-solide").unwrap();
        assert!(hash.starts_with("$argon2id$"));
        assert!(verify_password("motdepasse-solide", &hash).is_ok());
        assert!(matches!(verify_password("autre-mot-de-passe", &hash), Err(AppError::InvalidCredentials)));
    }

    #[test]
    fn hashes_are_salted() {
        assert_ne!(hash_password("motdepasse-solide").unwrap(), hash_password("motdepasse-solide").unwrap());
    }

    #[test]
    fn verify_rejects_malformed_hash() {
        assert!(matches!(verify_password("motdepasse-solide", "pas-un-hash"), Err(AppError::Crypto(_))));
    }
}
