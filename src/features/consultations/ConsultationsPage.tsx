import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { QueryState } from "@/components/QueryState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { OptionList, Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useAsync } from "@/hooks/useAsync";
import { api } from "@/services/tauri";
import { CONSULTATION_STATUS, CONSULTATION_TYPE, type ConsultationStatus, type ConsultationSummary } from "@/types/models";
import { formatDateTime } from "@/utils/dates";
import { PatientSelect, usePatientParam } from "../patients/PatientPicker";

export function ConsultationStatusBadge({ status }: { status: ConsultationStatus }) {
  return <Badge variant={status === "draft" ? "warning" : "success"}>{CONSULTATION_STATUS[status]}</Badge>;
}

export function ConsultationTable({ items, showPatient = true }: { items: ConsultationSummary[]; showPatient?: boolean }) {
  if (items.length === 0) {
    return <EmptyState icon={Stethoscope} title="Aucune consultation" description="Aucune consultation ne correspond à ces critères." />;
  }
  return (
    <Table>
      <THead>
        <TR>
          <TH>Date</TH>
          {showPatient && <TH>Enfant</TH>}
          <TH>Type</TH>
          <TH>Motif</TH>
          <TH>Diagnostic</TH>
          <TH>Statut</TH>
        </TR>
      </THead>
      <TBody>
        {items.map((c) => (
          <TR key={c.id}>
            <TD>
              <Link to={`/consultations/${c.id}`} className="font-semibold text-medical hover:underline">
                {formatDateTime(c.consulted_at)}
              </Link>
            </TD>
            {showPatient && (
              <TD dir="auto" className="font-semibold text-primary">
                {c.patient_name}
              </TD>
            )}
            <TD>{CONSULTATION_TYPE[c.type]}</TD>
            <TD dir="auto">{c.motif || "—"}</TD>
            <TD dir="auto">{c.diagnostic || "—"}</TD>
            <TD>
              <ConsultationStatusBadge status={c.status} />
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

export function ConsultationsPage() {
  const navigate = useNavigate();
  const [patientId, setPatientId] = usePatientParam();
  const [status, setStatus] = useState<ConsultationStatus | "">("");
  const consultations = useAsync(
    () => api.consultations.list({ patientId: patientId || null, status: status || null }),
    [patientId, status],
  );
  const newUrl = `/consultations/nouvelle${patientId ? `?patient=${patientId}` : ""}`;

  return (
    <>
      <PageHeader
        title="Consultations"
        description="Historique des consultations et brouillons en cours."
        actions={
          <Button onClick={() => navigate(newUrl)}>
            <Plus className="size-4" /> Nouvelle consultation
          </Button>
        }
      />
      <Card>
        <CardContent className="grid gap-4 border-b border-line md:grid-cols-[1fr_220px]">
          <Field label="Filtrer par enfant" hint="Conservé lors de la navigation entre modules.">
            <PatientSelect value={patientId} onChange={setPatientId} />
          </Field>
          <Field label="Statut">
            <Select value={status} onChange={(e) => setStatus(e.target.value as ConsultationStatus | "")}>
              <OptionList options={CONSULTATION_STATUS} placeholder="Tous" />
            </Select>
          </Field>
        </CardContent>
        <QueryState query={consultations}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState
                icon={Stethoscope}
                title="Aucune consultation"
                description={patientId ? "Aucune consultation pour cet enfant." : "Aucune consultation ne correspond à ces critères."}
                action={
                  <Button size="sm" onClick={() => navigate(newUrl)}>
                    <Plus className="size-4" /> Nouvelle consultation
                  </Button>
                }
              />
            ) : (
              <ConsultationTable items={items} />
            )
          }
        </QueryState>
      </Card>
    </>
  );
}
