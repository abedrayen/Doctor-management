import { z } from "zod";
import { VACCINATION_STATUS, type VaccinationRecord, type VaccinationRecordInput } from "@/types/models";
import { numOrNull, numToStr } from "@/utils/format";
import { enumOf, optionalDate, optionalNumber, requiredText } from "./common";

export const vaccinationSchema = z
  .object({
    vaccine_name: requiredText("Le vaccin est requis"),
    dose_number: optionalNumber("Dose", 1, 10),
    status: enumOf(VACCINATION_STATUS, "Le statut est requis"),
    administered_at: optionalDate,
    due_date: optionalDate,
    lot_number: z.string(),
    observations: z.string(),
  })
  .refine((v) => v.status !== "done" || v.administered_at !== "", {
    message: "La date d'administration est requise pour un vaccin effectué",
    path: ["administered_at"],
  });

export type VaccinationValues = z.infer<typeof vaccinationSchema>;

export const emptyVaccinationValues: VaccinationValues = {
  vaccine_name: "",
  dose_number: "",
  status: "done",
  administered_at: "",
  due_date: "",
  lot_number: "",
  observations: "",
};

export const fromVaccinationRecord = (r: VaccinationRecord): VaccinationValues => ({
  vaccine_name: r.vaccine_name,
  dose_number: numToStr(r.dose_number),
  status: r.status,
  administered_at: r.administered_at ?? "",
  due_date: r.due_date ?? "",
  lot_number: r.lot_number,
  observations: r.observations,
});

export const toVaccinationInput = (
  patientId: string,
  vaccineCode: string | null,
  v: VaccinationValues,
): VaccinationRecordInput => ({
  patient_id: patientId,
  vaccine_code: vaccineCode,
  vaccine_name: v.vaccine_name,
  dose_number: numOrNull(v.dose_number),
  status: v.status,
  administered_at: v.administered_at || null,
  due_date: v.due_date || null,
  lot_number: v.lot_number,
  observations: v.observations,
});
