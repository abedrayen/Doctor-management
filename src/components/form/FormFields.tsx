import { Controller, get, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import { Field } from "@/components/ui/field";
import { DateInput, TimeInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { OptionList, Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/cn";
import { normalizePhone } from "@/utils/format";

export interface FieldDef<T extends FieldValues> {
  name: Path<T>;
  label: string;
  kind?: "text" | "email" | "phone" | "decimal" | "textarea" | "date" | "time" | "select";
  /** `{ value: label }` for `select`. */
  options?: Record<string, string>;
  /** Empty first option label for `select`. */
  emptyOption?: string;
  hint?: string;
  required?: boolean;
  /** Span both columns. */
  wide?: boolean;
}

interface FormFieldsProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  fields: FieldDef<T>[];
  disabled?: boolean;
}

/** Config-driven RHF fields rendered in a responsive two-column grid. */
export function FormFields<T extends FieldValues>({ form, fields, disabled }: FormFieldsProps<T>) {
  const { register, control, setValue, formState } = form;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((def) => {
        const { name, label, kind = "text", options, emptyOption, hint, required, wide } = def;
        const error = (get(formState.errors, name) as { message?: string } | undefined)?.message;
        const fieldProps = { label, error, hint, required, className: cn((wide || kind === "textarea") && "md:col-span-2") };

        if (kind === "date" || kind === "time") {
          const Control = kind === "date" ? DateInput : TimeInput;
          return (
            <Controller
              key={name}
              name={name}
              control={control}
              render={({ field }) => (
                <Field {...fieldProps}>
                  <Control value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} disabled={disabled} />
                </Field>
              )}
            />
          );
        }

        return (
          <Field key={name} {...fieldProps}>
            {kind === "textarea" ? (
              <Textarea {...register(name)} disabled={disabled} />
            ) : kind === "select" ? (
              <Select {...register(name)} disabled={disabled}>
                <OptionList options={options ?? {}} placeholder={emptyOption} />
              </Select>
            ) : (
              <Input
                {...register(
                  name,
                  kind === "phone"
                    ? { onBlur: (e) => setValue(name, normalizePhone(e.target.value) as never) }
                    : undefined,
                )}
                type={kind === "email" ? "email" : "text"}
                inputMode={kind === "decimal" ? "decimal" : kind === "phone" ? "tel" : undefined}
                placeholder={kind === "phone" ? "+216 20 123 456" : undefined}
                disabled={disabled}
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}
