import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";
import { controlClass } from "./input";

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(controlClass, "h-10", className)} {...props} />;
}

/** `<option>` list from a `{ value: label }` map. */
export function OptionList({ options, placeholder }: { options: Record<string, string>; placeholder?: string }) {
  return (
    <>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {Object.entries(options).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </>
  );
}
