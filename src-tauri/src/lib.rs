pub mod application;
pub mod backup;
pub mod commands;
pub mod database;
pub mod domain;
pub mod infrastructure;
pub mod ipc;
pub mod security;
pub mod storage;

use parking_lot::Mutex;
use rusqlite::Connection;
use tauri::Manager;
use zeroize::Zeroizing;

use crate::application::initialize_database;
use crate::database::connection;
use crate::domain::error::AppResult;
use crate::infrastructure::{db, paths::AppPaths};
use crate::security::session::Session;

pub struct AppState {
    pub db: Mutex<Option<Connection>>,
    pub session: Mutex<Session>,
    pub paths: AppPaths,
    pub db_key: Mutex<Option<Zeroizing<Vec<u8>>>>,
}

/// Paths, key (DPAPI), encrypted database, migrations.
fn bootstrap() -> AppResult<AppState> {
    let paths = AppPaths::new()?;
    paths.ensure_dirs()?;
    let key = db::load_or_create_key(&paths)?;
    let mut conn = connection::open(&paths.db_file(), &key)?;
    initialize_database(&mut conn)?;
    Ok(AppState {
        db: Mutex::new(Some(conn)),
        session: Mutex::new(Session::default()),
        paths,
        db_key: Mutex::new(Some(key)),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use commands::*;

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            app.manage(bootstrap()?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth
            auth_commands::is_setup_required,
            auth_commands::setup_doctor,
            auth_commands::login,
            auth_commands::logout,
            auth_commands::lock_session,
            auth_commands::unlock_session,
            auth_commands::get_current_doctor,
            auth_commands::change_password,
            // Patients
            patient_commands::list_patients,
            patient_commands::get_patient,
            patient_commands::create_patient,
            patient_commands::update_patient,
            patient_commands::archive_patient,
            patient_commands::find_possible_duplicates,
            patient_commands::get_patient_overview,
            // Consultations
            consultation_commands::list_consultations,
            consultation_commands::get_consultation,
            consultation_commands::create_consultation,
            consultation_commands::update_draft_consultation,
            consultation_commands::finalize_consultation,
            consultation_commands::amend_consultation,
            // Growth
            growth_commands::list_growth_measurements,
            growth_commands::add_growth_measurement,
            growth_commands::delete_growth_measurement,
            growth_commands::get_growth_chart_data,
            // Vaccinations
            vaccination_commands::list_vaccination_records,
            vaccination_commands::upsert_vaccination_record,
            vaccination_commands::get_vaccination_schedule,
            // Appointments
            appointment_commands::list_appointments,
            appointment_commands::create_appointment,
            appointment_commands::update_appointment,
            appointment_commands::cancel_appointment,
            // Documents & printable HTML
            document_commands::list_documents,
            document_commands::attach_document,
            document_commands::get_document_bytes,
            document_commands::delete_document,
            document_commands::generate_printable_html,
            // Settings, dashboard, backups
            settings_commands::get_settings,
            settings_commands::update_settings,
            dashboard_commands::get_dashboard_stats,
            backup_commands::create_backup,
            backup_commands::list_backups,
            backup_commands::restore_backup,
        ])
        .run(tauri::generate_context!())
        .expect("erreur lors du lancement de l'application Tauri");
}
