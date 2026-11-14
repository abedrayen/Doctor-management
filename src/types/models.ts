/**
 * DTOs exchanged with the Rust backend (serde field names, snake_case).
 * Dates: `yyyy-MM-dd`; date-times: `yyyy-MM-ddTHH:mm` (local time).
 * Label maps are the single source of truth for enum values and their French labels.
 */

export const SEX = { M: "Garçon", F: "Fille" } as const;
export type Sex = keyof typeof SEX;

export const CONSULTATION_TYPE = {
  consultation: "Consultation",
  controle: "Contrôle",
  urgence: "Urgence",
  vaccination: "Vaccination",
  certificat: "Certificat",
} as const;
export type ConsultationType = keyof typeof CONSULTATION_TYPE;

export const CONSULTATION_STATUS = { draft: "Brouillon", finalized: "Finalisée" } as const;
export type ConsultationStatus = keyof typeof CONSULTATION_STATUS;

export const APPOINTMENT_STATUS = {
  confirmed: "Confirmé",
  pending: "En attente",
  done: "Terminé",
  cancelled: "Annulé",
  no_show: "Absent",
} as const;
export type AppointmentStatus = keyof typeof APPOINTMENT_STATUS;

export const VACCINATION_STATUS = {
  done: "Effectué",
  upcoming: "À venir",
  overdue: "En retard",
  unknown: "Non renseigné",
} as const;
export type VaccinationStatus = keyof typeof VACCINATION_STATUS;

export const GROWTH_METRIC = {
  weight_kg: { label: "Poids", unit: "kg" },
  height_cm: { label: "Taille", unit: "cm" },
  head_cm: { label: "Périmètre crânien", unit: "cm" },
} as const;
export type GrowthMetric = keyof typeof GROWTH_METRIC;

export const PRINTABLE_KIND = {
  fiche: "Fiche patient",
  consultation: "Consultation",
  historique: "Historique des consultations",
  croissance: "Courbes de croissance",
  vaccinal: "Carnet vaccinal",
} as const;
export type PrintableKind = keyof typeof PRINTABLE_KIND;

/* ---------- Auth ---------- */

export interface Doctor {
  id: string;
  display_name: string;
  specialty: string;
}

export interface SetupInput {
  display_name: string;
  specialty: string;
  password: string;
}

/* ---------- Patients ---------- */

export interface PatientInput {
  // A. Informations personnelles
  nom: string;
  prenom: string;
  date_naissance: string;
  sexe: Sex;
  adresse: string;
  gouvernorat: string;
  delegation: string;
  // B. Parents
  nom_pere: string;
  nom_mere: string;
  telephone_pere: string;
  telephone_mere: string;
  email: string;
  contact_urgence_nom: string;
  contact_urgence_telephone: string;
  // C. Naissance
  terme_semaines: number | null;
  poids_naissance_g: number | null;
  taille_naissance_cm: number | null;
  perimetre_cranien_naissance_cm: number | null;
  apgar_1: number | null;
  apgar_5: number | null;
  mode_accouchement: string;
  // D. Antécédents
  allergies: string;
  maladies_chroniques: string;
  medicaments_en_cours: string;
  antecedents_familiaux: string;
  antecedents_chirurgicaux: string;
  // Notes libres
  notes: string;
}

export interface Patient extends PatientInput {
  id: string;
  reference: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientSummary {
  id: string;
  reference: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  sexe: Sex;
  telephone: string | null;
  derniere_consultation: string | null;
  archived: boolean;
}

export interface ListPatientsArgs {
  query: string;
  includeArchived: boolean;
  limit?: number;
}

export interface PatientOverview {
  patient: Patient;
  consultation_count: number;
  documents_count: number;
  overdue_vaccinations: number;
  last_consultation: ConsultationSummary | null;
  last_measurement: GrowthMeasurement | null;
  next_appointment: Appointment | null;
}

/* ---------- Consultations ---------- */

export interface ConsultationInput {
  patient_id: string;
  consulted_at: string;
  type: ConsultationType;
  motif: string;
  poids_kg: number | null;
  taille_cm: number | null;
  perimetre_cranien_cm: number | null;
  temperature_c: number | null;
  histoire_maladie: string;
  examen_clinique: string;
  diagnostic: string;
  traitement: string;
  conseils: string;
}

export interface Consultation extends ConsultationInput {
  id: string;
  status: ConsultationStatus;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultationAmendment {
  id: string;
  amended_at: string;
  reason: string;
}

export interface ConsultationDetail extends Consultation {
  patient_name: string;
  amendments: ConsultationAmendment[];
}

export interface ConsultationSummary {
  id: string;
  patient_id: string;
  patient_name: string;
  consulted_at: string;
  type: ConsultationType;
  motif: string;
  diagnostic: string;
  status: ConsultationStatus;
}

export interface ListConsultationsArgs {
  patientId?: string | null;
  status?: ConsultationStatus | null;
}

/* ---------- Growth ---------- */

export interface GrowthMeasurementInput {
  patient_id: string;
  measured_at: string;
  weight_kg: number | null;
  height_cm: number | null;
  head_cm: number | null;
  notes: string;
}

export interface GrowthMeasurement extends GrowthMeasurementInput {
  id: string;
}

export interface GrowthPoint {
  measured_at: string;
  age_months: number;
  weight_kg: number | null;
  height_cm: number | null;
  head_cm: number | null;
}

export interface GrowthReferencePoint {
  age_months: number;
  p3: number;
  p50: number;
  p97: number;
}

export interface GrowthChartData {
  /** Label of the local reference dataset (e.g. "OMS - échantillon local v0"). */
  source: string;
  /** False until the doctor has clinically reviewed the reference data. */
  reviewed: boolean;
  points: GrowthPoint[];
  references: Record<GrowthMetric, GrowthReferencePoint[]>;
}

/* ---------- Vaccinations ---------- */

export interface VaccinationRecordInput {
  patient_id: string;
  vaccine_code: string | null;
  vaccine_name: string;
  dose_number: number | null;
  status: VaccinationStatus;
  administered_at: string | null;
  due_date: string | null;
  lot_number: string;
  observations: string;
}

export interface VaccinationRecord extends VaccinationRecordInput {
  id: string;
}

export interface VaccinationScheduleItem {
  vaccine_code: string;
  vaccine_name: string;
  dose_number: number;
  age_label: string;
  due_date: string | null;
}

export interface VaccinationSchedule {
  version: string;
  source: string;
  reviewed: boolean;
  items: VaccinationScheduleItem[];
}

/* ---------- Appointments ---------- */

export interface AppointmentInput {
  patient_id: string;
  starts_at: string;
  duration_minutes: number;
  reason: string;
  status: AppointmentStatus;
  notes: string;
}

export interface Appointment extends AppointmentInput {
  id: string;
  patient_name: string;
}

export interface ListAppointmentsArgs {
  from: string;
  to: string;
  patientId?: string | null;
}

/* ---------- Documents ---------- */

export interface PatientDocument {
  id: string;
  patient_id: string;
  original_name: string;
  mime: string;
  size_bytes: number;
  created_at: string;
}

export interface AttachDocumentArgs {
  patientId: string;
  fileName: string;
  mime: string;
  dataBase64: string;
}

/* ---------- Settings & backup ---------- */

export interface SettingsInput {
  cabinet_name: string;
  cabinet_address: string;
  cabinet_phone: string;
  cabinet_email: string;
  idle_timeout_minutes: number;
  default_appointment_duration_minutes: number;
}

export interface EncryptionStatus {
  database_encrypted: boolean;
  documents_encrypted: boolean;
  key_protection: string;
}

export interface AppSettings extends SettingsInput {
  encryption: EncryptionStatus;
}

export interface BackupEntry {
  id: string;
  created_at: string;
  size_bytes: number;
  checksum: string;
  status: "success" | "failed";
}

export interface DashboardStats {
  patients_total: number;
  consultations_today: number;
  appointments_today: number;
  draft_consultations: number;
  overdue_vaccinations: number;
  recent_patients: PatientSummary[];
}
