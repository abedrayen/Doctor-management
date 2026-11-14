import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";
import { controlClass } from "./input";

export function Textarea({ className, rows = 3, ...props }: ComponentProps<"textarea">) {
  return <textarea dir="auto" rows={rows} className={cn(controlClass, "py-2", className)} {...props} />;
}
