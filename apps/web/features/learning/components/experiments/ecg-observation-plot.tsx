"use client";

import { useTranslations } from "next-intl";
import { useId, useMemo } from "react";
import { ecgPlots, ecgWindow, type EcgStation } from "@/features/learning/model/virtual-lab-ecg";

export function EcgObservationPlot({ station, widthMs, timeMs = 400, onTime, compare = false }: { station: EcgStation; widthMs: number; timeMs?: number; onTime?: (time: number) => void; compare?: boolean }) {
  const t = useTranslations("learning.virtualLab.ecg");
  const id = useId();
  const width = 400, right = width - 25;
  const plots = useMemo(() => compare ? [ecgPlots("shape", 20)[1], ecgPlots("shape", 80)[1]] : ecgPlots(station, widthMs), [station, widthMs, compare]);
  const noise = station === "noise", timing = station === "timing";
  const low = noise ? -0.24 : -0.4, high = noise ? 0.24 : 1.2;
  const y = (value: number) => 215 - (value - low) / (high - low) * 190;
  const window = ecgWindow(timeMs, widthMs);
  return <div className="space-y-5" data-ecg-plots={station}>
    <div className="grid gap-6 xl:grid-cols-2">{plots.map((plot, index) => {
      const x = (value: number) => 47 + (value - plot.range[0]) / (plot.range[1] - plot.range[0]) * (right - 47);
      const title = compare ? t("plan", { plan: index === 0 ? "A" : "B", width: index === 0 ? 20 : 80 }) : t(index === 0 ? noise ? "noiseInput" : "input" : "output", { width: widthMs });
      return <figure key={`${plot.key}-${index}`} className="min-w-0 space-y-3">
        <figcaption className="text-base">{title}</figcaption>
        <svg viewBox={`0 0 ${width} 255`} role="img" aria-label={title} className="w-full" data-ecg-chart={compare ? `plan-${index}` : plot.key}>
          {[noise ? -0.2 : -0.4, 0, noise ? 0.2 : 0.4, ...(noise ? [] : [0.8, 1.2])].map((value) => <g key={value}><path d={`M47 ${y(value)}H${right}`} stroke="var(--foreground)" opacity={value === 0 ? 0.4 : 0.12} strokeDasharray={value === 0 ? undefined : "2 4"} /><text x="39" y={y(value) + 5} textAnchor="end" fill="currentColor" fontSize="14" fontFamily="var(--font-mono)">{value}</text></g>)}
          {(noise ? [200, 220, 240, 260, 280, 300] : [300, 350, 400, 450, 500, 550]).map((value) => <g key={value}><path d={`M${x(value)} 25V215`} stroke="var(--foreground)" opacity=".12" strokeDasharray="2 4" /><text x={x(value)} y="236" textAnchor="middle" fill="currentColor" fontSize="14" fontFamily="var(--font-mono)">{value}</text></g>)}
          <text x="47" y="17" fill="currentColor" fontSize="14">{t("amplitude")}</text><text x={right} y="254" textAnchor="end" fill="currentColor" fontSize="14">t / ms</text>
          {timing && index === 0 && <g data-ecg-window><rect x={x(window.start)} y="25" width={x(window.end) - x(window.start)} height="190" fill="var(--chart-2)" opacity=".13" /><path d={`M${x(window.center)} 25V215`} stroke="var(--chart-2)" strokeDasharray="3 4" /><path d={`M${x(window.end)} 25V215`} stroke="var(--foreground)" strokeWidth="2" /></g>}
          {plot.series.map((series, i) => <polyline key={series.label} data-ecg-line={i === 0 ? "reference" : "signal"} points={series.points.map(([px, py]) => `${x(px)},${y(py ?? 0)}`).join(" ")} fill="none" stroke={series.color} strokeDasharray={series.dash} strokeWidth={series.width ?? 2.25} />)}
          {timing && index === 1 && <path d={`M${x(timeMs)} 25V215`} stroke="var(--foreground)" strokeWidth="2" />}
        </svg>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">{[t(noise ? "zero" : "clean"), t(compare ? "averaged" : index === 0 ? noise ? "interference" : "noisy" : "averaged")].map((label, i) => <span key={label} className="inline-flex items-center gap-2"><span aria-hidden className={`w-7 border-t-[3px] ${i === 0 ? "border-dashed border-chart-1" : "border-chart-2"}`} />{label}</span>)}</div>
      </figure>;
    })}</div>
    {timing && <div className="space-y-4 border-y border-border py-5" data-ecg-timeline>
      <label htmlFor={id} className="flex flex-wrap items-center justify-between gap-2 text-base"><span>{t("moveTime")}</span><span className="font-mono">t = {timeMs} ms</span></label>
      {onTime && <input id={id} aria-label={t("moveTime")} data-ecg-time type="range" min="380" max="520" step="10" value={timeMs} onChange={(event) => onTime(Number(event.target.value))} className="w-full accent-primary" />}
      <dl className="grid gap-4 sm:grid-cols-3">{[["windowStart", window.start], ["windowCenter", window.center], ["outputTime", window.end]].map(([key, value]) => <div key={key}><dt className="text-sm">{t(String(key))}</dt><dd className="mt-2 font-mono text-lg">{value} ms</dd></div>)}</dl>
      <p className="text-base leading-7">{t("windowRule", { width: widthMs })}</p>
    </div>}
  </div>;
}
