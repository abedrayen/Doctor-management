use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

use super::blank_to_none;
use crate::application::growth::{GrowthChart, ReferencePoint};
use crate::domain::models::{GrowthData, Record};

/// `weight_kg` / `height_cm` / `head_cm` map to `poids_kg` / `taille_cm` / `perimetre_cranien_cm`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GrowthMeasurementInput {
    pub patient_id: String,
    pub measured_at: String,
    pub weight_kg: Option<f64>,
    pub height_cm: Option<f64>,
    pub head_cm: Option<f64>,
    pub notes: String,
}

impl From<GrowthMeasurementInput> for GrowthData {
    fn from(input: GrowthMeasurementInput) -> Self {
        Self {
            patient_id: input.patient_id,
            measured_at: input.measured_at,
            poids_kg: input.weight_kg,
            taille_cm: input.height_cm,
            perimetre_cranien_cm: input.head_cm,
            notes: blank_to_none(&input.notes),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct GrowthMeasurement {
    #[serde(flatten)]
    pub input: GrowthMeasurementInput,
    pub id: String,
}

impl From<Record<GrowthData>> for GrowthMeasurement {
    fn from(record: Record<GrowthData>) -> Self {
        let data = record.data;
        Self {
            input: GrowthMeasurementInput {
                patient_id: data.patient_id,
                measured_at: data.measured_at,
                weight_kg: data.poids_kg,
                height_cm: data.taille_cm,
                head_cm: data.perimetre_cranien_cm,
                notes: data.notes.unwrap_or_default(),
            },
            id: record.id,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct GrowthPoint {
    pub measured_at: String,
    pub age_months: f64,
    pub weight_kg: Option<f64>,
    pub height_cm: Option<f64>,
    pub head_cm: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct GrowthChartData {
    pub source: String,
    pub reviewed: bool,
    pub points: Vec<GrowthPoint>,
    /// Keys `weight_kg`, `height_cm`, `head_cm`. Only weight-for-age reference data is embedded.
    pub references: BTreeMap<&'static str, Vec<ReferencePoint>>,
}

impl From<GrowthChart> for GrowthChartData {
    fn from(chart: GrowthChart) -> Self {
        let points = chart
            .points
            .into_iter()
            .map(|point| {
                let data = point.measurement.data;
                GrowthPoint {
                    measured_at: data.measured_at,
                    age_months: point.age_months,
                    weight_kg: data.poids_kg,
                    height_cm: data.taille_cm,
                    head_cm: data.perimetre_cranien_cm,
                }
            })
            .collect();
        let references = BTreeMap::from([
            ("weight_kg", chart.weight_reference),
            ("height_cm", Vec::new()),
            ("head_cm", Vec::new()),
        ]);
        Self { source: chart.source, reviewed: chart.reviewed, points, references }
    }
}
