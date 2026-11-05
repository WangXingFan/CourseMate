import type { ReactNode } from "react";
import { useLocale } from "next-intl";

export function AnalyticsSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <label className="flex min-w-0 flex-wrap items-center gap-3 text-sm"><span>{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="h-9 min-w-0 max-w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring">{children}</select></label>;
}

export function AnalyticsReadouts({ values }: { values: { label: string; value: number | null; suffix?: string }[] }) {
  const locale = useLocale();
  return <dl className="grid grid-cols-2 gap-x-5 gap-y-6 border-y border-border py-6 lg:grid-cols-4">{values.map(({ label, value, suffix }) => <div key={label} className="border-l-2 border-primary pl-4"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-2 font-mono text-2xl tabular-nums">{value === null ? "—" : `${value.toLocaleString(locale, { maximumFractionDigits: 1 })}${suffix ?? ""}`}</dd></div>)}</dl>;
}
