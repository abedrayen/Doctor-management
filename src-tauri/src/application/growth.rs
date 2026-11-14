//! Growth measurements and WHO LMS reference curves (weight-for-age, 0-24 months, boys/girls).
//!
//! The embedded reference dataset (`database/who_lms_sample.json`) is a SAMPLE flagged
//! `reviewed: false`: it must be reviewed against the official WHO tables before clinical use.

use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::application::{audit, patients};
use crate::database::{get_record, insert_new, list_records, query_opt};
use crate::domain::error::{AppError, AppResult};
use crate::domain::models::*;

const DAYS_PER_MONTH: f64 = 30.4375;
const WHO_SAMPLE: &str = include_str!("../database/who_lms_sample.json");
/// z-scores of the 3rd, 50th and 97th percentiles.
const Z_P3: f64 = -1.8808;
const Z_P97: f64 = 1.8808;

#[derive(Debug, Deserialize)]
struct LmsDataset {
    source: String,
    reviewed: bool,
    boys: Vec<[f64; 3]>,
    girls: Vec<[f64; 3]>,
}

#[derive(Debug, Serialize)]
pub struct ReferencePoint {
    pub age_months: f64,
    pub p3: f64,
    pub p50: f64,
    pub p97: f64,
}

#[derive(Debug)]
pub struct GrowthChartPoint {
    pub measurement: Record<GrowthData>,
    pub age_months: f64,
}

#[derive(Debug)]
pub struct GrowthChart {
    pub source: String,
    pub reviewed: bool,
    pub points: Vec<GrowthChartPoint>,
    pub weight_reference: Vec<ReferencePoint>,
}

/// Value at a given z-score for LMS parameters.
fn value_at_z([l, m, s]: [f64; 3], z: f64) -> f64 {
    if l.abs() < 1e-9 { m * (s * z).exp() } else { m * (1.0 + l * s * z).powf(1.0 / l) }
}

fn dataset() -> AppResult<LmsDataset> {
    Ok(serde_json::from_str(WHO_SAMPLE)?)
}

pub fn list(conn: &Connection, patient_id: &str) -> AppResult<Vec<Record<GrowthData>>> {
    list_records(conn, "growth_measurements", "patient_id", patient_id, "measured_at, created_at")
}

pub fn latest(conn: &Connection, patient_id: &str) -> AppResult<Option<Record<GrowthData>>> {
    query_opt(
        conn,
        "SELECT * FROM growth_measurements WHERE patient_id = ?1 ORDER BY measured_at DESC, created_at DESC LIMIT 1",
        [patient_id],
        Record::<GrowthData>::from_row,
    )
}

pub fn add(conn: &Connection, data: GrowthData) -> AppResult<Record<GrowthData>> {
    patients::require_active(conn, &data.patient_id)?;
    let (_, birth) = patients::birth_info(conn, &data.patient_id)?;
    if patients::parse_date(&data.measured_at)? < birth {
        return Err(AppError::validation("La mesure ne peut pas précéder la date de naissance"));
    }
    let values = [data.poids_kg, data.taille_cm, data.perimetre_cranien_cm];
    if values.iter().all(Option::is_none) {
        return Err(AppError::validation("Renseignez au moins une mesure (poids, taille ou périmètre crânien)"));
    }
    if values.iter().flatten().any(|v| *v <= 0.0) {
        return Err(AppError::validation("Les mesures doivent être positives"));
    }
    let tx = conn.unchecked_transaction()?;
    let id = insert_new(&tx, "growth_measurements", &data.columns(), false)?;
    audit::log(&tx, "growth.add", "growth_measurement", Some(&id), json!({ "patient_id": data.patient_id }))?;
    tx.commit()?;
    get_record(conn, "growth_measurements", &id, "Mesure")
}

/// Hard delete, reserved to mistaken entries; the audit trail keeps what was removed.
pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let record: Record<GrowthData> = get_record(conn, "growth_measurements", id, "Mesure")?;
    let tx = conn.unchecked_transaction()?;
    tx.execute("DELETE FROM growth_measurements WHERE id = ?1", [id])?;
    audit::log(
        &tx,
        "growth.delete",
        "growth_measurement",
        Some(id),
        json!({
            "patient_id": record.data.patient_id,
            "measured_at": record.data.measured_at,
            "poids_kg": record.data.poids_kg,
            "taille_cm": record.data.taille_cm,
            "perimetre_cranien_cm": record.data.perimetre_cranien_cm,
        }),
    )?;
    tx.commit()?;
    Ok(())
}

/// Measurements with their age in months, and the weight-for-age reference curves for the patient's sex.
/// No height / head circumference reference data is embedded.
pub fn chart(conn: &Connection, patient_id: &str) -> AppResult<GrowthChart> {
    let (sexe, birth) = patients::birth_info(conn, patient_id)?;
    let reference = dataset()?;
    let table = if sexe == "M" { &reference.boys } else { &reference.girls };

    let points = list(conn, patient_id)?
        .into_iter()
        .map(|measurement| -> AppResult<GrowthChartPoint> {
            let days = (patients::parse_date(&measurement.data.measured_at)? - birth).num_days();
            Ok(GrowthChartPoint { measurement, age_months: days as f64 / DAYS_PER_MONTH })
        })
        .collect::<AppResult<Vec<_>>>()?;

    let weight_reference = table
        .iter()
        .enumerate()
        .map(|(month, lms)| ReferencePoint {
            age_months: month as f64,
            p3: value_at_z(*lms, Z_P3),
            p50: value_at_z(*lms, 0.0),
            p97: value_at_z(*lms, Z_P97),
        })
        .collect();

    Ok(GrowthChart { source: reference.source, reviewed: reference.reviewed, points, weight_reference })
}
