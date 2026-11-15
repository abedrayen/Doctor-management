import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAction } from "@/hooks/useAction";
import { loginSchema, type LoginValues } from "@/schemas/authSchemas";

/** Single-password form shared by login and session unlock. */
export function PasswordForm({ submitLabel, onSubmit }: { submitLabel: string; onSubmit: (password: string) => Promise<void> }) {
  const { run, pending, error } = useAction();
  const [show, setShow] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  return (
    <form onSubmit={handleSubmit((v) => run(() => onSubmit(v.password)))} className="space-y-4" noValidate>
      <Field label="Mot de passe" error={errors.password?.message}>
        <div className="relative">
          <Input
            type={show ? "text" : "password"}
            autoFocus
            autoComplete="current-password"
            className="pr-10"
            {...register("password")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 size-8 -translate-y-1/2"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        </div>
      </Field>
      {error && <Alert variant="error">{error}</Alert>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Vérification…" : submitLabel}
      </Button>
    </form>
  );
}
