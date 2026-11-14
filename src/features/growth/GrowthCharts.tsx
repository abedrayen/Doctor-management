import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GROWTH_METRIC, type GrowthChartData, type GrowthMetric } from "@/types/models";

interface Row {
  age_months: number;
  value?: number;
  p3?: number;
  p50?: number;
  p97?: number;
}

function buildRows(metric: GrowthMetric, data: GrowthChartData): Row[] {
  const rows = new Map<number, Row>();
  const rowAt = (age: number) => {
    if (!rows.has(age)) rows.set(age, { age_months: age });
    return rows.get(age)!;
  };
  data.references[metric].forEach(({ age_months, p3, p50, p97 }) => Object.assign(rowAt(age_months), { p3, p50, p97 }));
  data.points.forEach((p) => {
    const value = p[metric];
    if (value != null) rowAt(p.age_months).value = value;
  });
  return [...rows.values()].sort((a, b) => a.age_months - b.age_months);
}

function MetricChart({ metric, data }: { metric: GrowthMetric; data: GrowthChartData }) {
  const { label, unit } = GROWTH_METRIC[metric];
  const rows = buildRows(metric, data);

  return (
    <Card>
      <CardHeader title={`${label} (${unit}) selon l'âge`} />
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
            <CartesianGrid stroke="#E3E8F0" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="age_months"
              domain={["dataMin", "dataMax"]}
              tick={{ fontSize: 12 }}
              label={{ value: "Âge (mois)", position: "insideBottom", offset: -8, fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} unit={` ${unit}`} width={64} />
            <Tooltip labelFormatter={(age) => `${age} mois`} />
            <Legend verticalAlign="top" height={28} />
            <Line type="monotone" dataKey="p3" name="P3" stroke="#748094" strokeDasharray="4 4" dot={false} connectNulls />
            <Line type="monotone" dataKey="p50" name="P50" stroke="#3B82C4" strokeDasharray="4 4" dot={false} connectNulls />
            <Line type="monotone" dataKey="p97" name="P97" stroke="#748094" strokeDasharray="4 4" dot={false} connectNulls />
            <Line type="monotone" dataKey="value" name="Enfant" stroke="#17365D" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function GrowthCharts({ data }: { data: GrowthChartData }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {(Object.keys(GROWTH_METRIC) as GrowthMetric[]).map((metric) => (
        <MetricChart key={metric} metric={metric} data={data} />
      ))}
    </div>
  );
}
