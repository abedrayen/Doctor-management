use serde::{Deserialize, Serialize};

use super::blank_to_none;
use crate::application::appointments::AppointmentView;
use crate::domain::models::AppointmentData;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppointmentInput {
    pub patient_id: String,
    pub starts_at: String,
    pub duration_minutes: i64,
    pub reason: String,
    pub status: String,
    pub notes: String,
}

impl From<AppointmentInput> for AppointmentData {
    fn from(input: AppointmentInput) -> Self {
        Self {
            patient_id: input.patient_id,
            starts_at: input.starts_at,
            duration_minutes: input.duration_minutes,
            reason: blank_to_none(&input.reason),
            notes: blank_to_none(&input.notes),
            status: input.status,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct Appointment {
    #[serde(flatten)]
    pub input: AppointmentInput,
    pub id: String,
    pub patient_name: String,
}

impl From<AppointmentView> for Appointment {
    fn from(view: AppointmentView) -> Self {
        let data = view.record.data;
        Self {
            input: AppointmentInput {
                patient_id: data.patient_id,
                starts_at: data.starts_at,
                duration_minutes: data.duration_minutes,
                reason: data.reason.unwrap_or_default(),
                status: data.status,
                notes: data.notes.unwrap_or_default(),
            },
            id: view.record.id,
            patient_name: view.patient_name,
        }
    }
}
