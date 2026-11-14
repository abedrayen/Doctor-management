use rusqlite::Connection;
use serde_json::json;

use crate::application::audit;
use crate::database::{cols, count, insert_new, query_opt, update_row};
use crate::domain::error::{AppError, AppResult};
use crate::domain::models::{Doctor, Model};
use crate::security::{auth, session::Session};

pub fn is_setup_required(conn: &Connection) -> AppResult<bool> {
    Ok(count(conn, "SELECT COUNT(*) FROM doctors", [])? == 0)
}

/// The single practice doctor and the stored password hash.
fn load_doctor(conn: &Connection) -> AppResult<(Doctor, String)> {
    query_opt(
        conn,
        "SELECT id, display_name, specialty, created_at, updated_at, password_hash
         FROM doctors ORDER BY created_at LIMIT 1",
        [],
        |r| Ok((Doctor::from_row(r)?, r.get::<_, String>("password_hash")?)),
    )?
    .ok_or_else(|| AppError::not_found("Médecin"))
}

pub fn primary_doctor(conn: &Connection) -> AppResult<Doctor> {
    Ok(load_doctor(conn)?.0)
}

/// First launch only. Starts the session on success.
pub fn setup_doctor(
    conn: &Connection,
    session: &mut Session,
    display_name: &str,
    specialty: Option<&str>,
    password: &str,
) -> AppResult<Doctor> {
    if !is_setup_required(conn)? {
        return Err(AppError::Conflict("Le médecin est déjà configuré".into()));
    }
    let display_name = display_name.trim();
    if display_name.is_empty() {
        return Err(AppError::validation("Le nom du médecin est obligatoire"));
    }
    auth::validate_password(password)?;
    let password_hash = auth::hash_password(password)?;
    let id = insert_new(
        conn,
        "doctors",
        &cols!["display_name" => display_name, "specialty" => specialty, "password_hash" => password_hash],
        true,
    )?;
    audit::log(conn, "doctor.setup", "doctor", Some(&id), json!({}))?;
    start_session(conn, session)
}

fn start_session(conn: &Connection, session: &mut Session) -> AppResult<Doctor> {
    let doctor = primary_doctor(conn)?;
    session.start(&doctor.id);
    Ok(doctor)
}

pub fn login(conn: &Connection, session: &mut Session, password: &str) -> AppResult<Doctor> {
    let (doctor, hash) = load_doctor(conn)?;
    if let Err(err) = auth::verify_password(password, &hash) {
        audit::log(conn, "auth.login_failed", "doctor", Some(&doctor.id), json!({}))?;
        return Err(err);
    }
    audit::log(conn, "auth.login", "doctor", Some(&doctor.id), json!({}))?;
    start_session(conn, session)
}

pub fn logout(conn: &Connection, session: &mut Session) -> AppResult<()> {
    if let Some(id) = session.doctor_id() {
        audit::log(conn, "auth.logout", "doctor", Some(id), json!({}))?;
    }
    session.clear();
    Ok(())
}

pub fn unlock(conn: &Connection, session: &mut Session, password: &str) -> AppResult<()> {
    if !session.has_identity() {
        return Err(AppError::Unauthorized);
    }
    let (doctor, hash) = load_doctor(conn)?;
    auth::verify_password(password, &hash)?;
    session.unlock();
    audit::log(conn, "auth.unlock", "doctor", Some(&doctor.id), json!({}))
}

/// `None` when nobody is logged in or the session is locked.
pub fn current_doctor(conn: &Connection, session: &Session) -> AppResult<Option<Doctor>> {
    if session.require_active().is_err() {
        return Ok(None);
    }
    Ok(Some(primary_doctor(conn)?))
}

pub fn change_password(conn: &Connection, session: &Session, current_password: &str, new_password: &str) -> AppResult<()> {
    session.require_active()?;
    let (doctor, hash) = load_doctor(conn)?;
    auth::verify_password(current_password, &hash)?;
    auth::validate_password(new_password)?;
    let new_hash = auth::hash_password(new_password)?;
    update_row(conn, "doctors", &doctor.id, &cols!["password_hash" => new_hash], true)?;
    audit::log(conn, "auth.change_password", "doctor", Some(&doctor.id), json!({}))
}
