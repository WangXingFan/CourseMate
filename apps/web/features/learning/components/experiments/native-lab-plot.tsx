"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import { plotGeometry, plotGroups } from "@/features/learning/model/virtual-lab-native";
import type { LabPlot, VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";
import { useIsMobile } from "@/shared/hooks/use-mobile";

export function NativeLabPlot({ engine, plot, taskID, cursor = null, onCursor, yRange, yTicks }: {
  engine: VirtualLabEngine; plot: LabPlot; taskID: string; cursor?: number | null; onCursor?: (value: number) => void; yRange?: readonly [number, number]; yTicks?: readonly number[];
}) {
  const t = useTranslations("learning.virtualLab.native");
  const clip = useId().replaceAll(":", "");
  const mobile = useIsMobile();
  const width = mobile ? 400 : 900, right = width - 23, ticks = mobile ? 4 : 6;
  const { height, x, y, low, high, columns } = plotGeometry(plot, width, yRange);
  const colors = engine.plot.colors;
  const timeAxis = !plot.xUnit || plot.xUnit === "s";
  const span = plot.range[1] - plot.range[0];
  const precision = ["L1-4", "L2-1", "L2-3", "L2-4", "L3-3"].includes(taskID) ? 3 : taskID === "L3-4" || span < 1 ? 2 : 1;
  const axisLabel = (value: number) => timeAxis ? value.toFixed(precision) : engine.format(value, 3);
  const rawTick = span / ticks, magnitude = 10 ** Math.floor(Math.log10(rawTick));
  const tickStep = ([1, 2, 5, 10].find((step) => step * magnitude >= rawTick) ?? 10) * magnitude;
  const firstTick = Math.ceil(plot.range[0] / tickStep) * tickStep;
  const axisTicks = Array.from({ length: Math.max(0, Math.floor((plot.range[1] - firstTick) / tickStep + 1e-9) + 1) }, (_, index) => firstTick + index * tickStep);
  const clamp = (value: number) => Math.max(plot.range[0], Math.min(plot.range[1], timeAxis ? Number(value.toFixed(precision)) : value));
  const activeCursor = cursor !== null && cursor >= plot.range[0] && cursor <= plot.range[1] ? cursor : null;
  const readings = activeCursor === null ? [] : plot.series.map((series) => ({ label: series.label, value: engine.plot.read(series, activeCursor, plot.breakJump) }));
  const tooltipX = activeCursor === null ? 62 : Math.max(62, Math.min(x(activeCursor) + 8, right - 156));
  return (
    <div className="min-w-0">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} role="img"
      aria-label={`${taskID} ${plot.title}`}
      tabIndex={onCursor ? 0 : undefined} data-chart={plot.key} className="w-full rounded-md bg-card text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onCursor ? (event) => { const bounds = event.currentTarget.getBoundingClientRect(); onCursor(clamp(plot.range[0] + (((event.clientX - bounds.left) / bounds.width * width - 62) / (width - 85)) * (plot.range[1] - plot.range[0]))); } : undefined}
      onKeyDown={onCursor ? (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const step = (timeAxis ? 10 ** -precision : span / 1000) * (event.shiftKey ? 10 : 1);
        onCursor(event.key === "Home" ? plot.range[0] : event.key === "End" ? plot.range[1] : clamp((cursor ?? (plot.range[0] + plot.range[1]) / 2) + (event.key === "ArrowRight" ? step : -step)));
      } : undefined}>
      <title>{taskID} {plot.title}</title>
      <defs><clipPath id={clip}><rect x="62" y="46" width={width - 85} height="195" /></clipPath></defs>
      <g fontFamily="var(--font-mono)" fontSize="14" fill="currentColor">
        <text x="62" y="26" fontSize="15" fontFamily="var(--font-display)" fill="var(--foreground)" fillOpacity="0.75">{plot.yLabel || t("defaultYLabel")}</text><text x={right} y="24" textAnchor="end">{taskID}</text>
        {axisTicks.map((value) => {
          return <g key={value}><path d={`M${x(value)} 46V241`} stroke="var(--border)" strokeDasharray="2 4" /><text x={x(value)} y="264" textAnchor="middle">{axisLabel(value)}</text></g>;
        })}
        {(yTicks ?? Array.from({ length: 5 }, (_, index) => low + (high - low) * index / 4)).map((value) => {
          return <g key={value}><path d={`M62 ${y(value)}H${right}`} stroke="var(--border)" strokeDasharray="2 4" /><text x="54" y={y(value) + 5} textAnchor="end">{engine.format(value, 3)}</text></g>;
        })}
        <path d={`M62 ${y(0)}H${right}`} stroke="var(--foreground)" strokeOpacity="0.45" />
        <text x={right} y="284" textAnchor="end" fontFamily="var(--font-display)" fill="var(--foreground)" fillOpacity="0.75">{plot.xLabel || t("defaultXLabel")}</text>
        {plot.series.map((series, index) => {
          const color = series.color || colors[index % colors.length];
          const legendY = height - 15 - (Math.ceil(plot.series.length / columns) - 1 - Math.floor(index / columns)) * 19;
          return <g key={series.label} data-series={series.label}>
            <g clipPath={`url(#${clip})`}>{plotGroups(series, plot.breakJump).map((group, groupIndex) => {
              const points = group.map(([px, py]) => `${x(px).toFixed(3)},${y(py).toFixed(3)}`).join(" ");
              return <g key={`${series.label}-${groupIndex}`}>
                {series.fill && <polygon points={`${x(group[0][0])},${y(0)} ${points} ${x(group.at(-1)?.[0] ?? group[0][0])},${y(0)}`} fill={color} fillOpacity="0.13" />}
                {!series.pointsOnly && <polyline points={points} fill="none" stroke={color} strokeWidth={series.width ?? 2.25} strokeDasharray={series.dash} />}
                {(series.pointsOnly || series.stems) && group.map(([px, py], pointIndex) => <g key={`${px}-${pointIndex}`}>{series.stems && <path d={`M${x(px)} ${y(0)}V${y(py)}`} stroke={color} strokeWidth="2" />}<circle cx={x(px)} cy={y(py)} r="4" fill="var(--card)" stroke={color} strokeWidth="2" /></g>)}
              </g>;
            })}</g>
            <path d={`M${62 + index % columns * 265} ${legendY - 4}h21`} stroke={color} strokeWidth="2" strokeDasharray={series.dash} />
            <text x={89 + index % columns * 265} y={legendY}>{series.label}</text>
          </g>;
        })}
        {activeCursor !== null && <g data-cursor-marker><path d={`M${x(activeCursor)} 46V241`} stroke="var(--foreground)" strokeDasharray="3 3" />{readings.map(({ label, value }, index) => {
          return value !== null && Number.isFinite(value) ? <g key={label}>
            {readings.length === 1 && <path d={`M62 ${y(value)}H${x(activeCursor)}`} stroke="var(--foreground)" strokeDasharray="3 3" />}
            <circle cx={x(activeCursor)} cy={y(value)} r="4" fill={plot.series[index].color || colors[index % colors.length]} />
          </g> : null;
        })}<rect x={tooltipX - 4} y="45" width="156" height={readings.length === 1 ? 42 : 22} rx="4" fill="var(--card)" fillOpacity="0.95" />
          <text x={tooltipX} y="61" fill="var(--foreground)">{axisLabel(activeCursor)} {plot.xUnit || "s"}</text>
          {readings.length === 1 && <text x={tooltipX} y="80" fill="var(--foreground)">{t("cursorY")} = {readings[0].value === null ? "—" : engine.format(readings[0].value, 4)}</text>}
        </g>}
      </g>
    </svg>
    {activeCursor !== null && <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-3 rounded-md border border-border bg-card p-3 text-sm" data-lab-cursor-readout aria-live="polite">
      <div><dt className="text-muted-foreground">{t("cursorX")}</dt><dd className="mt-1 font-mono text-base">{axisLabel(activeCursor)} {plot.xUnit || "s"}</dd></div>
      {readings.map(({ label, value }) => <div key={label}><dt className="text-muted-foreground">{label} · {plot.yLabel || t("defaultYLabel")}</dt><dd className="mt-1 font-mono text-base">{value === null ? "—" : engine.format(value, 4)}</dd></div>)}
    </dl>}
    </div>
  );
}
