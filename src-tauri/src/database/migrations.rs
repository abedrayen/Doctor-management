use rusqlite::{Connection, params};

use crate::database::now;
use crate::domain::error::AppResult;

const MIGRATIONS: &[(i64, &str, &str)] = &[
    (1, "001_foundation", include_str!("../../migrations/001_foundation.sql")),
    (2, "002_patients", include_str!("../../migrations/002_patients.sql")),
    (3, "003_consultations", include_str!("../../migrations/003_consultations.sql")),
    (4, "004_growth_vaccinations", include_str!("../../migrations/004_growth_vaccinations.sql")),
    (5, "005_practice", include_str!("../../migrations/005_practice.sql")),
];

/// Applies, in order and each in its own transaction, the migrations not yet recorded.
pub fn run(conn: &mut Connection) -> AppResult<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL
        );",
    )?;
    for (version, name, sql) in MIGRATIONS {
        let applied: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = ?1)",
            [version],
            |r| r.get(0),
        )?;
        if applied {
            continue;
        }
        let tx = conn.transaction()?;
        tx.execute_batch(sql)?;
        tx.execute(
            "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?1, ?2, ?3)",
            params![version, name, now()],
        )?;
        tx.commit()?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// An in-memory SQLCipher database is unencrypted unless `PRAGMA key` is issued, which is enough here.
    fn memory_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        conn
    }

    fn table_exists(conn: &Connection, name: &str) -> bool {
        conn.query_row("SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1)", [name], |r| r.get(0))
            .unwrap()
    }

    #[test]
    fn applies_all_migrations_and_is_idempotent() {
        let mut conn = memory_db();
        run(&mut conn).unwrap();
        run(&mut conn).unwrap();

        let applied: i64 = conn.query_row("SELECT COUNT(*) FROM schema_migrations", [], |r| r.get(0)).unwrap();
        assert_eq!(applied, MIGRATIONS.len() as i64);
        for table in ["doctors", "patients", "consultations", "growth_measurements", "vaccination_records", "appointments", "patient_documents"] {
            assert!(table_exists(&conn, table), "missing table {table}");
        }
    }
}
