import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { QueryState } from "@/components/QueryState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useAsync } from "@/hooks/useAsync";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { api } from "@/services/tauri";
import { PatientTable } from "./PatientTable";

export function PatientsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  const [search, setSearch] = useState(urlQuery);
  const [includeArchived, setIncludeArchived] = useState(false);
  const query = useDebouncedValue(search);

  useEffect(() => setSearch(urlQuery), [urlQuery]);

  const patients = useAsync(() => api.patients.list({ query, includeArchived }), [query, includeArchived]);

  return (
    <>
      <PageHeader
        title="Patients"
        description="Dossiers des enfants suivis au cabinet."
        actions={
          <Button onClick={() => navigate("/patients/nouveau")}>
            <Plus className="size-4" /> Ajouter un enfant
          </Button>
        }
      />
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 border-b border-line">
          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, prénom, référence ou téléphone…"
              aria-label="Rechercher un patient"
              className="pl-9"
            />
          </div>
          <Checkbox
            label="Afficher les dossiers archivés"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
        </CardContent>
        <QueryState query={patients}>
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState
                icon={Users}
                title={query ? "Aucun résultat" : "Aucun patient enregistré"}
                description={query ? "Aucun dossier ne correspond à cette recherche." : "Commencez par ajouter un enfant."}
                action={
                  !query && (
                    <Button onClick={() => navigate("/patients/nouveau")}>
                      <Plus className="size-4" /> Ajouter un enfant
                    </Button>
                  )
                }
              />
            ) : (
              <PatientTable patients={rows} onSelect={(p) => navigate(`/patients/${p.id}`)} />
            )
          }
        </QueryState>
      </Card>
    </>
  );
}
