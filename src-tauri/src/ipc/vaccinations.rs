use chrono::{Duration, NaiveDate};
use serde::{Deserialize, Serialize};

use super::{blank_to_none, clean};
use crate::application::vaccinations::VaccinationSchedule as DomainSchedule;
use crate::domain::models::{Record, ScheduleItem, VaccinationData};

const DAYS_PER_MONTH: f64 = 30.4375;

/// `due_date` maps to `next_due_at`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaccinationRecordInput {
    pub patient_id: String,
    pub vaccine_code: Option<String>,
    pub vaccine_name: String,
    pub dose_number: Option<i64>,
    pub status: String,
    pub administered_at: Option<String>,
    pub due_date: Option<String>,
    pub lot_number: String,
    pub observations: String,
}

impl From<VaccinationRecordInput> for VaccinationData {
    fn from(input: VaccinationRecordInput) -> Self {
        Self {
            patient_id: input.patient_id,
            vaccine_code: clean(input.vaccine_code),
            vaccine_name: input.vaccine_name,
            dose_number: input.dose_number,
            status: input.status,
            administered_at: clean(input.administered_at),
            next_due_at: clean(input.due_date),
            lot_number: blank_to_none(&input.lot_number),
            observations: blank_to_none(&input.observations),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct VaccinationRecord {
    #[serde(flatten)]
    pub input: VaccinationRecordInput,
    pub id: String,
}

impl From<Record<VaccinationData>> for VaccinationRecord {
    fn from(record: Record<VaccinationData>) -> Self {
        let data = record.data;
        Self {
            input: VaccinationRecordInput {
                patient_id: data.patient_id,
                vaccine_code: data.vaccine_code,
                vaccine_name: data.vaccine_name,
                dose_number: data.dose_number,
                status: data.status,
                administered_at: data.administered_at,
                due_date: data.next_due_at,
                lot_number: data.lot_number.unwrap_or_default(),
                observations: data.observations.unwrap_or_default(),
            },
            id: record.id,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct VaccinationScheduleItem {
    pub vaccine_code: String,
    pub vaccine_name: String,
    pub dose_number: i64,
    pub age_label: String,
    pub due_date: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct VaccinationSchedule {
    pub version: String,
    pub source: String,
    pub reviewed: bool,
    pub items: Vec<VaccinationScheduleItem>,
}

/// "Naissance", "N mois" or "N ans" from the minimum age of the schedule item.
fn age_label(age_days: i64) -> String {
    if age_days == 0 {
        return "Naissance".to_string();
    }
    let months = (age_days as f64 / DAYS_PER_MONTH).round() as i64;
    if months >= 24 && months % 12 == 0 { format!("{} ans", months / 12) } else { format!("{months} mois") }
}

impl VaccinationSchedule {
    /// Due dates are computed from the patient's birth date and the item's minimum age.
    pub fn for_patient(schedule: DomainSchedule, birth: NaiveDate) -> Self {
        let item = |item: ScheduleItem| VaccinationScheduleItem {
            age_label: item.age_days_min.map(age_label).unwrap_or_default(),
            due_date: item
                .age_days_min
                .map(|days| (birth + Duration::days(days)).format("%Y-%m-%d").to_string()),
            vaccine_code: item.vaccine_code,
            vaccine_name: item.vaccine_name,
            dose_number: item.dose_number,
        };
        Self {
            version: schedule.version.version,
            source: schedule.version.source,
            reviewed: !schedule.requires_doctor_review,
            items: schedule.items.into_iter().map(item).collect(),
        }
    }
}
