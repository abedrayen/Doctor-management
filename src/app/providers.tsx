import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AuthContext, useAuth, type AuthContextValue, type AuthStatus } from "@/hooks/useAuth";
import { SettingsContext } from "@/hooks/useSettings";
import { api, toErrorMessage } from "@/services/tauri";
import type { AppSettings, Doctor } from "@/types/models";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);
    api.auth.isSetupRequired().then(
      (required) => !cancelled && setStatus(required ? "setup" : "logged-out"),
      (e) => {
        if (cancelled) return;
        setError(toErrorMessage(e));
        setStatus("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const login = useCallback(async (password: string) => {
    setDoctor(await api.auth.login(password));
    setError(null);
    setStatus("authenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      doctor,
      error,
      retry: () => setAttempt((a) => a + 1),
      login,
      setup: async (input) => {
        await api.auth.setupDoctor(input);
        await login(input.password);
      },
      unlock: async (password) => {
        await api.auth.unlockSession(password);
        setError(null);
        setStatus("authenticated");
      },
      lock: async () => {
        setStatus("locked");
        try {
          await api.auth.lockSession();
        } catch (e) {
          setError(toErrorMessage(e));
        }
      },
      logout: async () => {
        await api.auth.logout();
        setDoctor(null);
        setStatus("logged-out");
      },
    }),
    [status, doctor, error, login],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const authenticated = useAuth().status === "authenticated";
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    api.settings.get().then(
      (s) => !cancelled && (setSettings(s), setError(null)),
      (e) => !cancelled && setError(toErrorMessage(e)),
    );
    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  const value = useMemo(() => ({ settings, error, setSettings }), [settings, error]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SettingsProvider>{children}</SettingsProvider>
    </AuthProvider>
  );
}
