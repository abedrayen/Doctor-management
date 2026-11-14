import { z } from "zod";
import type { GrowthMeasurementInput } from "@/types/models";
import { numOrNull } from "@/utils/format";
import { optionalNumber, pastDateField } from "./common";

export const growthSchema = z
  .object({
    measured_at: pastDateField,
    weight_kg: optionalNumber("Poids", 0.3, 150),
    height_cm: optionalNumber("Taille", 20, 220),
    head_cm: optionalNumber("Périmètre crânien", 20, 70),
    notes: z.string(),
  })
  .refine((v) => [v.weight_kg, v.height_cm, v.head_cm].some((x) => x.trim() !== ""), {
    message: "Saisissez au moins une mesure",
    path: ["weight_kg"],
  });

export type GrowthValues = z.infer<typeof growthSchema>;

export const toGrowthInput = (patientId: string, v: GrowthValues): GrowthMeasurementInput => ({
  patient_id: patientId,
  measured_at: v.measured_at,
  weight_kg: numOrNull(v.weight_kg),
  height_cm: numOrNull(v.height_cm),
  head_cm: numOrNull(v.head_cm),
  notes: v.notes,
});
