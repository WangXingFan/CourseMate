"use client";

import { useId } from "react";
import { plotGeometry, plotGroups } from "@/features/learning/model/virtual-lab-native";
import type { LabPlot, VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";

export function NativeLabPlot({ engine, plot, taskID, cursor = null, onCursor }: {
  engine: VirtualLabEngine; plot: LabPlot; taskID: string; cursor?: number | null; onCursor?: (value: number) => void;
}) {
  const clip = useId().replaceAll(":", "");
  const { height, x, y, low, high } = plotGeometry(plot);
  const colors = engine.plot.colors;
  const clamp = (value: number) => Math.max(plot.range[0], Math.min(plot.range[1], value));
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 900 ${height}`} role="img"
      aria-label={`${taskID} ${plot.title}`}
      tabIndex={onCursor ? 0 : undefined} data-chart={plot.key} className="w-full rounded-md bg-card text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onCursor ? (event) => { const bounds = event.currentTarget.getBoundingClientRect(); onCursor(clamp(plot.range[0] + (((event.clientX - bounds.left) / bounds.width * 900 - 62) / 815) * (plot.range[1] - plot.range[0]))); } : undefined}
      onKeyDown={onCursor ? (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const step = (plot.range[1] - plot.range[0]) / 1000 * (event.shiftKey ? 10 : 1);
        onCursor(event.key === "Home" ? plot.range[0] : event.key === "End" ? plot.range[1] : clamp((cursor ?? (plot.range[0] + plot.range[1]) / 2) + (event.key === "ArrowRight" ? step : -step)));
      } : undefined}>
      <title>{taskID} {plot.title}</title>
      <defs><clipPath id={clip}><rect x="62" y="46" width="815" height="195" /></clipPath></defs>
      <g fontFamily="var(--font-mono)" fontSize="14" fill="currentColor">
        <text x="62" y="26" fontSize="15" fontFamily="var(--font-display)" fill="var(--foreground)" fillOpacity="0.75">{plot.yLabel || "归一化幅度"}</text><text x="877" y="24" textAnchor="end">{taskID}</text>
        {Array.from({ length: 7 }, (_, index) => {
          const value = plot.range[0] + (plot.range[1] - plot.range[0]) * index / 6;
          return <g key={value}><path d={`M${x(value)} 46V241`} stroke="var(--border)" strokeDasharray="2 4" /><text x={x(value)} y="264" textAnchor="middle">{engine.format(value, 3)}</text></g>;
        })}
        {Array.from({ length: 5 }, (_, index) => {
          const value = low + (high - low) * index / 4;
          return <g key={value}><path d={`M62 ${y(value)}H877`} stroke="var(--border)" strokeDasharray="2 4" /><text x="54" y={y(value) + 5} textAnchor="end">{engine.format(value, 3)}</text></g>;
        })}
        <path d={`M62 ${y(0)}H877`} stroke="var(--foreground)" strokeOpacity="0.45" />
        <text x="877" y="284" textAnchor="end" fontFamily="var(--font-display)" fill="var(--foreground)" fillOpacity="0.75">{plot.xLabel || "时间 t / s"}</text>
        {plot.series.map((series, index) => {
          const color = series.color || colors[index % colors.length];
          const legendY = height - 15 - (Math.ceil(plot.series.length / 3) - 1 - Math.floor(index / 3)) * 19;
          return <g key={series.label}>
            <g clipPath={`url(#${clip})`}>{plotGroups(series, plot.breakJump).map((group, groupIndex) => {
              const points = group.map(([px, py]) => `${x(px).toFixed(3)},${y(py).toFixed(3)}`).join(" ");
              return <g key={`${series.label}-${groupIndex}`}>
                {series.fill && <polygon points={`${x(group[0][0])},${y(0)} ${points} ${x(group.at(-1)?.[0] ?? group[0][0])},${y(0)}`} fill={color} fillOpacity="0.13" />}
                {!series.pointsOnly && <polyline points={points} fill="none" stroke={color} strokeWidth={series.width ?? 2.25} strokeDasharray={series.dash} />}
                {(series.pointsOnly || series.stems) && group.map(([px, py], pointIndex) => <g key={`${px}-${pointIndex}`}>{series.stems && <path d={`M${x(px)} ${y(0)}V${y(py)}`} stroke={color} strokeWidth="2" />}<circle cx={x(px)} cy={y(py)} r="4" fill="var(--card)" stroke={color} strokeWidth="2" /></g>)}
              </g>;
            })}</g>
            <path d={`M${62 + index % 3 * 265} ${legendY - 4}h21`} stroke={color} strokeWidth="2" strokeDasharray={series.dash} />
            <text x={89 + index % 3 * 265} y={legendY}>{series.label}</text>
          </g>;
        })}
        {cursor !== null && cursor >= plot.range[0] && cursor <= plot.range[1] && <g><path d={`M${x(cursor)} 46V241`} stroke="var(--foreground)" strokeDasharray="3 3" />{plot.series.map((series, index) => {
          const value = engine.plot.read(series, cursor, plot.breakJump);
          return value !== null && Number.isFinite(value) ? <circle key={series.label} cx={x(cursor)} cy={y(value)} r="4" fill={series.color || colors[index % colors.length]} /> : null;
        })}<text x={Math.min(x(cursor) + 8, 760)} y="60" fill="var(--foreground)">{engine.format(cursor, 4)} {plot.xUnit || "s"}</text></g>}
      </g>
    </svg>
  );
}
