import { useCallback, useState } from "react";
import { toErrorMessage } from "@/services/tauri";

/** Wraps a mutation: tracks pending/error state and resolves to `undefined` on failure. */
export function useAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T>(action: () => Promise<T>): Promise<T | undefined> => {
    setPending(true);
    setError(null);
    try {
      return await action();
    } catch (e) {
      setError(toErrorMessage(e));
      return undefined;
    } finally {
      setPending(false);
    }
  }, []);

  return { run, pending, error, setError };
}
