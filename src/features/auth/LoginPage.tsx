import { useAuth } from "@/hooks/useAuth";
import { AuthCard } from "./AuthCard";
import { PasswordForm } from "./PasswordForm";

export function LoginPage() {
  const { login } = useAuth();
  return (
    <AuthCard title="Cabinet Pédiatrique" description="Saisissez votre mot de passe pour accéder au cabinet.">
      <PasswordForm submitLabel="Se connecter" onSubmit={login} />
    </AuthCard>
  );
}
