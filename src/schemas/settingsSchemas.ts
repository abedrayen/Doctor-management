import { z } from "zod";
import type { AppSettings, SettingsInput } from "@/types/models";
import { isValidPhone, normalizePhone } from "@/utils/format";
import { optionalEmail, requiredNumber } from "./common";

export const DEFAULT_IDLE_TIMEOUT_MINUTES = 15;

export const settingsSchema = z.object({
  cabinet_name: z.string(),
  cabinet_address: z.string(),
  cabinet_phone: z.string().refine(isValidPhone, "Numéro invalide (ex. +216 71 123 456)"),
  cabinet_email: optionalEmail,
  idle_timeout_minutes: requiredNumber("Délai de verrouillage", 1, 240),
  default_appointment_duration_minutes: requiredNumber("Durée", 5, 240),
});

export type SettingsValues = z.infer<typeof settingsSchema>;

export const fromSettings = (s: AppSettings): SettingsValues => ({
  cabinet_name: s.cabinet_name,
  cabinet_address: s.cabinet_address,
  cabinet_phone: s.cabinet_phone,
  cabinet_email: s.cabinet_email,
  idle_timeout_minutes: String(s.idle_timeout_minutes),
  default_appointment_duration_minutes: String(s.default_appointment_duration_minutes),
});

export const toSettingsInput = (v: SettingsValues): SettingsInput => ({
  ...v,
  cabinet_phone: normalizePhone(v.cabinet_phone),
  idle_timeout_minutes: Number(v.idle_timeout_minutes),
  default_appointment_duration_minutes: Number(v.default_appointment_duration_minutes),
});
