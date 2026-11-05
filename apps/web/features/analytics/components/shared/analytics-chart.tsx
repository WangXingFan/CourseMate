"use client";

import { useLocale } from "next-intl";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function AnalyticsChart({ data, label, kind = "bar", percent = false }: {
  data: { name: string; value: number | null }[];
  label: string;
  kind?: "line" | "bar";
  percent?: boolean;
}) {
  const locale = useLocale();
  const axis = { fontSize: 14, fontFamily: "var(--font-mono)", fill: "var(--muted-foreground)" };
  const plot = <>
    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
    <XAxis dataKey="name" tick={axis} tickLine={false} axisLine={false} minTickGap={24} tickMargin={12} tickFormatter={(value: string) => value.length > 10 ? `${value.slice(0, 9)}…` : value} />
    <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} width={45} domain={percent ? [0, 100] : [0, "auto"]} />
    <Tooltip contentStyle={{ background: "var(--popover)", color: "var(--popover-foreground)", borderColor: "var(--border)", borderRadius: "var(--radius)" }} formatter={(value) => [`${Number(value).toLocaleString(locale, { maximumFractionDigits: 1 })}${percent ? "%" : ""}`, label]} />
  </>;
  return <div className="w-full overflow-x-auto" role="img" aria-label={label}>
    <div className="h-72 min-w-0" style={{ minWidth: kind === "bar" && data.length > 8 ? data.length * 80 : undefined }}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 288 }}>
        {kind === "line" ? <LineChart data={data} margin={{ top: 12, right: 20, bottom: 12, left: 0 }} accessibilityLayer>{plot}<Line dataKey="value" name={label} type="linear" stroke="var(--chart-1)" strokeWidth={2.25} dot={false} isAnimationActive={false} connectNulls={false} /></LineChart>
          : <BarChart data={data} margin={{ top: 12, right: 20, bottom: 12, left: 0 }} accessibilityLayer>{plot}<Bar dataKey="value" name={label} fill="var(--chart-1)" maxBarSize={48} radius={[3, 3, 0, 0]} isAnimationActive={false} /></BarChart>}
      </ResponsiveContainer>
    </div>
  </div>;
}
