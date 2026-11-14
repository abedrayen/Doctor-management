import { z } from "zod";
import { isFutureDate, isIsoDate, isTime } from "@/utils/dates";
import { isValidPhone } from "@/utils/format";

/** Shared zod building blocks. Form values stay strings; conversion happens in `to*Input` helpers. */

export const requiredText = (message: string) => z.string().trim().min(1, message);

const DATE_MESSAGE = "Date invalide (JJ/MM/AAAA)";
export const dateField = z.string().refine(isIsoDate, DATE_MESSAGE);
export const pastDateField = dateField.refine((v) => !isFutureDate(v), "La date ne peut pas être dans le futur");
export const optionalDate = z.string().refine((v) => v === "" || isIsoDate(v), DATE_MESSAGE);
export const timeField = z.string().refine(isTime, "Heure invalide (HH:MM)");

export const phoneField = z.string().refine(isValidPhone, "Numéro invalide (ex. +216 20 123 456)");
export const optionalEmail = z
  .string()
  .trim()
  .refine((v) => v === "" || z.email().safeParse(v).success, "Adresse e-mail invalide");

export const optionalNumber = (label: string, min: number, max: number) =>
  z.string().refine((v) => {
    if (!v.trim()) return true;
    const n = Number(v.trim().replace(",", "."));
    return Number.isFinite(n) && n >= min && n <= max;
  }, `${label} : valeur entre ${min} et ${max}`);

export const requiredNumber = (label: string, min: number, max: number) =>
  optionalNumber(label, min, max).refine((v) => v.trim() !== "", `${label} requis`);

export const enumOf = <T extends string>(labels: Record<T, string>, error: string) =>
  z.enum(Object.keys(labels) as [T, ...T[]], { error });
