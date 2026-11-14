import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginPage } from "@/features/auth/LoginPage";
import { SetupPage } from "@/features/auth/SetupPage";
import { useAuth } from "@/hooks/useAuth";
import { IdleLock } from "./IdleLock";

export function AuthGate({ children }: { children: ReactNode }) {
  const { status, error, retry } = useAuth();

  switch (status) {
    case "loading":
      return (
        <div className="flex h-full items-center justify-center" aria-busy="true" aria-label="Chargement">
          <Skeleton className="h-12 w-64" />
        </div>
      );
    case "error":
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="w-full max-w-md space-y-3">
            <Alert variant="error">Impossible de démarrer l'application : {error}</Alert>
            <Button onClick={retry}>Réessayer</Button>
          </div>
        </div>
      );
    case "setup":
      return <SetupPage />;
    case "logged-out":
      return <LoginPage />;
    default:
      return <IdleLock>{children}</IdleLock>;
  }
}
