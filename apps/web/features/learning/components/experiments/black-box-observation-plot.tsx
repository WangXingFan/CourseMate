"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { LabPaperResponse } from "@/shared/api/lab-assessments";

export function BlackBoxObservationPlot({ observations, onView }: { observations: NonNullable<LabPaperResponse["observations"]>; onView?: (id: string) => void }) {
  const t = useTranslations("learning.virtualLab.blackBox");
  const [selected, setSelected] = useState(observations[0].id);
  const observation = observations.find((item) => item.id === selected) ?? observations[0];
  const maximum = Math.max(2, ...observations.flatMap((item) => [...item.input, ...item.output].map((point) => point.y)));
  const x = (value: number) => 44 + value / 4 * 325;
  const y = (value: number) => 218 - value / maximum * 180;
  return <div className="space-y-5" data-black-box-observations>
    <nav className="flex flex-wrap gap-3" aria-label={t("assessmentProbes")}>
      {observations.map((item) => <Button key={item.id} type="button" variant={item.id === observation.id ? "default" : "outline"} aria-pressed={item.id === observation.id} data-black-box-probe={item.id} onClick={() => { setSelected(item.id); onView?.(item.id); }}>{t(`probes.${item.id}`)}</Button>)}
    </nav>
    <div className="grid gap-6 xl:grid-cols-2">{["input", "output"].map((key, index) => <figure key={key} className="min-w-0 space-y-3">
      <figcaption className="text-base">{t(key)}</figcaption>
      <svg viewBox="0 0 400 260" role="img" aria-label={t(key)} className="w-full" data-black-box-chart={key}>
        {Array.from({ length: maximum + 1 }, (_, value) => <g key={value}><path d={`M44 ${y(value)}H369`} stroke="var(--foreground)" opacity={value === 0 ? 0.45 : 0.12} strokeDasharray={value === 0 ? undefined : "2 4"} /><text x="35" y={y(value) + 5} textAnchor="end" fill="currentColor" fontSize="14" fontFamily="var(--font-mono)">{value}</text></g>)}
        {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4].map((value) => <g key={value}><path d={`M${x(value)} 25V218`} stroke="var(--foreground)" opacity={value === 0 ? 0.45 : 0.12} strokeDasharray={value === 0 ? undefined : "2 4"} /><text x={x(value)} y="239" textAnchor="middle" fill="currentColor" fontSize="14" fontFamily="var(--font-mono)">{value}</text></g>)}
        <text x="44" y="18" fill="currentColor" fontSize="16" fontStyle="italic" fontFamily="var(--font-display)">{index === 0 ? "x(t)" : "y(t)"}</text>
        <text x="369" y="259" textAnchor="end" fill="currentColor" fontSize="14" fontFamily="var(--font-display)">t / s</text>
        <polyline points={(index === 0 ? observation.input : observation.output).map((point) => `${x(point.x)},${y(point.y)}`).join(" ")} fill="none" stroke={`var(--chart-${index + 1})`} strokeWidth="2.25" strokeDasharray={index === 0 ? "7 4" : undefined} />
      </svg>
    </figure>)}</div>
  </div>;
}
