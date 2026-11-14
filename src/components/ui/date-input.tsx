import type { ComponentProps } from "react";
import { formatDate, frDateToIso, isIsoDate, maskDate, maskTime } from "@/utils/dates";
import { Input } from "./input";

type BaseProps = Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type">;

/**
 * Text input displaying `JJ/MM/AAAA` regardless of OS locale.
 * Emits an ISO date once complete and valid, otherwise the raw text (so validation can flag it).
 */
export function DateInput({
  value,
  onChange,
  ...props
}: BaseProps & { value: string; onChange: (value: string) => void }) {
  const display = isIsoDate(value) ? formatDate(value) : value;
  return (
    <Input
      inputMode="numeric"
      placeholder="JJ/MM/AAAA"
      maxLength={10}
      autoComplete="off"
      {...props}
      value={display}
      onChange={(e) => {
        const masked = maskDate(e.target.value);
        onChange(frDateToIso(masked) ?? masked);
      }}
    />
  );
}

/** 24h `HH:mm` text input (independent of OS 12h/24h setting). */
export function TimeInput({
  value,
  onChange,
  ...props
}: BaseProps & { value: string; onChange: (value: string) => void }) {
  return (
    <Input
      inputMode="numeric"
      placeholder="HH:MM"
      maxLength={5}
      autoComplete="off"
      {...props}
      value={value}
      onChange={(e) => onChange(maskTime(e.target.value))}
    />
  );
}
