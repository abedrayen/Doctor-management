import type { ReactNode } from "react";

export function InfoGrid({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-bold uppercase tracking-wide text-muted">{label}</dt>
          <dd dir="auto" className="mt-1 whitespace-pre-wrap text-sm text-ink">
            {value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
