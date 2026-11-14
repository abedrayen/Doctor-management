import { z } from "zod";
import { APPOINTMENT_STATUS, type Appointment, type AppointmentInput } from "@/types/models";
import { joinDateTime, splitDateTime } from "@/utils/dates";
import { enumOf, dateField, requiredNumber, requiredText, timeField } from "./common";

export const appointmentSchema = z.object({
  patient_id: requiredText("Sélectionnez un enfant"),
  date: dateField,
  time: timeField,
  duration_minutes: requiredNumber("Durée", 5, 480),
  reason: z.string(),
  status: enumOf(APPOINTMENT_STATUS, "Le statut est requis"),
  notes: z.string(),
});

export type AppointmentValues = z.infer<typeof appointmentSchema>;

export const fromAppointment = (a: Appointment): AppointmentValues => ({
  patient_id: a.patient_id,
  ...splitDateTime(a.starts_at),
  duration_minutes: String(a.duration_minutes),
  reason: a.reason,
  status: a.status,
  notes: a.notes,
});

export const toAppointmentInput = (v: AppointmentValues): AppointmentInput => ({
  patient_id: v.patient_id,
  starts_at: joinDateTime(v.date, v.time),
  duration_minutes: Number(v.duration_minutes),
  reason: v.reason,
  status: v.status,
  notes: v.notes,
});
