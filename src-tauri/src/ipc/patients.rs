use serde::{Deserialize, Serialize};

use super::appointments::Appointment;
use super::blank_to_none;
use super::growth::GrowthMeasurement;
use crate::application::consultations::ConsultationSummary;
use crate::application::patients::PatientOverview as DomainOverview;
use crate::domain::models::*;

/// Separator of the single `contact_urgence` column: `"{nom} / {telephone}"`.
const EMERGENCY_SEPARATOR: &str = " / ";

/// Flat patient form (`PatientInput`), mapped onto the normalized patient tables.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatientInput {
    pub nom: String,
    pub prenom: String,
    pub date_naissance: String,
    pub sexe: String,
    pub adresse: String,
    pub gouvernorat: String,
    pub delegation: String,
    pub nom_pere: String,
    pub nom_mere: String,
    pub telephone_pere: String,
    pub telephone_mere: String,
    pub email: String,
    pub contact_urgence_nom: String,
    pub contact_urgence_telephone: String,
    pub terme_semaines: Option<i64>,
    pub poids_naissance_g: Option<f64>,
    pub taille_naissance_cm: Option<f64>,
    pub perimetre_cranien_naissance_cm: Option<f64>,
    pub apgar_1: Option<i64>,
    pub apgar_5: Option<i64>,
    pub mode_accouchement: String,
    pub allergies: String,
    pub maladies_chroniques: String,
    pub medicaments_en_cours: String,
    pub antecedents_familiaux: String,
    pub antecedents_chirurgicaux: String,
    pub notes: String,
}

impl PatientInput {
    pub fn into_form(self) -> PatientForm {
        let emergency = (!self.contact_urgence_nom.trim().is_empty() || !self.contact_urgence_telephone.trim().is_empty())
            .then(|| {
                format!(
                    "{}{EMERGENCY_SEPARATOR}{}",
                    self.contact_urgence_nom.trim(),
                    self.contact_urgence_telephone.trim()
                )
            });
        PatientForm {
            patient: PatientData {
                nom: self.nom,
                prenom: self.prenom,
                date_naissance: self.date_naissance,
                sexe: self.sexe,
                photo_path: None,
                adresse: blank_to_none(&self.adresse),
                gouvernorat: blank_to_none(&self.gouvernorat),
                delegation: blank_to_none(&self.delegation),
            },
            contact: ContactData {
                nom_pere: blank_to_none(&self.nom_pere),
                prenom_pere: None,
                nom_mere: blank_to_none(&self.nom_mere),
                prenom_mere: None,
                telephone_principal: blank_to_none(&self.telephone_pere),
                telephone_secondaire: blank_to_none(&self.telephone_mere),
                email: blank_to_none(&self.email),
                contact_urgence: emergency,
            },
            history: HistoryData {
                terme_naissance: self.terme_semaines.map(|weeks| weeks.to_string()),
                prematurite: None,
                poids_naissance_kg: self.poids_naissance_g.map(|grams| grams / 1000.0),
                taille_naissance_cm: self.taille_naissance_cm,
                perimetre_cranien_naissance_cm: self.perimetre_cranien_naissance_cm,
                apgar_1: self.apgar_1,
                apgar_5: self.apgar_5,
                type_accouchement: blank_to_none(&self.mode_accouchement),
                infos_naissance: None,
                allergies_connues: blank_to_none(&self.allergies),
                antecedents_medicaux: None,
                antecedents_chirurgicaux: blank_to_none(&self.antecedents_chirurgicaux),
                antecedents_familiaux: blank_to_none(&self.antecedents_familiaux),
                maladies_chroniques: blank_to_none(&self.maladies_chroniques),
                traitements_en_cours: blank_to_none(&self.medicaments_en_cours),
                autres_observations: None,
            },
            notes: blank_to_none(&self.notes).map(|body| NoteData { body }).into_iter().collect(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct Patient {
    #[serde(flatten)]
    pub input: PatientInput,
    pub id: String,
    pub reference: String,
    pub archived_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<PatientDetail> for Patient {
    fn from(detail: PatientDetail) -> Self {
        let PatientRecord { record, meta } = detail.patient;
        let p = record.data;
        let c = detail.contact.map(|r| r.data).unwrap_or_default();
        let h = detail.history.map(|r| r.data).unwrap_or_default();
        let (emergency_name, emergency_phone) = match c.contact_urgence {
            Some(value) => match value.rsplit_once(EMERGENCY_SEPARATOR) {
                Some((name, phone)) => (name.to_string(), phone.to_string()),
                None => (value, String::new()),
            },
            None => Default::default(),
        };
        Self {
            input: PatientInput {
                nom: p.nom,
                prenom: p.prenom,
                date_naissance: p.date_naissance,
                sexe: p.sexe,
                adresse: p.adresse.unwrap_or_default(),
                gouvernorat: p.gouvernorat.unwrap_or_default(),
                delegation: p.delegation.unwrap_or_default(),
                nom_pere: c.nom_pere.unwrap_or_default(),
                nom_mere: c.nom_mere.unwrap_or_default(),
                telephone_pere: c.telephone_principal.unwrap_or_default(),
                telephone_mere: c.telephone_secondaire.unwrap_or_default(),
                email: c.email.unwrap_or_default(),
                contact_urgence_nom: emergency_name,
                contact_urgence_telephone: emergency_phone,
                terme_semaines: h.terme_naissance.and_then(|weeks| weeks.trim().parse().ok()),
                poids_naissance_g: h.poids_naissance_kg.map(|kg| (kg * 1000.0).round()),
                taille_naissance_cm: h.taille_naissance_cm,
                perimetre_cranien_naissance_cm: h.perimetre_cranien_naissance_cm,
                apgar_1: h.apgar_1,
                apgar_5: h.apgar_5,
                mode_accouchement: h.type_accouchement.unwrap_or_default(),
                allergies: h.allergies_connues.unwrap_or_default(),
                maladies_chroniques: h.maladies_chroniques.unwrap_or_default(),
                medicaments_en_cours: h.traitements_en_cours.unwrap_or_default(),
                antecedents_familiaux: h.antecedents_familiaux.unwrap_or_default(),
                antecedents_chirurgicaux: h.antecedents_chirurgicaux.unwrap_or_default(),
                notes: detail.notes.into_iter().next().map(|note| note.data.body).unwrap_or_default(),
            },
            id: record.id,
            reference: meta.reference,
            archived_at: meta.archived_at,
            created_at: record.created_at,
            updated_at: record.updated_at.unwrap_or_default(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct PatientOverview {
    pub patient: Patient,
    pub consultation_count: i64,
    pub documents_count: i64,
    pub overdue_vaccinations: i64,
    pub last_consultation: Option<ConsultationSummary>,
    pub last_measurement: Option<GrowthMeasurement>,
    pub next_appointment: Option<Appointment>,
}

impl From<DomainOverview> for PatientOverview {
    fn from(overview: DomainOverview) -> Self {
        Self {
            patient: overview.detail.into(),
            consultation_count: overview.consultation_count,
            documents_count: overview.documents_count,
            overdue_vaccinations: overview.overdue_vaccinations,
            last_consultation: overview.last_consultation,
            last_measurement: overview.last_measurement.map(Into::into),
            next_appointment: overview.next_appointment.map(Into::into),
        }
    }
}
