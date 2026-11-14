import { z } from "zod";
import { enumOf, optionalEmail, optionalNumber, pastDateField, phoneField, requiredText } from "@/schemas/common";
import { SEX, type Patient, type PatientInput } from "@/types/models";
import { normalizePhone, numOrNull, numToStr } from "@/utils/format";

const text = z.string();

export const patientSchema = z.object({
  nom: requiredText("Le nom est requis"),
  prenom: requiredText("Le prénom est requis"),
  date_naissance: pastDateField,
  sexe: enumOf(SEX, "Le sexe est requis"),
  adresse: text,
  gouvernorat: text,
  delegation: text,

  nom_pere: text,
  nom_mere: text,
  telephone_pere: phoneField,
  telephone_mere: phoneField,
  email: optionalEmail,
  contact_urgence_nom: text,
  contact_urgence_telephone: phoneField,

  terme_semaines: optionalNumber("Terme", 20, 45),
  poids_naissance_g: optionalNumber("Poids de naissance", 300, 7000),
  taille_naissance_cm: optionalNumber("Taille de naissance", 20, 70),
  perimetre_cranien_naissance_cm: optionalNumber("Périmètre crânien", 20, 50),
  apgar_1: optionalNumber("Apgar 1 min", 0, 10),
  apgar_5: optionalNumber("Apgar 5 min", 0, 10),
  mode_accouchement: text,

  allergies: text,
  maladies_chroniques: text,
  medicaments_en_cours: text,
  antecedents_familiaux: text,
  antecedents_chirurgicaux: text,
  notes: text,
});

export type PatientFormValues = z.infer<typeof patientSchema>;

const NUMERIC_KEYS = [
  "terme_semaines",
  "poids_naissance_g",
  "taille_naissance_cm",
  "perimetre_cranien_naissance_cm",
  "apgar_1",
  "apgar_5",
] as const;

const PHONE_KEYS = ["telephone_pere", "telephone_mere", "contact_urgence_telephone"] as const;

export const emptyPatientValues: Omit<PatientFormValues, "sexe"> = {
  nom: "",
  prenom: "",
  date_naissance: "",
  adresse: "",
  gouvernorat: "",
  delegation: "",
  nom_pere: "",
  nom_mere: "",
  telephone_pere: "",
  telephone_mere: "",
  email: "",
  contact_urgence_nom: "",
  contact_urgence_telephone: "",
  terme_semaines: "",
  poids_naissance_g: "",
  taille_naissance_cm: "",
  perimetre_cranien_naissance_cm: "",
  apgar_1: "",
  apgar_5: "",
  mode_accouchement: "",
  allergies: "",
  maladies_chroniques: "",
  medicaments_en_cours: "",
  antecedents_familiaux: "",
  antecedents_chirurgicaux: "",
  notes: "",
};

function mapKeys<K extends string, V>(keys: readonly K[], fn: (key: K) => V) {
  return Object.fromEntries(keys.map((k) => [k, fn(k)])) as Record<K, V>;
}

// Unknown keys (id, reference, ...) are stripped by the zod resolver on submit.
export const fromPatient = (p: Patient): PatientFormValues => ({
  ...p,
  ...mapKeys(NUMERIC_KEYS, (k) => numToStr(p[k])),
});

export const toPatientInput = (v: PatientFormValues): PatientInput => ({
  ...v,
  ...mapKeys(NUMERIC_KEYS, (k) => numOrNull(v[k])),
  ...mapKeys(PHONE_KEYS, (k) => normalizePhone(v[k])),
});