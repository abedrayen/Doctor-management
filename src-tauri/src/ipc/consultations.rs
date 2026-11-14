use serde::{Deserialize, Serialize};

use super::blank_to_none;
use crate::domain::models::{ConsultationData, ConsultationDetail as DomainDetail};

/// `ConsultationInput`: `histoire_maladie` -> `symptomes`, `traitement` -> `notes`,
/// `conseils` -> `instructions_suivi`, `type` -> `type_consultation`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsultationInput {
    pub patient_id: String,
    pub consulted_at: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub motif: String,
    pub poids_kg: Option<f64>,
    pub taille_cm: Option<f64>,
    pub perimetre_cranien_cm: Option<f64>,
    pub temperature_c: Option<f64>,
    pub histoire_maladie: String,
    pub examen_clinique: String,
    pub diagnostic: String,
    pub traitement: String,
    pub conseils: String,
}

impl From<ConsultationInput> for ConsultationData {
    fn from(input: ConsultationInput) -> Self {
        Self {
            patient_id: input.patient_id,
            consulted_at: input.consulted_at,
            type_consultation: blank_to_none(&input.kind),
            motif: blank_to_none(&input.motif),
            symptomes: blank_to_none(&input.histoire_maladie),
            temperature_c: input.temperature_c,
            poids_kg: input.poids_kg,
            taille_cm: input.taille_cm,
            perimetre_cranien_cm: input.perimetre_cranien_cm,
            examen_clinique: blank_to_none(&input.examen_clinique),
            diagnostic: blank_to_none(&input.diagnostic),
            instructions_suivi: blank_to_none(&input.conseils),
            notes: blank_to_none(&input.traitement),
            ..Default::default()
        }
    }
}

impl From<ConsultationData> for ConsultationInput {
    fn from(data: ConsultationData) -> Self {
        Self {
            patient_id: data.patient_id,
            consulted_at: data.consulted_at,
            kind: data.type_consultation.unwrap_or_default(),
            motif: data.motif.unwrap_or_default(),
            poids_kg: data.poids_kg,
            taille_cm: data.taille_cm,
            perimetre_cranien_cm: data.perimetre_cranien_cm,
            temperature_c: data.temperature_c,
            histoire_maladie: data.symptomes.unwrap_or_default(),
            examen_clinique: data.examen_clinique.unwrap_or_default(),
            diagnostic: data.diagnostic.unwrap_or_default(),
            traitement: data.notes.unwrap_or_default(),
            conseils: data.instructions_suivi.unwrap_or_default(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct Consultation {
    #[serde(flatten)]
    pub input: ConsultationInput,
    pub id: String,
    pub status: String,
    pub finalized_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<DomainDetail> for Consultation {
    fn from(detail: DomainDetail) -> Self {
        Self {
            input: detail.record.data.into(),
            id: detail.record.id,
            status: detail.state.status,
            finalized_at: detail.state.finalized_at,
            created_at: detail.record.created_at,
            updated_at: detail.record.updated_at.unwrap_or_default(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct ConsultationAmendment {
    pub id: String,
    pub amended_at: String,
    pub reason: String,
}

#[derive(Debug, Serialize)]
pub struct ConsultationDetail {
    #[serde(flatten)]
    pub consultation: Consultation,
    pub patient_name: String,
    pub amendments: Vec<ConsultationAmendment>,
}

impl From<DomainDetail> for ConsultationDetail {
    fn from(detail: DomainDetail) -> Self {
        let patient_name = detail.patient_name.clone();
        // One entry per amended field, so the reason is completed with the field name.
        let amendments = detail
            .amendments
            .iter()
            .map(|amendment| ConsultationAmendment {
                id: amendment.id.clone(),
                amended_at: amendment.created_at.clone(),
                reason: format!("{} (champ : {})", amendment.data.reason, amendment.data.field_name),
            })
            .collect();
        Self { consultation: detail.into(), patient_name, amendments }
    }
}
