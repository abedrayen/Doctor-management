use std::path::Path;

use rusqlite::Connection;
use zeroize::Zeroizing;

use crate::domain::error::{AppError, AppResult};

/// Opens (or creates) a SQLCipher database with a raw 256-bit key and enforces foreign keys.
pub fn open(path: &Path, key: &[u8]) -> AppResult<Connection> {
    let conn = Connection::open(path)?;
    let pragma = Zeroizing::new(format!("PRAGMA key = \"x'{}'\";", hex::encode(key)));
    conn.execute_batch(&pragma)?;
    // Fails here if the key is wrong or the file is not an encrypted database.
    conn.query_row("SELECT count(*) FROM sqlite_master", [], |r| r.get::<_, i64>(0))
        .map_err(|_| AppError::Crypto("Clé invalide ou base de données illisible".into()))?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    Ok(conn)
}
