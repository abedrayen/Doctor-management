import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

const VARIANTS = {
  error: { icon: XCircle, className: "border-danger/30 bg-danger/8 text-danger" },
  warning: { icon: AlertTriangle, className: "border-warning/40 bg-warning/10 text-[#8a5d0e]" },
  success: { icon: CheckCircle2, className: "border-success/30 bg-success/8 text-success" },
  info: { icon: Info, className: "border-medical/30 bg-medical/8 text-primary" },
} satisfies Record<string, { icon: LucideIcon; className: string }>;

export function Alert({
  variant = "info",
  children,
  className,
}: {
  variant?: keyof typeof VARIANTS;
  children: ReactNode;
  className?: string;
}) {
  const { icon: Icon, className: tone } = VARIANTS[variant];
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm", tone, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
