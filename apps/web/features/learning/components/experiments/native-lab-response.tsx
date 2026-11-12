"use client";

import { useTranslations } from "next-intl";
import { labReading } from "@/features/learning/model/virtual-lab-flow";
import type { LabParameter, LabParameters, LabScene, VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";
import { NativeLabParameter } from "./native-lab-parameter";

const responseColumns = ["initial", "input", "sum", "total"] as const;

export function NativeLabResponseControls({ params, specs, onChange }: { params: LabParameters; specs: LabParameter[]; onChange: (params: LabParameters) => boolean }) {
  const t = useTranslations("learning.virtualLab.flow.tasks.L1-3");
  const amplitude = params.enabled === "on" ? Number(params.A) : 0;
  const level = 50 - amplitude * 12;
  return <div className="grid grid-cols-2 gap-4 md:grid-cols-3" data-response-controls>
    <fieldset className="col-span-2 min-w-0 space-y-2 md:col-span-1">
      <legend className="text-sm">{t("controls.enabled")}</legend>
      <div className="grid grid-cols-2 items-center gap-3 md:grid-cols-1">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1 rounded-md border border-input p-1">
            {["off", "on"].map((value) => <button type="button" key={value} data-response-input={value} aria-pressed={params.enabled === value} onClick={() => onChange({ enabled: value })}
              className={`min-h-9 rounded-md px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 ${params.enabled === value ? "bg-accent font-medium text-primary" : "hover:bg-accent/60"}`}>{t(`controls.${value}`)}</button>)}
          </div>
          <output className="block font-mono text-sm" aria-live="polite" data-response-input-value>x(t) = {params.enabled === "off" ? "0" : `${params.A}u(t)`}</output>
        </div>
        <svg viewBox="0 0 180 75" role="img" aria-label={t("inputPlot")} className="w-full max-w-64 text-muted-foreground" data-response-input-plot>
          <path d="M24 8V50H170" fill="none" stroke="var(--foreground)" strokeOpacity="0.45" />
          <polyline points={`8,50 40,50 40,${level} 170,${level}`} fill="none" stroke="var(--chart-4)" strokeWidth="2.25" />
          <g fill="currentColor" fontSize="14" fontFamily="var(--font-mono)">
            <text x="5" y="55">0</text><text x="36" y="70">0</text><text x="163" y="70">t</text>
            {amplitude !== 0 && <text x="5" y={level + 5}>{params.A}</text>}
          </g>
        </svg>
      </div>
    </fieldset>
    {specs.filter((spec) => spec.key !== "enabled").map((spec) => <NativeLabParameter key={spec.key} taskID="L1-3" spec={{ ...spec, label: t(`controls.${spec.key}`) }} value={params[spec.key]} onChange={(value) => onChange({ [spec.key]: value })} />)}
  </div>;
}

export function NativeLabResponse({ engine, readings }: { engine: VirtualLabEngine; readings: LabScene["readings"] }) {
  const t = useTranslations("learning.virtualLab.flow.tasks.L1-3");
  const rows = [0, 1, 3, 5].flatMap((time, index) => {
    const initial = labReading(readings, `atTimes.${index}.zeroInput`);
    const input = labReading(readings, `atTimes.${index}.zeroState`);
    const total = labReading(readings, `atTimes.${index}.total`);
    return initial === null || input === null || total === null ? [] : [{ time, initial, input, sum: initial + input, total }];
  });

  return <section className="min-w-0 space-y-3 border-t border-border pt-4" data-response-decomposition>
    <h3 className="text-base font-medium">{t("tableTitle")}</h3>
    <div role="region" aria-label={t("tableTitle")} className="overflow-x-auto rounded-md border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
      <table className="w-full min-w-[38rem] text-left text-sm">
        <thead className="border-b border-border bg-muted/30"><tr>
          {["time", "initial", "input", "sum", "total"].map((key) => <th key={key} scope="col" className="h-10 px-3 py-2 text-xs font-normal">{t(`columns.${key}`)}</th>)}
        </tr></thead>
        <tbody>{rows.map((row) => <tr key={row.time} className={`border-b border-border/50 last:border-0 ${row.time === 1 ? "bg-accent" : ""}`}>
          <th scope="row" className="px-3 py-3 font-mono font-normal">{row.time}</th>
          {responseColumns.map((key) => <td key={key} className="px-3 py-3 font-mono">{engine.format(row[key], 4)}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}
