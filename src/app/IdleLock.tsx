import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { AuthCard } from "@/features/auth/AuthCard";
import { PasswordForm } from "@/features/auth/PasswordForm";
import { useAuth } from "@/hooks/useAuth";
import { useIdleLock } from "@/hooks/useIdleLock";
import { useSettings } from "@/hooks/useSettings";
import { DEFAULT_IDLE_TIMEOUT_MINUTES } from "@/schemas/settingsSchemas";

/** Locks the session after inactivity and covers the app with an opaque unlock screen. */
export function IdleLock({ children }: { children: ReactNode }) {
  const { status, error, lock, unlock } = useAuth();
  const { settings } = useSettings();

  useIdleLock({
    timeoutMinutes: settings?.idle_timeout_minutes ?? DEFAULT_IDLE_TIMEOUT_MINUTES,
    enabled: status === "authenticated",
    onIdle: () => void lock(),
  });

  return (
    <>
      {children}
      {status === "locked" && (
        <div className="fixed inset-0 z-[100] bg-app">
          <AuthCard title="Session verrouillée" description="Saisissez votre mot de passe pour reprendre.">
            {error && <Alert variant="error" className="mb-4">{error}</Alert>}
            <PasswordForm submitLabel="Déverrouiller" onSubmit={unlock} />
          </AuthCard>
        </div>
      )}
    </>
  );
}
