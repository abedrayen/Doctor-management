//! AES-256-GCM file encryption. Stored format: `nonce (12 bytes) || ciphertext+tag`.

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use rand::RngCore;
use rand::rngs::OsRng;
use sha2::{Digest, Sha256};
use zeroize::Zeroizing;

use crate::domain::error::{AppError, AppResult};

const NONCE_LEN: usize = 12;

/// Derives the document key from the database key (domain-separated, so both keys differ).
pub fn derive_file_key(db_key: &[u8]) -> Zeroizing<Vec<u8>> {
    let mut hasher = Sha256::new();
    hasher.update(b"cabinet-pediatrique/documents/v1");
    hasher.update(db_key);
    Zeroizing::new(hasher.finalize().to_vec())
}

fn cipher(key: &[u8]) -> AppResult<Aes256Gcm> {
    Aes256Gcm::new_from_slice(key).map_err(|_| AppError::Crypto("Clé de chiffrement invalide".into()))
}

pub fn encrypt(key: &[u8], plaintext: &[u8]) -> AppResult<Vec<u8>> {
    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce_bytes);
    let ciphertext = cipher(key)?
        .encrypt(Nonce::from_slice(&nonce_bytes), plaintext)
        .map_err(|_| AppError::Crypto("Échec du chiffrement".into()))?;
    let mut out = Vec::with_capacity(NONCE_LEN + ciphertext.len());
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ciphertext);
    Ok(out)
}

pub fn decrypt(key: &[u8], data: &[u8]) -> AppResult<Vec<u8>> {
    if data.len() < NONCE_LEN {
        return Err(AppError::Crypto("Fichier chiffré invalide".into()));
    }
    let (nonce, ciphertext) = data.split_at(NONCE_LEN);
    cipher(key)?
        .decrypt(Nonce::from_slice(nonce), ciphertext)
        .map_err(|_| AppError::Crypto("Échec du déchiffrement (fichier altéré ou clé invalide)".into()))
}

pub fn sha256_hex(data: &[u8]) -> String {
    hex::encode(Sha256::digest(data))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encrypt_decrypt_roundtrip() {
        let key = derive_file_key(b"db-key");
        let plaintext = b"ordonnance \xC3\xA9 confidentielle";
        let encrypted = encrypt(&key, plaintext).unwrap();
        assert_eq!(encrypted.len(), NONCE_LEN + plaintext.len() + 16);
        assert_ne!(&encrypted[NONCE_LEN..NONCE_LEN + plaintext.len()], plaintext);
        assert_eq!(decrypt(&key, &encrypted).unwrap(), plaintext);
    }

    #[test]
    fn encryption_uses_a_fresh_nonce() {
        let key = derive_file_key(b"db-key");
        assert_ne!(encrypt(&key, b"data").unwrap(), encrypt(&key, b"data").unwrap());
    }

    #[test]
    fn decrypt_rejects_wrong_key_tampering_and_truncation() {
        let key = derive_file_key(b"db-key");
        let mut encrypted = encrypt(&key, b"data").unwrap();
        assert!(decrypt(&derive_file_key(b"other-key"), &encrypted).is_err());
        assert!(decrypt(&key, &encrypted[..NONCE_LEN - 1]).is_err());
        *encrypted.last_mut().unwrap() ^= 1;
        assert!(decrypt(&key, &encrypted).is_err());
    }

    #[test]
    fn derived_key_is_32_bytes_and_differs_from_db_key() {
        let db_key = [7u8; 32];
        let file_key = derive_file_key(&db_key);
        assert_eq!(file_key.len(), 32);
        assert_ne!(file_key.as_slice(), db_key.as_slice());
    }

    #[test]
    fn invalid_key_length_is_an_error() {
        assert!(encrypt(b"short", b"data").is_err());
    }

    #[test]
    fn sha256_hex_matches_known_vector() {
        assert_eq!(sha256_hex(b"abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }
}
