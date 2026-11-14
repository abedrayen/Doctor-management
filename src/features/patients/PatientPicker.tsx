import { useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAsync } from "@/hooks/useAsync";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { api } from "@/services/tauri";
import { formatDate } from "@/utils/dates";
import { fullName } from "@/utils/format";

/** Selected patient lives in the URL (`?patient=<id>`) so pages are linkable. */
export function usePatientParam() {
  const [params, setParams] = useSearchParams();
  const patientId = params.get("patient") ?? "";
  const setPatientId = (id: string) => setParams(id ? { patient: id } : {}, { replace: true });
  return [patientId, setPatientId] as const;
}

interface PatientSelectProps {
  value: string;
  onChange: (patientId: string) => void;
  disabled?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export function PatientSelect({ value, onChange, disabled, ...aria }: PatientSelectProps) {
  const [filter, setFilter] = useState("");
  const query = useDebouncedValue(filter);
  const list = useAsync(() => api.patients.list({ query, includeArchived: false, limit: 50 }), [query]);
  const selected = useAsync(() => (value ? api.patients.get(value) : Promise.resolve(null)), [value]);

  const options = (list.data ?? []).map((p) => ({ id: p.id, label: `${fullName(p)} — ${formatDate(p.date_naissance)}` }));
  if (selected.data && !options.some((o) => o.id === selected.data!.id)) {
    options.unshift({ id: selected.data.id, label: `${fullName(selected.data)} — ${formatDate(selected.data.date_naissance)}` });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filtrer par nom ou référence…"
        aria-label="Filtrer les enfants"
        className="sm:max-w-xs"
        disabled={disabled}
      />
      <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} {...aria}>
        <option value="">{list.error ? "Chargement impossible" : "— Sélectionner un enfant —"}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

/** Page frame with a patient selector; renders `children(patientId)` once a patient is chosen. */
export function PatientScope({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: (patientId: string) => ReactNode;
}) {
  const [patientId, setPatientId] = usePatientParam();
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card className="mb-6">
        <CardContent>
          <Field label="Enfant">
            <PatientSelect value={patientId} onChange={setPatientId} />
          </Field>
        </CardContent>
      </Card>
      {patientId ? (
        children(patientId)
      ) : (
        <Card>
          <EmptyState icon={Users} title="Sélectionnez un enfant" description="Choisissez un enfant pour afficher ses données." />
        </Card>
      )}
    </>
  );
}
