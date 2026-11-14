import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";

export const controlClass =
  "w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-muted/70 transition-colors focus:border-medical focus:outline-2 focus:outline-medical/25 disabled:cursor-not-allowed disabled:bg-app disabled:text-muted";

/** `dir="auto"` lets Arabic and French text each align naturally. */
export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input dir="auto" className={cn(controlClass, "h-10", className)} {...props} />;
}
