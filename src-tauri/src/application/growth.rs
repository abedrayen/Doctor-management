//! Growth measurements and WHO LMS DSP chart data.

use rusqlite::Connection;
use serde::Serialize;
use serde_json::json;

use crate::application::who_lms::{self, Indicator, Score, SdCurvePoint};
use crate::application::{audit, patients};
use crate::database::{cols, get_record, insert_new, list_records, query_opt, update_row};
use crate::domain::error::{AppError, AppResult};
use crate::domain::models::*;

const DAYS_PER_MONTH: f64 = 30.4375;

#[derive(Debug)]
pub struct GrowthChartPoint {
    pub measurement: Record<GrowthData>,
    pub age_days: i64,
    pub age_months: f64,
    pub bmi: Option<f64>,
    pub scores: MeasurementScores,
}

#[derive(Debug, Default, Serialize, Clone)]
pub struct MeasurementScores {
    pub weight_kg: Option<Score>,
    pub height_cm: Option<Score>,
    pub head_cm: Option<Score>,
    pub bmi: Option<Score>,
}

#[derive(Debug)]
pub struct GrowthChart {
    pub source: String,
    pub reviewed: bool,
    pub points: Vec<GrowthChartPoint>,
    pub references: IndicatorReferences,
    pub available_indicators: Vec<&'static str>,
}

#[derive(Debug, Default)]
pub struct IndicatorReferences {
    pub weight_kg: Vec<SdCurvePoint>,
    pub height_cm: Vec<SdCurvePoint>,
    pub head_cm: Vec<SdCurvePoint>,
    pub bmi: Vec<SdCurvePoint>,
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
    validate_measurement(&data)?;
    let (_, birth) = patients::birth_info(conn, &data.patient_id)?;
    if patients::parse_date(&data.measured_at)? < birth {
        return Err(AppError::validation("La mesure ne peut pas précéder la date de naissance"));
    }
    let tx = conn.unchecked_transaction()?;
    let id = insert_new(&tx, "growth_measurements", &data.columns(), false)?;
    audit::log(&tx, "growth.add", "growth_measurement", Some(&id), json!({ "patient_id": data.patient_id }))?;
    tx.commit()?;
    get_record(conn, "growth_measurements", &id, "Mesure")
}

/// Upsert by (patient_id, measured_at date). Used when finalizing/amending a consultation.
pub fn upsert_from_vitals(
    conn: &Connection,
    patient_id: &str,
    measured_at: &str,
    poids_kg: Option<f64>,
    taille_cm: Option<f64>,
    perimetre_cranien_cm: Option<f64>,
) -> AppResult<()> {
    if poids_kg.is_none() && taille_cm.is_none() && perimetre_cranien_cm.is_none() {
        return Ok(());
    }
    patients::require_active(conn, patient_id)?;
    let date = measured_at_date(measured_at)?;
    let data = GrowthData {
        patient_id: patient_id.to_string(),
        measured_at: date.clone(),
        poids_kg,
        taille_cm,
        perimetre_cranien_cm,
        notes: Some("Importé depuis une consultation".into()),
    };
    validate_measurement(&data)?;

    let existing: Option<String> = query_opt(
        conn,
        "SELECT id FROM growth_measurements WHERE patient_id = ?1 AND measured_at = ?2 LIMIT 1",
        rusqlite::params![patient_id, date],
        |r| r.get(0),
    )?;

    let tx = conn.unchecked_transaction()?;
    if let Some(id) = existing {
        update_row(
            &tx,
            "growth_measurements",
            &id,
            &cols![
                "poids_kg" => data.poids_kg,
                "taille_cm" => data.taille_cm,
                "perimetre_cranien_cm" => data.perimetre_cranien_cm,
                "notes" => data.notes,
            ],
            false,
        )?;
        audit::log(
            &tx,
            "growth.upsert_consultation",
            "growth_measurement",
            Some(&id),
            json!({ "patient_id": patient_id, "measured_at": date, "action": "update" }),
        )?;
    } else {
        let id = insert_new(&tx, "growth_measurements", &data.columns(), false)?;
        audit::log(
            &tx,
            "growth.upsert_consultation",
            "growth_measurement",
            Some(&id),
            json!({ "patient_id": patient_id, "measured_at": date, "action": "insert" }),
        )?;
    }
    tx.commit()?;
    Ok(())
}

fn measured_at_date(datetime: &str) -> AppResult<String> {
    let date = datetime.get(..10).unwrap_or(datetime);
    patients::parse_date(date)?;
    Ok(date.to_string())
}

fn validate_measurement(data: &GrowthData) -> AppResult<()> {
    let values = [data.poids_kg, data.taille_cm, data.perimetre_cranien_cm];
    if values.iter().all(Option::is_none) {
        return Err(AppError::validation("Renseignez au moins une mesure (poids, taille ou périmètre crânien)"));
    }
    if values.iter().flatten().any(|v| *v <= 0.0) {
        return Err(AppError::validation("Les mesures doivent être positives"));
    }
    Ok(())
}

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

pub fn chart(conn: &Connection, patient_id: &str) -> AppResult<GrowthChart> {
    let (sexe, birth) = patients::birth_info(conn, patient_id)?;
    let (source, reviewed) = who_lms::sources_for(&sexe);

    let points = list(conn, patient_id)?
        .into_iter()
        .map(|measurement| enrich_point(&sexe, birth, measurement))
        .collect::<AppResult<Vec<_>>>()?;

    let max_age_days = points.iter().map(|p| p.age_days).max().unwrap_or(0);
    let available_indicators = Indicator::all()
        .into_iter()
        .filter(|ind| who_lms::indicator_available(*ind, &sexe, max_age_days) || !who_lms::reference_curve(*ind, &sexe).is_empty())
        .map(Indicator::metric_key)
        .collect();

    Ok(GrowthChart {
        source,
        reviewed,
        points,
        references: IndicatorReferences {
            weight_kg: who_lms::reference_curve(Indicator::WeightForAge, &sexe),
            height_cm: who_lms::reference_curve(Indicator::LengthHeightForAge, &sexe),
            head_cm: who_lms::reference_curve(Indicator::HeadCircumferenceForAge, &sexe),
            bmi: who_lms::reference_curve(Indicator::BmiForAge, &sexe),
        },
        available_indicators,
    })
}

fn enrich_point(
    sexe: &str,
    birth: chrono::NaiveDate,
    measurement: Record<GrowthData>,
) -> AppResult<GrowthChartPoint> {
    let measured = patients::parse_date(&measurement.data.measured_at)?;
    let age_days = (measured - birth).num_days().max(0);
    let age_months = age_days as f64 / DAYS_PER_MONTH;
    let bmi = match (measurement.data.poids_kg, measurement.data.taille_cm) {
        (Some(w), Some(h)) => who_lms::bmi(w, h),
        _ => None,
    };
    let scores = MeasurementScores {
        weight_kg: measurement
            .data
            .poids_kg
            .and_then(|v| who_lms::score_at(Indicator::WeightForAge, sexe, age_days, v)),
        height_cm: measurement
            .data
            .taille_cm
            .and_then(|v| who_lms::score_at(Indicator::LengthHeightForAge, sexe, age_days, v)),
        head_cm: measurement
            .data
            .perimetre_cranien_cm
            .and_then(|v| who_lms::score_at(Indicator::HeadCircumferenceForAge, sexe, age_days, v)),
        bmi: bmi.and_then(|v| who_lms::score_at(Indicator::BmiForAge, sexe, age_days, v)),
    };
    Ok(GrowthChartPoint { measurement, age_days, age_months, bmi, scores })
}
