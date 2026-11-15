//! WHO LMS engine (Child Growth Standards 2006 + Growth Reference 2007).
//!
//! Reference tables are embedded locally under `database/who/`. Values outside the
//! published age range return `None` — never invent or extrapolate.

use std::collections::HashMap;
use std::sync::OnceLock;

use serde::{Deserialize, Serialize};

const DAYS_PER_MONTH: f64 = 30.4375;
const SD_LEVELS: [f64; 7] = [-3.0, -2.0, -1.0, 0.0, 1.0, 2.0, 3.0];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Indicator {
    WeightForAge,
    LengthHeightForAge,
    HeadCircumferenceForAge,
    BmiForAge,
}

impl Indicator {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::WeightForAge => "weight_for_age",
            Self::LengthHeightForAge => "length_height_for_age",
            Self::HeadCircumferenceForAge => "head_circumference_for_age",
            Self::BmiForAge => "bmi_for_age",
        }
    }

    pub fn metric_key(self) -> &'static str {
        match self {
            Self::WeightForAge => "weight_kg",
            Self::LengthHeightForAge => "height_cm",
            Self::HeadCircumferenceForAge => "head_cm",
            Self::BmiForAge => "bmi",
        }
    }

    pub fn unit(self) -> &'static str {
        match self {
            Self::WeightForAge => "kg",
            Self::LengthHeightForAge => "cm",
            Self::HeadCircumferenceForAge => "cm",
            Self::BmiForAge => "kg/m²",
        }
    }

    pub fn all() -> [Self; 4] {
        [Self::WeightForAge, Self::LengthHeightForAge, Self::HeadCircumferenceForAge, Self::BmiForAge]
    }
}

#[derive(Debug, Clone, Copy)]
pub struct Lms {
    pub l: f64,
    pub m: f64,
    pub s: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct SdCurvePoint {
    pub age_months: f64,
    pub sd_m3: f64,
    pub sd_m2: f64,
    pub sd_m1: f64,
    pub sd_0: f64,
    pub sd_p1: f64,
    pub sd_p2: f64,
    pub sd_p3: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct Score {
    pub z: f64,
    pub percentile: f64,
}

#[derive(Debug, Deserialize)]
struct FileMeta {
    source: String,
    version: String,
    indicator: String,
    sex: String,
    age_unit: String,
    age_min: f64,
    age_max: f64,
    reviewed: bool,
    rows: Vec<[f64; 4]>,
}

#[derive(Debug, Clone)]
struct Table {
    source: String,
    version: String,
    reviewed: bool,
    age_unit_days: bool,
    age_min: f64,
    age_max: f64,
    /// Sorted by age (days or months depending on `age_unit_days`).
    rows: Vec<(f64, Lms)>,
}

type Catalog = HashMap<(Indicator, char), Vec<Table>>;

fn catalog() -> &'static Catalog {
    static CATALOG: OnceLock<Catalog> = OnceLock::new();
    CATALOG.get_or_init(load_catalog)
}

macro_rules! who_file {
    ($name:literal) => {
        ($name, include_str!(concat!("../database/who/", $name)))
    };
}

fn load_catalog() -> Catalog {
    let files = [
        who_file!("wfa_boys_0_5.json"),
        who_file!("wfa_girls_0_5.json"),
        who_file!("lhfa_boys_0_5.json"),
        who_file!("lhfa_girls_0_5.json"),
        who_file!("hcfa_boys_0_5.json"),
        who_file!("hcfa_girls_0_5.json"),
        who_file!("bfa_boys_0_5.json"),
        who_file!("bfa_girls_0_5.json"),
        who_file!("wfa_boys_5_10.json"),
        who_file!("wfa_girls_5_10.json"),
        who_file!("lhfa_boys_5_19.json"),
        who_file!("lhfa_girls_5_19.json"),
        who_file!("bfa_boys_5_19.json"),
        who_file!("bfa_girls_5_19.json"),
    ];

    let mut map: Catalog = HashMap::new();
    for (name, raw) in files {
        let meta: FileMeta = serde_json::from_str(raw)
            .unwrap_or_else(|e| panic!("WHO LMS JSON invalide ({name}): {e}"));
        let indicator = match meta.indicator.as_str() {
            "weight_for_age" => Indicator::WeightForAge,
            "length_height_for_age" => Indicator::LengthHeightForAge,
            "head_circumference_for_age" => Indicator::HeadCircumferenceForAge,
            "bmi_for_age" => Indicator::BmiForAge,
            other => panic!("Indicateur OMS inconnu dans {name}: {other}"),
        };
        let sex = meta.sex.chars().next().unwrap_or('M');
        let age_unit_days = meta.age_unit == "days";
        let rows = meta
            .rows
            .into_iter()
            .map(|[age, l, m, s]| (age, Lms { l, m, s }))
            .collect();
        map.entry((indicator, sex)).or_default().push(Table {
            source: meta.source,
            version: meta.version,
            reviewed: meta.reviewed,
            age_unit_days,
            age_min: meta.age_min,
            age_max: meta.age_max,
            rows,
        });
    }
    for tables in map.values_mut() {
        tables.sort_by(|a, b| a.age_min.partial_cmp(&b.age_min).unwrap());
    }
    map
}

pub fn value_at_z(lms: Lms, z: f64) -> f64 {
    if lms.l.abs() < 1e-9 {
        lms.m * (lms.s * z).exp()
    } else {
        lms.m * (1.0 + lms.l * lms.s * z).powf(1.0 / lms.l)
    }
}

pub fn z_from_value(value: f64, lms: Lms) -> Option<f64> {
    if value <= 0.0 || lms.m <= 0.0 || lms.s <= 0.0 {
        return None;
    }
    let z = if lms.l.abs() < 1e-9 {
        (value / lms.m).ln() / lms.s
    } else {
        ((value / lms.m).powf(lms.l) - 1.0) / (lms.l * lms.s)
    };
    Some(z)
}

/// Standard normal CDF (Abramowitz & Stegun 26.2.17), good enough for clinical display.
pub fn percentile_from_z(z: f64) -> f64 {
    const A1: f64 = 0.254829592;
    const A2: f64 = -0.284496736;
    const A3: f64 = 1.421413741;
    const A4: f64 = -1.453152027;
    const A5: f64 = 1.061405429;
    const P: f64 = 0.3275911;

    let sign = if z < 0.0 { -1.0 } else { 1.0 };
    let x = z.abs() / std::f64::consts::SQRT_2;
    let t = 1.0 / (1.0 + P * x);
    let y = 1.0 - (((((A5 * t + A4) * t) + A3) * t + A2) * t + A1) * t * (-x * x).exp();
    let cdf = 0.5 * (1.0 + sign * y);
    (cdf * 100.0).clamp(0.0, 100.0)
}

pub fn bmi(weight_kg: f64, height_cm: f64) -> Option<f64> {
    if weight_kg <= 0.0 || height_cm <= 0.0 {
        return None;
    }
    let m = height_cm / 100.0;
    Some(weight_kg / (m * m))
}

fn sex_char(sexe: &str) -> char {
    if sexe.eq_ignore_ascii_case("M") { 'M' } else { 'F' }
}

fn select_table(indicator: Indicator, sexe: &str, age_days: i64) -> Option<&'static Table> {
    let age_months = age_days as f64 / DAYS_PER_MONTH;
    let tables = catalog().get(&(indicator, sex_char(sexe)))?;
    // Prefer 2006 (days) while age_days is within that table; else 2007 (months).
    for table in tables {
        if table.age_unit_days {
            let age = age_days as f64;
            if age >= table.age_min && age <= table.age_max {
                return Some(table);
            }
        } else if age_months >= table.age_min && age_months <= table.age_max {
            return Some(table);
        }
    }
    None
}

fn interpolate_lms(table: &Table, age: f64) -> Option<Lms> {
    if age < table.age_min || age > table.age_max || table.rows.is_empty() {
        return None;
    }
    let rows = &table.rows;
    if age <= rows[0].0 {
        return Some(rows[0].1);
    }
    if age >= rows[rows.len() - 1].0 {
        return Some(rows[rows.len() - 1].1);
    }
    let idx = rows.partition_point(|(a, _)| *a < age).saturating_sub(1);
    let (a0, l0) = rows[idx];
    let (a1, l1) = rows[idx + 1];
    if (a1 - a0).abs() < 1e-12 {
        return Some(l0);
    }
    let t = (age - a0) / (a1 - a0);
    Some(Lms {
        l: l0.l + t * (l1.l - l0.l),
        m: l0.m + t * (l1.m - l0.m),
        s: l0.s + t * (l1.s - l0.s),
    })
}

fn age_in_table_units(table: &Table, age_days: i64) -> f64 {
    if table.age_unit_days {
        age_days as f64
    } else {
        age_days as f64 / DAYS_PER_MONTH
    }
}

pub fn score_at(indicator: Indicator, sexe: &str, age_days: i64, value: f64) -> Option<Score> {
    let table = select_table(indicator, sexe, age_days)?;
    let lms = interpolate_lms(table, age_in_table_units(table, age_days))?;
    let z = z_from_value(value, lms)?;
    Some(Score { z, percentile: percentile_from_z(z) })
}

pub fn sources_for(sexe: &str) -> (String, bool) {
    let sex = sex_char(sexe);
    let mut parts = Vec::new();
    let mut reviewed = true;
    for indicator in Indicator::all() {
        if let Some(tables) = catalog().get(&(indicator, sex)) {
            for t in tables {
                reviewed &= t.reviewed;
                let label = format!("{} ({})", t.version, t.source);
                if !parts.contains(&label) {
                    parts.push(label);
                }
            }
        }
    }
    if parts.is_empty() {
        ("OMS — aucune table chargée".into(), false)
    } else {
        (parts.join(" · "), reviewed)
    }
}

/// Reference SD curves for charting. Monthly sampling inside each covering table.
pub fn reference_curve(indicator: Indicator, sexe: &str) -> Vec<SdCurvePoint> {
    let Some(tables) = catalog().get(&(indicator, sex_char(sexe))) else {
        return Vec::new();
    };
    let mut points = Vec::new();
    for table in tables {
        if table.age_unit_days {
            // Sample every ~1 month across 0–60 months.
            let mut day = table.age_min as i64;
            let max = table.age_max as i64;
            while day <= max {
                if let Some(lms) = interpolate_lms(table, day as f64) {
                    points.push(sd_point(day as f64 / DAYS_PER_MONTH, lms));
                }
                day += 30;
            }
            if let Some(lms) = interpolate_lms(table, table.age_max) {
                let age_m = table.age_max / DAYS_PER_MONTH;
                if points.last().map(|p| (p.age_months - age_m).abs() > 0.05).unwrap_or(true) {
                    points.push(sd_point(age_m, lms));
                }
            }
        } else {
            for &(age_months, lms) in &table.rows {
                points.push(sd_point(age_months, lms));
            }
        }
    }
    points.sort_by(|a, b| a.age_months.partial_cmp(&b.age_months).unwrap());
    points.dedup_by(|a, b| (a.age_months - b.age_months).abs() < 1e-6);
    points
}

fn sd_point(age_months: f64, lms: Lms) -> SdCurvePoint {
    let vals: Vec<f64> = SD_LEVELS.iter().map(|z| value_at_z(lms, *z)).collect();
    SdCurvePoint {
        age_months,
        sd_m3: vals[0],
        sd_m2: vals[1],
        sd_m1: vals[2],
        sd_0: vals[3],
        sd_p1: vals[4],
        sd_p2: vals[5],
        sd_p3: vals[6],
    }
}

pub fn indicator_available(indicator: Indicator, sexe: &str, age_days: i64) -> bool {
    select_table(indicator, sexe, age_days).is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn value_z_roundtrip_near_median() {
        let lms = Lms { l: -0.2, m: 10.0, s: 0.1 };
        let y = value_at_z(lms, 0.0);
        assert!((y - 10.0).abs() < 1e-9);
        let z = z_from_value(y, lms).unwrap();
        assert!(z.abs() < 1e-9);
    }

    #[test]
    fn out_of_range_hc_for_teen_is_none() {
        // ~12 years
        let age_days = (12.0 * 365.25) as i64;
        assert!(score_at(Indicator::HeadCircumferenceForAge, "M", age_days, 52.0).is_none());
        assert!(!indicator_available(Indicator::HeadCircumferenceForAge, "M", age_days));
    }

    #[test]
    fn infant_weight_has_score() {
        let score = score_at(Indicator::WeightForAge, "M", 90, 6.0).expect("WFA at 3 months");
        assert!(score.z.is_finite());
        assert!(score.percentile > 0.0 && score.percentile < 100.0);
    }

    #[test]
    fn bmi_formula() {
        assert!((bmi(16.0, 100.0).unwrap() - 16.0).abs() < 1e-9);
        assert!(bmi(0.0, 100.0).is_none());
    }

    #[test]
    fn percentile_of_zero_is_fifty() {
        assert!((percentile_from_z(0.0) - 50.0).abs() < 0.1);
    }

    #[test]
    fn reference_curve_not_empty_for_wfa_boys() {
        assert!(!reference_curve(Indicator::WeightForAge, "M").is_empty());
    }
}
