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
import { useToast } from "@/hooks/useToast";
import { growthSchema, toGrowthInput, type GrowthValues } from "@/schemas/growthSchemas";
import { api } from "@/services/tauri";
import type { GrowthChartData, GrowthMeasurement } from "@/types/models";
import { formatDate, todayIso } from "@/utils/dates";
import { numToStr } from "@/utils/format";
import { PatientScope } from "../patients/PatientPicker";
import { GrowthCharts, formatAge, formatScore, pointScore } from "./GrowthCharts";

const FIELDS: FieldDef<GrowthValues>[] = [
  { name: "measured_at", label: "Date de mesure", kind: "date", required: true },
  { name: "weight_kg", label: "Poids (kg)", kind: "decimal" },
  { name: "height_cm", label: "Taille (cm)", kind: "decimal" },
  { name: "head_cm", label: "Périmètre crânien (cm)", kind: "decimal" },
  { name: "notes", label: "Notes", kind: "textarea" },
];

export function GrowthPage() {
  return (
    <PatientScope
      title="Courbe de croissance"
      description="Références OMS — poids, taille, périmètre crânien et IMC."
    >
      {(patientId) => <GrowthPanel key={patientId} patientId={patientId} />}
    </PatientScope>
  );
}

export function GrowthPanel({ patientId }: { patientId: string }) {
  const chart = useAsync(() => api.growth.chartData(patientId), [patientId]);
  const measurements = useAsync(() => api.growth.list(patientId), [patientId]);

  return (
    <div className="space-y-6">
      <QueryState query={chart}>
        {(data) => (
          <>
            {!data.reviewed && (
              <Alert variant="warning">
                Les tables LMS OMS sont embarquées localement mais{" "}
                <strong>en attente de validation clinique</strong> ({data.source}). Elles ne
                remplacent pas l&apos;avis du médecin. Aucun diagnostic automatique n&apos;est
                posé.
              </Alert>
            )}
            <GrowthCharts data={data} />
            <HistoryTable patientId={patientId} measurements={measurements} chart={data} />
          </>
        )}
      </QueryState>

      <AddMeasurementForm
        patientId={patientId}
        onSaved={() => {
          chart.reload();
          measurements.reload();
        }}
      />
    </div>
  );
}

function HistoryTable({
  patientId,
  measurements,
  chart,
}: {
  patientId: string;
  measurements: ReturnType<typeof useAsync<GrowthMeasurement[]>>;
  chart: GrowthChartData;
}) {
  const scoreByDate = new Map(chart.points.map((p) => [p.measured_at.slice(0, 10), p]));

  return (
    <Card>
      <CardHeader
        title="Historique des mesures"
        action={<PrintButton kind="croissance" patientId={patientId} label="Imprimer" />}
      />
      <QueryState query={measurements}>
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState
              title="Aucune mesure"
              description="Ajoutez une mesure ou finalisez une consultation avec des constantes."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Âge</TH>
                  <TH>Poids</TH>
                  <TH>Taille</TH>
                  <TH>PC</TH>
                  <TH>IMC</TH>
                  <TH>Notes</TH>
                </TR>
              </THead>
              <TBody>
                {[...rows]
                  .sort((a, b) => b.measured_at.localeCompare(a.measured_at))
                  .map((m) => {
                    const point = scoreByDate.get(m.measured_at.slice(0, 10));
                    return (
                      <TR key={m.id}>
                        <TD>{formatDate(m.measured_at)}</TD>
                        <TD>{point ? formatAge(point.age_months) : "—"}</TD>
                        <TD>
                          <ScoreCell value={numToStr(m.weight_kg)} unit="kg" score={pointScore("weight_kg", point)} />
                        </TD>
                        <TD>
                          <ScoreCell value={numToStr(m.height_cm)} unit="cm" score={pointScore("height_cm", point)} />
                        </TD>
                        <TD>
                          <ScoreCell value={numToStr(m.head_cm)} unit="cm" score={pointScore("head_cm", point)} />
                        </TD>
                        <TD>
                          <ScoreCell
                            value={point?.bmi != null ? point.bmi.toFixed(1) : ""}
                            unit="kg/m²"
                            score={pointScore("bmi", point)}
                          />
                        </TD>
                        <TD dir="auto">{m.notes || "—"}</TD>
                      </TR>
                    );
                  })}
              </TBody>
            </Table>
          )
        }
      </QueryState>
    </Card>
  );
}

function ScoreCell({
  value,
  unit,
  score,
}: {
  value: string;
  unit: string;
  score?: { z: number; percentile: number } | null;
}) {
  if (!value) return <>—</>;
  return (
    <div className="space-y-0.5">
      <div>
        {value} {unit}
      </div>
      {score && <div className="text-xs text-[var(--text-secondary)]">{formatScore(score)}</div>}
    </div>
  );
}

function AddMeasurementForm({ patientId, onSaved }: { patientId: string; onSaved: () => void }) {
  const { run, pending, error } = useAction();
  const { push } = useToast();
  const defaults: GrowthValues = {
    measured_at: todayIso(),
    weight_kg: "",
    height_cm: "",
    head_cm: "",
    notes: "",
  };
  const form = useForm<GrowthValues>({ resolver: zodResolver(growthSchema), defaultValues: defaults });

  const onSubmit = form.handleSubmit(async (values) => {
    const saved = await run(() => api.growth.add(toGrowthInput(patientId, values)));
    if (saved) {
      form.reset({ ...defaults, measured_at: values.measured_at });
      push("Mesure enregistrée.");
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
