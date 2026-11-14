import { invoke } from "@tauri-apps/api/core";
import type {
  AppSettings,
  Appointment,
  AppointmentInput,
  AttachDocumentArgs,
  BackupEntry,
  Consultation,
  ConsultationDetail,
  ConsultationInput,
  ConsultationSummary,
  DashboardStats,
  Doctor,
  GrowthChartData,
  GrowthMeasurement,
  GrowthMeasurementInput,
  ListAppointmentsArgs,
  ListConsultationsArgs,
  ListPatientsArgs,
  Patient,
  PatientDocument,
  PatientInput,
  PatientOverview,
  PatientSummary,
  PrintableKind,
  SetupInput,
  SettingsInput,
  VaccinationRecord,
  VaccinationRecordInput,
  VaccinationSchedule,
} from "@/types/models";

/**
 * Typed wrappers around Tauri commands. Argument keys are camelCase (Tauri maps them
 * to the snake_case Rust parameters); payload structs use snake_case fields.
 */

export function toErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return "Une erreur inattendue est survenue.";
}

export const api = {
  auth: {
    isSetupRequired: () => invoke<boolean>("is_setup_required"),
    setupDoctor: (input: SetupInput) => invoke<Doctor>("setup_doctor", { input }),
    login: (password: string) => invoke<Doctor>("login", { password }),
    logout: () => invoke<void>("logout"),
    lockSession: () => invoke<void>("lock_session"),
    unlockSession: (password: string) => invoke<void>("unlock_session", { password }),
    getCurrentDoctor: () => invoke<Doctor | null>("get_current_doctor"),
    changePassword: (currentPassword: string, newPassword: string) =>
      invoke<void>("change_password", { currentPassword, newPassword }),
  },

  patients: {
    list: (args: ListPatientsArgs) => invoke<PatientSummary[]>("list_patients", { ...args }),
    get: (patientId: string) => invoke<Patient>("get_patient", { patientId }),
    create: (input: PatientInput) => invoke<Patient>("create_patient", { input }),
    update: (patientId: string, input: PatientInput) => invoke<Patient>("update_patient", { patientId, input }),
    archive: (patientId: string, archived: boolean) => invoke<void>("archive_patient", { patientId, archived }),
    findPossibleDuplicates: (input: PatientInput) =>
      invoke<PatientSummary[]>("find_possible_duplicates", { input }),
    overview: (patientId: string) => invoke<PatientOverview>("get_patient_overview", { patientId }),
  },

  consultations: {
    list: (args: ListConsultationsArgs = {}) => invoke<ConsultationSummary[]>("list_consultations", { ...args }),
    get: (consultationId: string) => invoke<ConsultationDetail>("get_consultation", { consultationId }),
    create: (input: ConsultationInput) => invoke<Consultation>("create_consultation", { input }),
    updateDraft: (consultationId: string, input: ConsultationInput) =>
      invoke<Consultation>("update_draft_consultation", { consultationId, input }),
    finalize: (consultationId: string) => invoke<Consultation>("finalize_consultation", { consultationId }),
    amend: (consultationId: string, reason: string, input: ConsultationInput) =>
      invoke<Consultation>("amend_consultation", { consultationId, reason, input }),
  },

  growth: {
    list: (patientId: string) => invoke<GrowthMeasurement[]>("list_growth_measurements", { patientId }),
    add: (input: GrowthMeasurementInput) => invoke<GrowthMeasurement>("add_growth_measurement", { input }),
    chartData: (patientId: string) => invoke<GrowthChartData>("get_growth_chart_data", { patientId }),
  },

  vaccinations: {
    list: (patientId: string) => invoke<VaccinationRecord[]>("list_vaccination_records", { patientId }),
    upsert: (recordId: string | null, input: VaccinationRecordInput) =>
      invoke<VaccinationRecord>("upsert_vaccination_record", { recordId, input }),
    schedule: (patientId: string) => invoke<VaccinationSchedule>("get_vaccination_schedule", { patientId }),
  },

  appointments: {
    list: (args: ListAppointmentsArgs) => invoke<Appointment[]>("list_appointments", { ...args }),
    create: (input: AppointmentInput) => invoke<Appointment>("create_appointment", { input }),
    update: (appointmentId: string, input: AppointmentInput) =>
      invoke<Appointment>("update_appointment", { appointmentId, input }),
    cancel: (appointmentId: string) => invoke<Appointment>("cancel_appointment", { appointmentId }),
  },

  documents: {
    list: (patientId: string) => invoke<PatientDocument[]>("list_documents", { patientId }),
    attach: (args: AttachDocumentArgs) => invoke<PatientDocument>("attach_document", { ...args }),
    /** Returns the decrypted file content, base64 encoded. */
    getBytes: (documentId: string) => invoke<string>("get_document_bytes", { documentId }),
  },

  settings: {
    get: () => invoke<AppSettings>("get_settings"),
    update: (input: SettingsInput) => invoke<AppSettings>("update_settings", { input }),
    dashboardStats: () => invoke<DashboardStats>("get_dashboard_stats"),
  },

  backups: {
    create: () => invoke<BackupEntry>("create_backup"),
    list: () => invoke<BackupEntry[]>("list_backups"),
    restore: (backupId: string) => invoke<void>("restore_backup", { backupId }),
  },

  printing: {
    generateHtml: (kind: PrintableKind, patientId: string, consultationId?: string) =>
      invoke<string>("generate_printable_html", { kind, patientId, consultationId: consultationId ?? null }),
  },
};
