import type { ComponentProps } from "react";
import { cn } from "@/utils/cn";
import { controlClass } from "./input";

const chevron =
  "appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pe-9 " +
  "[background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23748094' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]";

/** Native select with fused chrome (chevron inside the same field). */
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(controlClass, chevron, "h-10", className)} {...props} />;
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
