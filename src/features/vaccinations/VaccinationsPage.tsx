import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { FormFields, type FieldDef } from "@/components/form/FormFields";
import { PrintButton } from "@/components/PrintButton";
import { QueryState } from "@/components/QueryState";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useAction } from "@/hooks/useAction";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/hooks/useToast";
import {
  emptyVaccinationValues,
  fromVaccinationRecord,
  toVaccinationInput,
  vaccinationSchema,
  type VaccinationValues,
} from "@/schemas/vaccinationSchemas";
import { api } from "@/services/tauri";
import {
  VACCINATION_STATUS,
  type VaccinationRecord,
  type VaccinationSchedule,
  type VaccinationScheduleItem,
  type VaccinationStatus,
} from "@/types/models";
import { formatDate } from "@/utils/dates";
import { numOrNull, numToStr } from "@/utils/format";
import { PatientScope } from "../patients/PatientPicker";

const STATUS_VARIANT: Record<VaccinationStatus, BadgeVariant> = {
  done: "success",
  upcoming: "info",
  overdue: "danger",
  unknown: "neutral",
};

const FIELDS: FieldDef<VaccinationValues>[] = [
  { name: "vaccine_name", label: "Vaccin", required: true },
  { name: "dose_number", label: "Dose n°", kind: "decimal" },
  { name: "status", label: "Statut", kind: "select", options: VACCINATION_STATUS, required: true },
  { name: "administered_at", label: "Date d'administration", kind: "date" },
  { name: "due_date", label: "Date prévue", kind: "date" },
  { name: "lot_number", label: "N° de lot" },
  { name: "observations", label: "Observations", kind: "textarea" },
];

interface Row {
  key: string;
  name: string;
  dose: number | null;
  ageLabel: string;
  status: VaccinationStatus;
  administeredAt: string | null;
  dueDate: string | null;
  record?: VaccinationRecord;
  item?: VaccinationScheduleItem;
}

/** Schedule items (with their record when present), followed by records outside the schedule. */
function buildRows(schedule: VaccinationSchedule, records: VaccinationRecord[]): Row[] {
  const used = new Set<string>();
  const rows: Row[] = schedule.items.map((item) => {
    const record = records.find((r) => r.vaccine_code === item.vaccine_code && r.dose_number === item.dose_number);
    if (record) used.add(record.id);
    return {
      key: `${item.vaccine_code}-${item.dose_number}`,
      name: item.vaccine_name,
      dose: item.dose_number,
      ageLabel: item.age_label,
      status: record?.status ?? "unknown",
      administeredAt: record?.administered_at ?? null,
      dueDate: record?.due_date ?? item.due_date,
      record,
      item,
    };
  });
  records
    .filter((r) => !used.has(r.id))
    .forEach((record) =>
      rows.push({
        key: record.id,
        name: record.vaccine_name,
        dose: record.dose_number,
        ageLabel: "Hors calendrier",
        status: record.status,
        administeredAt: record.administered_at,
        dueDate: record.due_date,
        record,
      }),
    );
  return rows;
}

export function VaccinationsPage() {
  return (
    <PatientScope title="Vaccinations" description="Carnet vaccinal selon le calendrier en vigueur.">
      {(patientId) => <VaccinationPanel key={patientId} patientId={patientId} />}
    </PatientScope>
  );
}

export function VaccinationPanel({ patientId }: { patientId: string }) {
  const records = useAsync(() => api.vaccinations.list(patientId), [patientId]);
  const schedule = useAsync(() => api.vaccinations.schedule(patientId), [patientId]);
  const [editing, setEditing] = useState<Row | "new" | null>(null);

  const reload = () => {
    records.reload();
    schedule.reload();
  };

  return (
    <div className="space-y-4">
      {schedule.data && !schedule.data.reviewed && (
        <Alert variant="warning">
          Calendrier vaccinal local ({schedule.data.version} — {schedule.data.source}) à faire valider par le médecin avant
          tout usage clinique. L'application n'enregistre jamais une vaccination automatiquement.
        </Alert>
      )}
      <Card>
        <CardHeader
          title="Carnet vaccinal"
          action={
            <div className="flex items-center gap-2">
              <PrintButton kind="vaccinal" patientId={patientId} label="Imprimer" />
              <Button size="sm" onClick={() => setEditing("new")}>
                <Plus className="size-4" /> Ajouter
              </Button>
            </div>
          }
        />
        <QueryState query={records}>
          {(recordList) => (
            <QueryState query={schedule}>
              {(sched) => (
                <Table>
                  <THead>
                    <TR>
                      <TH>Vaccin</TH>
                      <TH>Dose</TH>
                      <TH>Âge recommandé</TH>
                      <TH>Statut</TH>
                      <TH>Administré le</TH>
                      <TH>Prévu le</TH>
                      <TH className="w-24" />
                    </TR>
                  </THead>
                  <TBody>
                    {buildRows(sched, recordList).map((row) => (
                      <TR key={row.key}>
                        <TD className="font-semibold text-primary">{row.name}</TD>
                        <TD>{numToStr(row.dose) || "—"}</TD>
                        <TD>{row.ageLabel}</TD>
                        <TD>
                          <Badge variant={STATUS_VARIANT[row.status]}>{VACCINATION_STATUS[row.status]}</Badge>
                        </TD>
                        <TD>{formatDate(row.administeredAt)}</TD>
                        <TD>{formatDate(row.dueDate)}</TD>
                        <TD>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(row)}
                            aria-label={`${row.record ? "Modifier" : "Renseigner"} ${row.name}`}
                          >
                            <Pencil className="size-4" /> {row.record ? "Modifier" : "Renseigner"}
                          </Button>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </QueryState>
          )}
        </QueryState>
      </Card>

      {editing && (
        <VaccinationDialog
          patientId={patientId}
          schedule={schedule.data?.items ?? []}
          row={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function VaccinationDialog({
  patientId,
  schedule,
  row,
  onClose,
  onSaved,
}: {
  patientId: string;
  schedule: VaccinationScheduleItem[];
  row?: Row;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { push } = useToast();
  const { run, pending, error } = useAction();
  const initial: VaccinationValues = row?.record
    ? fromVaccinationRecord(row.record)
    : {
        ...emptyVaccinationValues,
        vaccine_name: row?.name ?? "",
        dose_number: numToStr(row?.dose),
        due_date: row?.dueDate ?? "",
      };
  const form = useForm<VaccinationValues>({ resolver: zodResolver(vaccinationSchema), defaultValues: initial });

  const onSubmit = form.handleSubmit(async (values) => {
    const dose = numOrNull(values.dose_number);
    const code =
      row?.record?.vaccine_code ??
      row?.item?.vaccine_code ??
      schedule.find((i) => i.vaccine_name.toLowerCase() === values.vaccine_name.trim().toLowerCase() && i.dose_number === dose)
        ?.vaccine_code ??
      null;
    const saved = await run(() => api.vaccinations.upsert(row?.record?.id ?? null, toVaccinationInput(patientId, code, values)));
    if (saved) {
      push("Vaccination enregistrée.");
      onSaved();
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={row?.record ? "Modifier la vaccination" : "Enregistrer une vaccination"}
      className="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" form="vaccination-form" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </>
      }
    >
      <form id="vaccination-form" onSubmit={onSubmit} noValidate className="space-y-4">
        <FormFields form={form} fields={FIELDS} />
        {error && <Alert variant="error">{error}</Alert>}
      </form>
    </Dialog>
  );
}
