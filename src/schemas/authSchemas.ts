import { z } from "zod";
import { requiredText } from "./common";

export const MIN_PASSWORD_LENGTH = 8;

const newPassword = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`);

export const loginSchema = z.object({
  password: z.string().min(1, "Le mot de passe est requis"),
});

export const setupSchema = z
  .object({
    display_name: requiredText("Le nom est requis"),
    specialty: requiredText("La spécialité est requise"),
    password: newPassword,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Le mot de passe actuel est requis"),
    next: newPassword,
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SetupValues = z.infer<typeof setupSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
