"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { applyResponseTest, RESPONSE_BASELINE, responsePoints, responseValue, type ResponseSetup } from "@/features/learning/model/virtual-lab-response-diagnosis";
import { useIsMobile } from "@/shared/hooks/use-mobile";

export function ResponseComparisonPlot({ setup, test, interactive = true }: { setup: ResponseSetup; test?: string; interactive?: boolean }) {
  const t = useTranslations("learning.virtualLab.responseDiagnosis");
  const id = useId();
  const mobile = useIsMobile();
  const [time, setTime] = useState(1);
  const width = mobile ? 400 : 800, right = width - 25, bottom = 255;
  const x = (value: number) => 44 + value / 8 * (right - 44), y = (value: number) => bottom - (value + 0.15) / 3.3 * 230;
  const setups = [RESPONSE_BASELINE, setup].map((item) => test ? applyResponseTest(item, test) : item);
  return <figure className="min-w-0 space-y-3" data-response-plot={test ?? "comparison"}>
    <figcaption className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      {["before", "after"].map((key, index) => <span key={key} className="inline-flex items-center gap-2"><span aria-hidden className={`w-7 border-t-[3px] ${index === 0 ? "border-dashed border-chart-1" : "border-chart-2"}`} />{t(key)}</span>)}
    </figcaption>
    <svg viewBox={`0 0 ${width} 300`} role="img" aria-label={t(test ? "verificationChart" : "originalChart")} className="w-full">
      {[0, 1, 2, 3].map((value) => <g key={value}><path d={`M44 ${y(value)}H${right}`} stroke="var(--foreground)" opacity={value === 0 ? 0.45 : 0.12} strokeDasharray={value === 0 ? undefined : "2 4"} /><text x="33" y={y(value) + 5} textAnchor="end" fill="currentColor" fontSize="14" fontFamily="var(--font-mono)">{value}</text></g>)}
      {[0, 2, 4, 6, 8].map((value) => <g key={value}><path d={`M${x(value)} 25V${bottom}`} stroke="var(--foreground)" opacity={value === 0 ? 0.45 : 0.12} strokeDasharray={value === 0 ? undefined : "2 4"} /><text x={x(value)} y="277" textAnchor="middle" fill="currentColor" fontSize="14" fontFamily="var(--font-mono)">{value}</text></g>)}
      <text x="12" y="18" fill="currentColor" fontSize="16" fontStyle="italic" fontFamily="var(--font-display)">y(t)</text><text x={right} y="297" textAnchor="end" fill="currentColor" fontSize="16" fontFamily="var(--font-display)">t / s</text>
      {setups.map((item, index) => <polyline key={index === 0 ? "before" : "after"} points={responsePoints(item).map((point) => `${x(point.x)},${y(point.y)}`).join(" ")} fill="none" stroke={`var(--chart-${index + 1})`} strokeDasharray={index === 0 ? "7 4" : undefined} strokeWidth={index === 0 ? 4 : 2.25} />)}
      {interactive && <><path d={`M${x(time)} 25V${bottom}`} stroke="var(--foreground)" opacity=".45" strokeDasharray="3 4" />{setups.map((item, index) => <circle key={index === 0 ? "before" : "after"} cx={x(time)} cy={y(responseValue(item, time))} r="4" fill={`var(--chart-${index + 1})`} />)}</>}
    </svg>
    {interactive && <div className="space-y-3 border-t border-border pt-3">
      <label htmlFor={id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{t("cursor")}</span><span className="font-mono">t = {time.toFixed(1)} s</span></label>
      <input id={id} type="range" min="0" max="8" step="0.1" value={time} onChange={(event) => setTime(Number(event.target.value))} className="w-full accent-primary" />
      <output htmlFor={id} className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm">{setups.map((item, index) => <span key={index === 0 ? "before" : "after"}>{t(index === 0 ? "before" : "after")} {responseValue(item, time).toFixed(3)}</span>)}</output>
    </div>}
  </figure>;
}
