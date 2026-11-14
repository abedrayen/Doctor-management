import { createContext, useContext } from "react";
import type { AppSettings } from "@/types/models";

export interface SettingsContextValue {
  settings: AppSettings | null;
  error: string | null;
  setSettings: (settings: AppSettings) => void;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings doit être utilisé dans <SettingsProvider>");
  return ctx;
}
