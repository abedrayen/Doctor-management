import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/dates";
import {
  GROWTH_METRIC,
  type GrowthChartData,
  type GrowthMetric,
  type GrowthPoint,
  type GrowthScore,
} from "@/types/models";

interface Row {
  age_months: number;
  value?: number;
  measured_at?: string;
  score?: GrowthScore;
  sd_m3?: number;
  sd_m2?: number;
  sd_m1?: number;
  sd_0?: number;
  sd_p1?: number;
  sd_p2?: number;
  sd_p3?: number;
}

const SD_LINES: { key: keyof Row; name: string; stroke: string; width: number }[] = [
  { key: "sd_m3", name: "−3 ET", stroke: "#D94B4B", width: 1 },
  { key: "sd_m2", name: "−2 ET", stroke: "#D69B35", width: 1 },
  { key: "sd_m1", name: "−1 ET", stroke: "#748094", width: 1 },
  { key: "sd_0", name: "Médiane", stroke: "#3B82C4", width: 1.5 },
  { key: "sd_p1", name: "+1 ET", stroke: "#748094", width: 1 },
  { key: "sd_p2", name: "+2 ET", stroke: "#D69B35", width: 1 },
  { key: "sd_p3", name: "+3 ET", stroke: "#D94B4B", width: 1 },
];

function pointValue(metric: GrowthMetric, p: GrowthPoint): number | null {
  if (metric === "bmi") return p.bmi;
  return p[metric];
}

function pointScore(metric: GrowthMetric, p?: GrowthPoint | null): GrowthScore | null | undefined {
  if (!p) return null;
  return p.scores?.[metric];
}

function buildRows(metric: GrowthMetric, data: GrowthChartData): Row[] {
  const rows = new Map<number, Row>();
  const rowAt = (age: number) => {
    const key = Math.round(age * 1000) / 1000;
    if (!rows.has(key)) rows.set(key, { age_months: key });
    return rows.get(key)!;
  };

  (data.references[metric] ?? []).forEach((ref) => {
    Object.assign(rowAt(ref.age_months), {
      sd_m3: ref.sd_m3,
      sd_m2: ref.sd_m2,
      sd_m1: ref.sd_m1,
      sd_0: ref.sd_0,
      sd_p1: ref.sd_p1,
      sd_p2: ref.sd_p2,
      sd_p3: ref.sd_p3,
    });
  });

  data.points.forEach((p) => {
    const value = pointValue(metric, p);
    if (value == null) return;
    Object.assign(rowAt(p.age_months), {
      value,
      measured_at: p.measured_at,
      score: pointScore(metric, p) ?? undefined,
    });
  });

  return [...rows.values()].sort((a, b) => a.age_months - b.age_months);
}

function formatAge(months: number): string {
  if (months >= 60) {
    const years = months / 12;
    return `${years.toFixed(1)} ans`;
  }
  return `${months.toFixed(1)} mois`;
}

function formatScore(score?: GrowthScore): string {
  if (!score) return "—";
  return `z = ${score.z.toFixed(2)} · P${score.percentile.toFixed(0)}`;
}

function CustomTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: Array<{ payload: Row }>;
  metric: GrowthMetric;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const { unit } = GROWTH_METRIC[metric];
  if (row.value == null) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs shadow-sm">
        <div className="font-medium text-[var(--text)]">{formatAge(row.age_months)}</div>
        <div className="text-[var(--text-secondary)]">Courbes de référence OMS</div>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs shadow-sm space-y-1 min-w-[180px]">
      <div className="font-medium text-[var(--text)]">
        {row.measured_at ? formatDate(row.measured_at) : "—"}
      </div>
      <div className="text-[var(--text-secondary)]">Âge : {formatAge(row.age_months)}</div>
      <div className="text-[var(--text)]">
        Valeur : <strong>{row.value.toFixed(2)} {unit}</strong>
      </div>
      <div className="text-[var(--text)]">{formatScore(row.score)}</div>
    </div>
  );
}

export function GrowthCharts({ data }: { data: GrowthChartData }) {
  const indicators = (data.available_indicators?.length
    ? data.available_indicators
    : (Object.keys(GROWTH_METRIC) as GrowthMetric[])
  ).filter((m) => (data.references[m]?.length ?? 0) > 0 || data.points.some((p) => pointValue(m, p) != null));

  const [metric, setMetric] = useState<GrowthMetric>(indicators[0] ?? "weight_kg");
  const active = indicators.includes(metric) ? metric : (indicators[0] ?? "weight_kg");
  const { label, unit } = GROWTH_METRIC[active];
  const rows = useMemo(() => buildRows(active, data), [active, data]);
  const xMax = Math.max(24, ...rows.map((r) => r.age_months), 0);

  return (
    <Card>
      <CardHeader
        title="Courbe de croissance"
        description="Références OMS (−3 à +3 ET). Interprétation clinique réservée au médecin."
        action={
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Indicateur de croissance">
            {(Object.keys(GROWTH_METRIC) as GrowthMetric[]).map((key) => {
              const enabled = indicators.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active === key}
                  disabled={!enabled}
                  onClick={() => setMetric(key)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    active === key
                      ? "bg-[var(--primary)] text-white"
                      : enabled
                        ? "bg-[var(--bg)] text-[var(--text)] hover:bg-[var(--border)]"
                        : "bg-[var(--bg)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed",
                  )}
                  title={enabled ? GROWTH_METRIC[key].label : "Hors plage OMS pour cet enfant"}
                >
                  {GROWTH_METRIC[key].short}
                </button>
              );
            })}
          </div>
        }
      />
      <CardContent className="space-y-3">
        <p className="text-sm text-[var(--text-secondary)]">
          {label} ({unit})
        </p>
        <div className="h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
              <CartesianGrid stroke="#E3E8F0" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="age_months"
                domain={[0, Math.ceil(xMax)]}
                tick={{ fontSize: 12 }}
                label={{ value: "Âge (mois)", position: "insideBottom", offset: -12, fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} unit={` ${unit}`} width={72} />
              <Tooltip content={<CustomTooltip metric={active} />} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
              {SD_LINES.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.name}
                  stroke={line.stroke}
                  strokeWidth={line.width}
                  strokeDasharray={line.key === "sd_0" ? undefined : "4 4"}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
              <Line
                type="monotone"
                dataKey="value"
                name="Enfant"
                stroke="#17365D"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#17365D" }}
                connectNulls
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export { formatScore, formatAge, pointValue, pointScore };
