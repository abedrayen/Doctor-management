import { createContext, useContext } from "react";
import type { Doctor, SetupInput } from "@/types/models";

export type AuthStatus = "loading" | "error" | "setup" | "logged-out" | "authenticated" | "locked";

export interface AuthContextValue {
  status: AuthStatus;
  doctor: Doctor | null;
  /** Boot error (status "error") or last lock/logout failure. */
  error: string | null;
  retry: () => void;
  setup: (input: SetupInput) => Promise<void>;
  login: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
