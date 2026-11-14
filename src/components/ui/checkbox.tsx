import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

export function Checkbox({ label, className, ...props }: Omit<ComponentProps<"input">, "type"> & { label: string }) {
  return (
    <label className={cn("inline-flex items-center gap-2 text-sm text-ink", className)}>
      <input type="checkbox" className="size-4 rounded border-line accent-medical" {...props} />
      {label}
    </label>
  );
}
