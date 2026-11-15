import { useId, type ReactElement, cloneElement } from "react";
import { cn } from "@/utils/cn";
import { Label } from "./label";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  /** A single form control; receives the generated `id` and aria attributes. */
  children: ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }>;
}

export function Field({ label, error, hint, required, className, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-msg`;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </Label>
      {cloneElement(children, {
        id,
        "aria-invalid": Boolean(error) || undefined,
        "aria-describedby": error || hint ? messageId : undefined,
      })}
      {(error || hint) && (
        <p id={messageId} className={cn("text-xs leading-snug", error ? "text-danger" : "text-muted")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
