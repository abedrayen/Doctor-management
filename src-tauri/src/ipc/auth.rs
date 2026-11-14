use serde::{Deserialize, Serialize};

use crate::domain::models::Doctor;

#[derive(Debug, Deserialize)]
pub struct SetupInput {
    pub display_name: String,
    pub specialty: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct DoctorDto {
    pub id: String,
    pub display_name: String,
    pub specialty: String,
}

impl From<Doctor> for DoctorDto {
    fn from(doctor: Doctor) -> Self {
        Self {
            id: doctor.id,
            display_name: doctor.display_name,
            specialty: doctor.specialty.unwrap_or_default(),
        }
    }
}
