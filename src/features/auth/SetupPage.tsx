import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAction } from "@/hooks/useAction";
import { useAuth } from "@/hooks/useAuth";
import { MIN_PASSWORD_LENGTH, setupSchema, type SetupValues } from "@/schemas/authSchemas";
import { AuthCard } from "./AuthCard";

export function SetupPage() {
  const { setup } = useAuth();
  const { run, pending, error } = useAction();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupValues>({ resolver: zodResolver(setupSchema) });

  return (
    <AuthCard title="Première configuration" description="Créez le compte du médecin. Les données restent 100 % locales.">
      <form
        onSubmit={handleSubmit((v) =>
          run(() => setup({ display_name: v.display_name, specialty: v.specialty, password: v.password })),
        )}
        className="space-y-4"
        noValidate
      >
        <Field label="Nom du médecin" error={errors.display_name?.message} required>
          <Input autoFocus placeholder="Dr Prénom Nom" {...register("display_name")} />
        </Field>
        <Field label="Spécialité" error={errors.specialty?.message} required>
          <Input placeholder="Pédiatrie" {...register("specialty")} />
        </Field>
        <Field
          label="Mot de passe"
          error={errors.password?.message}
          hint={`Au moins ${MIN_PASSWORD_LENGTH} caractères. Il ne peut pas être récupéré en cas d'oubli.`}
          required
        >
          <Input type="password" autoComplete="new-password" {...register("password")} />
        </Field>
        <Field label="Confirmer le mot de passe" error={errors.confirm?.message} required>
          <Input type="password" autoComplete="new-password" {...register("confirm")} />
        </Field>
        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Création…" : "Créer le compte"}
        </Button>
      </form>
    </AuthCard>
  );
}
