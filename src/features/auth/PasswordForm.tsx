import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAction } from "@/hooks/useAction";
import { loginSchema, type LoginValues } from "@/schemas/authSchemas";

/** Single-password form shared by login and session unlock. */
export function PasswordForm({ submitLabel, onSubmit }: { submitLabel: string; onSubmit: (password: string) => Promise<void> }) {
  const { run, pending, error } = useAction();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  return (
    <form onSubmit={handleSubmit((v) => run(() => onSubmit(v.password)))} className="space-y-4" noValidate>
      <Field label="Mot de passe" error={errors.password?.message}>
        <Input type="password" autoFocus autoComplete="current-password" {...register("password")} />
      </Field>
      {error && <Alert variant="error">{error}</Alert>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Vérification…" : submitLabel}
      </Button>
    </form>
  );
}
