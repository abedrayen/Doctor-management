import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormFields, type FieldDef } from "@/components/form/FormFields";
import { PrintButton } from "@/components/PrintButton";
import { QueryState } from "@/components/QueryState";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useAction } from "@/hooks/useAction";
import { useAsync } from "@/hooks/useAsync";
import { growthSchema, toGrowthInput, type GrowthValues } from "@/schemas/growthSchemas";
import { api } from "@/services/tauri";
import { formatDate, todayIso } from "@/utils/dates";
import { numToStr } from "@/utils/format";
import { PatientScope } from "../patients/PatientPicker";
import { GrowthCharts } from "./GrowthCharts";

const FIELDS: FieldDef<GrowthValues>[] = [
  { name: "measured_at", label: "Date de mesure", kind: "date", required: true },
  { name: "weight_kg", label: "Poids (kg)", kind: "decimal" },
  { name: "height_cm", label: "Taille (cm)", kind: "decimal" },
  { name: "head_cm", label: "Périmètre crânien (cm)", kind: "decimal" },
  { name: "notes", label: "Notes", kind: "textarea" },
];

export function GrowthPage() {
  return (
    <PatientScope title="Suivi de croissance" description="Poids, taille et périmètre crânien selon l'âge.">
      {(patientId) => <GrowthPanel key={patientId} patientId={patientId} />}
    </PatientScope>
  );
}

export function GrowthPanel({ patientId }: { patientId: string }) {
  const chart = useAsync(() => api.growth.chartData(patientId), [patientId]);
  const measurements = useAsync(() => api.growth.list(patientId), [patientId]);

  return (
    <div className="space-y-6">
      <AddMeasurementForm
        patientId={patientId}
        onSaved={() => {
          chart.reload();
          measurements.reload();
        }}
      />

      <QueryState query={chart}>
        {(data) => (
          <>
            {!data.reviewed && (
              <Alert variant="warning">
                Les courbes de référence OMS sont un <strong>échantillon local en attente de validation clinique</strong>{" "}
                ({data.source}). Elles ne remplacent pas l'avis du médecin.
              </Alert>
            )}
            <GrowthCharts data={data} />
          </>
        )}
      </QueryState>

      <Card>
        <CardHeader
          title="Historique des mesures"
          action={<PrintButton kind="croissance" patientId={patientId} label="Imprimer" />}
        />
        <QueryState query={measurements}>
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState title="Aucune mesure" description="Ajoutez une première mesure pour afficher les courbes." />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Date</TH>
                    <TH>Poids (kg)</TH>
                    <TH>Taille (cm)</TH>
                    <TH>PC (cm)</TH>
                    <TH>Notes</TH>
                  </TR>
                </THead>
                <TBody>
                  {[...rows]
                    .sort((a, b) => b.measured_at.localeCompare(a.measured_at))
                    .map((m) => (
                      <TR key={m.id}>
                        <TD>{formatDate(m.measured_at)}</TD>
                        <TD>{numToStr(m.weight_kg) || "—"}</TD>
                        <TD>{numToStr(m.height_cm) || "—"}</TD>
                        <TD>{numToStr(m.head_cm) || "—"}</TD>
                        <TD dir="auto">{m.notes || "—"}</TD>
                      </TR>
                    ))}
                </TBody>
              </Table>
            )
          }
        </QueryState>
      </Card>
    </div>
  );
}

function AddMeasurementForm({ patientId, onSaved }: { patientId: string; onSaved: () => void }) {
  const { run, pending, error } = useAction();
  const defaults: GrowthValues = { measured_at: todayIso(), weight_kg: "", height_cm: "", head_cm: "", notes: "" };
  const form = useForm<GrowthValues>({ resolver: zodResolver(growthSchema), defaultValues: defaults });

  const onSubmit = form.handleSubmit(async (values) => {
    const saved = await run(() => api.growth.add(toGrowthInput(patientId, values)));
    if (saved) {
      form.reset({ ...defaults, measured_at: values.measured_at });
      onSaved();
    }
  });

  return (
    <Card>
      <CardHeader title="Ajouter une mesure" />
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormFields form={form} fields={FIELDS} />
          {error && <Alert variant="error">{error}</Alert>}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement…" : "Ajouter la mesure"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
