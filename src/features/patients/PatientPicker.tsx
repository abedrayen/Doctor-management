import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Search, Users, X } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/useAsync";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { api } from "@/services/tauri";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/dates";
import { fullName } from "@/utils/format";

/** Selected patient lives in the URL (`?patient=<id>`) so pages are linkable. */
export function usePatientParam() {
  const [params, setParams] = useSearchParams();
  const patientId = params.get("patient") ?? "";
  const setPatientId = (id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set("patient", id);
    else next.delete("patient");
    setParams(next, { replace: true });
  };
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

/** Searchable patient picker: one field, results list fused underneath. */
export function PatientSelect({ value, onChange, disabled, id, ...aria }: PatientSelectProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);
  const query = useDebouncedValue(filter);
  const list = useAsync(() => api.patients.list({ query, includeArchived: false, limit: 50 }), [query]);
  const selected = useAsync(() => (value ? api.patients.get(value) : Promise.resolve(null)), [value]);

  useEffect(() => {
    if (selected.data) setFilter("");
  }, [selected.data?.id]);

  const options = list.data ?? [];
  const invalid = aria["aria-invalid"];
  const showList = open && !disabled && !value;

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
    setFilter("");
  };

  const clear = () => {
    onChange("");
    setFilter("");
    setOpen(true);
    queueMicrotask(() => inputRef.current?.focus());
  };

  return (
    <div className="space-y-1.5">
      {value && selected.data ? (
        <div
          className={cn(
            "flex items-center justify-between gap-2 rounded-lg border bg-surface px-3 py-2",
            invalid ? "border-danger" : "border-line",
            disabled && "bg-app",
          )}
        >
          <div className="min-w-0">
            <p dir="auto" className="truncate text-sm font-bold text-primary">
              {fullName(selected.data)}
            </p>
            <p className="text-xs text-muted">
              {selected.data.reference} · né(e) le {formatDate(selected.data.date_naissance)}
            </p>
          </div>
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" onClick={clear}>
              <X className="size-3.5" /> Changer
            </Button>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "overflow-hidden rounded-lg border bg-surface transition-colors",
            "focus-within:border-medical focus-within:outline-2 focus-within:outline-medical/25",
            invalid ? "border-danger" : "border-line",
            disabled && "bg-app opacity-80",
          )}
        >
          <div className="flex items-center gap-2 px-3">
            <Search className="size-4 shrink-0 text-muted" aria-hidden />
            <input
              ref={inputRef}
              id={id}
              type="search"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Tapez le nom ou la référence de l'enfant…"
              disabled={disabled}
              aria-autocomplete="list"
              aria-controls={listId}
              aria-expanded={showList}
              className="h-10 w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted/70 disabled:cursor-not-allowed"
              {...aria}
            />
          </div>
          {showList && (
            <div id={listId} role="listbox" className="max-h-56 overflow-y-auto border-t border-line">
              {list.loading && !list.data && (
                <p className="px-3 py-2 text-sm text-muted">Recherche…</p>
              )}
              {list.error && (
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <p className="text-sm text-danger">{list.error}</p>
                  <Button type="button" size="sm" variant="outline" onClick={list.reload}>
                    Réessayer
                  </Button>
                </div>
              )}
              {!list.loading && !list.error && options.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted">
                  {query ? "Aucun enfant trouvé — vérifiez l'orthographe." : "Commencez à taper un nom…"}
                </p>
              )}
              {options.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-app"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(p.id)}
                >
                  <span dir="auto" className="text-sm font-semibold text-primary">
                    {fullName(p)}
                  </span>
                  <span className="text-xs text-muted">
                    {p.reference} · {formatDate(p.date_naissance)}
                  </span>
                </button>
              ))}
              {options.length >= 50 && (
                <p className="border-t border-line px-3 py-2 text-xs text-muted">
                  Affinez la recherche — 50 résultats maximum.
                </p>
              )}
            </div>
          )}
        </div>
      )}
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
  const location = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!patientId) searchRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [patientId, location.pathname]);

  return (
    <>
      <PageHeader title={title} description={description} />
      <Card className="mb-6">
        <CardContent>
          <div ref={searchRef}>
            <Field label="Enfant" hint="Tapez le nom de l'enfant, puis cliquez sur le résultat.">
              <PatientSelect value={patientId} onChange={setPatientId} />
            </Field>
          </div>
        </CardContent>
      </Card>
      {patientId ? (
        children(patientId)
      ) : (
        <Card>
          <EmptyState
            icon={Users}
            title="Sélectionnez un enfant"
            description="Utilisez le champ ci-dessus pour rechercher et choisir un enfant."
          />
        </Card>
      )}
    </>
  );
}
