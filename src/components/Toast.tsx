import { useCallback, useMemo, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { ToastContext, type ToastTone } from "@/hooks/useToast";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

const TONE: Record<ToastTone, string> = {
  success: "border-success/30 bg-success/10 text-success",
  info: "border-medical/30 bg-medical/10 text-primary",
  warning: "border-warning/40 bg-warning/10 text-warning",
  error: "border-danger/30 bg-danger/10 text-danger",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setItems((prev) => [...prev.slice(-2), { id, message, tone }]);
    window.setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(100%-2rem,22rem)] flex-col gap-2"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg",
              TONE[t.tone],
            )}
          >
            <p className="flex-1 font-medium text-ink">{t.message}</p>
            <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => dismiss(t.id)} aria-label="Fermer">
              <X className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
