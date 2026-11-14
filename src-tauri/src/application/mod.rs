pub mod appointments;
pub mod audit;
pub mod auth;
pub mod consultations;
pub mod dashboard;
pub mod documents;
pub mod growth;
pub mod patients;
pub mod pdf;
pub mod settings;
pub mod vaccinations;

use rusqlite::Connection;

use crate::database::migrations;
use crate::domain::error::AppResult;

/// Brings a freshly opened (or restored) database up to date: migrations, default settings,
/// placeholder vaccination calendar. Idempotent.
pub fn initialize_database(conn: &mut Connection) -> AppResult<()> {
    migrations::run(conn)?;
    settings::seed_defaults(conn)?;
    vaccinations::seed_default_schedule(conn)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn initialize_database_is_idempotent_and_seeds_defaults() {
        let mut conn = Connection::open_in_memory().unwrap();
        initialize_database(&mut conn).unwrap();
        initialize_database(&mut conn).unwrap();

        assert!(settings::get(&conn).unwrap().contains_key("cabinet_name"));
        let schedule = vaccinations::get_schedule(&conn).unwrap();
        assert!(schedule.requires_doctor_review);
        assert!(!schedule.items.is_empty());
    }
}
