import { z } from "zod";
import { dateField, enumOf, optionalNumber, requiredText, timeField } from "@/schemas/common";
import { CONSULTATION_TYPE, type ConsultationInput, type Consultation } from "@/types/models";
import { joinDateTime, nowParts, splitDateTime, todayIso } from "@/utils/dates";
import { numOrNull, numToStr } from "@/utils/format";

export const consultationSchema = z.object({
  patient_id: requiredText("Sélectionnez un enfant"),
  date: dateField,
  time: timeField,
  type: enumOf(CONSULTATION_TYPE, "Le type est requis"),
  motif: requiredText("Le motif est requis"),
  poids_kg: optionalNumber("Poids", 0.3, 150),
  taille_cm: optionalNumber("Taille", 20, 220),
  perimetre_cranien_cm: optionalNumber("Périmètre crânien", 20, 70),
  temperature_c: optionalNumber("Température", 30, 45),
  histoire_maladie: z.string(),
  examen_clinique: z.string(),
  diagnostic: z.string(),
  traitement: z.string(),
  conseils: z.string(),
});

/** Stricter rules applied only when finalizing. */
export const finalizeSchema = consultationSchema.extend({
  diagnostic: requiredText("Le diagnostic est requis pour finaliser"),
});

export type ConsultationValues = z.infer<typeof consultationSchema>;

export const emptyConsultationValues = (patientId: string): ConsultationValues => ({
  patient_id: patientId,
  date: todayIso(),
  time: nowParts().time,
  type: "consultation",
  motif: "",
  poids_kg: "",
  taille_cm: "",
  perimetre_cranien_cm: "",
  temperature_c: "",
  histoire_maladie: "",
  examen_clinique: "",
  diagnostic: "",
  traitement: "",
  conseils: "",
});

export const fromConsultation = (c: Consultation): ConsultationValues => ({
  ...c,
  ...splitDateTime(c.consulted_at),
  poids_kg: numToStr(c.poids_kg),
  taille_cm: numToStr(c.taille_cm),
  perimetre_cranien_cm: numToStr(c.perimetre_cranien_cm),
  temperature_c: numToStr(c.temperature_c),
});

export function toConsultationInput(v: ConsultationValues): ConsultationInput {
  const { date, time, ...rest } = v;
  return {
    ...rest,
    consulted_at: joinDateTime(date, time),
    poids_kg: numOrNull(v.poids_kg),
    taille_cm: numOrNull(v.taille_cm),
    perimetre_cranien_cm: numOrNull(v.perimetre_cranien_cm),
    temperature_c: numOrNull(v.temperature_c),
  };
}
