//! Windows DPAPI (current-user scope) protection of the database key.

use zeroize::Zeroizing;

use crate::domain::error::{AppError, AppResult};

/// Application-specific entropy: data protected by another app of the same user cannot be unprotected here.
#[cfg(windows)]
const ENTROPY: &[u8] = b"CabinetPediatrique.v1.database-key";

#[cfg(windows)]
mod imp {
    use super::*;
    use windows::Win32::Foundation::{HLOCAL, LocalFree};
    use windows::Win32::Security::Cryptography::{
        CRYPT_INTEGER_BLOB, CRYPTPROTECT_UI_FORBIDDEN, CryptProtectData, CryptUnprotectData,
    };
    use windows::core::PCWSTR;

    fn blob(data: &[u8]) -> CRYPT_INTEGER_BLOB {
        CRYPT_INTEGER_BLOB { cbData: data.len() as u32, pbData: data.as_ptr() as *mut u8 }
    }

    /// Copies a Windows-allocated blob into a zeroizing buffer, wipes it and frees it.
    fn take(out: CRYPT_INTEGER_BLOB) -> Zeroizing<Vec<u8>> {
        // SAFETY: `out` was filled by DPAPI: `pbData` points to `cbData` valid bytes allocated with LocalAlloc.
        unsafe {
            let copy = Zeroizing::new(std::slice::from_raw_parts(out.pbData, out.cbData as usize).to_vec());
            std::ptr::write_bytes(out.pbData, 0, out.cbData as usize);
            let _ = LocalFree(HLOCAL(out.pbData as *mut core::ffi::c_void));
            copy
        }
    }

    pub fn protect(data: &[u8]) -> AppResult<Vec<u8>> {
        let input = blob(data);
        let entropy = blob(ENTROPY);
        let mut output = CRYPT_INTEGER_BLOB::default();
        // SAFETY: all pointers reference live data for the duration of the call.
        let result = unsafe {
            CryptProtectData(
                &input as *const CRYPT_INTEGER_BLOB,
                PCWSTR::null(),
                Some(&entropy as *const CRYPT_INTEGER_BLOB),
                None,
                None,
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut output as *mut CRYPT_INTEGER_BLOB,
            )
        };
        result.map_err(|e| AppError::Crypto(format!("DPAPI (protection) : {e}")))?;
        Ok(take(output).to_vec())
    }

    pub fn unprotect(data: &[u8]) -> AppResult<Zeroizing<Vec<u8>>> {
        let input = blob(data);
        let entropy = blob(ENTROPY);
        let mut output = CRYPT_INTEGER_BLOB::default();
        // SAFETY: all pointers reference live data for the duration of the call.
        let result = unsafe {
            CryptUnprotectData(
                &input as *const CRYPT_INTEGER_BLOB,
                None,
                Some(&entropy as *const CRYPT_INTEGER_BLOB),
                None,
                None,
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut output as *mut CRYPT_INTEGER_BLOB,
            )
        };
        result.map_err(|e| AppError::Crypto(format!("DPAPI (déchiffrement de la clé) : {e}")))?;
        Ok(take(output))
    }
}

#[cfg(windows)]
pub use imp::{protect, unprotect};

#[cfg(not(windows))]
pub fn protect(_data: &[u8]) -> AppResult<Vec<u8>> {
    Err(AppError::Crypto("DPAPI n'est disponible que sous Windows".into()))
}

#[cfg(not(windows))]
pub fn unprotect(_data: &[u8]) -> AppResult<Zeroizing<Vec<u8>>> {
    Err(AppError::Crypto("DPAPI n'est disponible que sous Windows".into()))
}
