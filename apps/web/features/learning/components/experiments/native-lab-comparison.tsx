"use client";

import { useTranslations } from "next-intl";
import { LAB_FLOWS, labReading, labStepTrials } from "@/features/learning/model/virtual-lab-flow";
import type { VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";

export function NativeLabComparison({ engine, taskID }: { engine: VirtualLabEngine; taskID: string }) {
  const t = useTranslations("learning.virtualLab.flow");
  const flow = LAB_FLOWS[taskID];
  const trials = labStepTrials(flow, engine.records.data.tasks[taskID]);
  if (taskID === "L1-3") return <div className="overflow-x-auto" data-lab-comparison>
    <table className="w-full min-w-[34rem] text-left text-sm">
      <thead className="border-b border-border"><tr>{["comparisonStep", "tasks.L1-3.controls.initial", "tasks.L1-3.inputPlot", "tasks.L1-3.outputAtOne"].map((key) => <th key={key} scope="col" className="h-10 px-3 py-2 text-xs font-normal">{t(key)}</th>)}</tr></thead>
      <tbody>{flow.steps.map((step, index) => {
        const trial = trials[index], value = trial ? labReading(trial.measurements, "atTimes.1.total") : null;
        return <tr key={step.key} className="border-b border-border/50 last:border-0">
          <th scope="row" className="px-3 py-3 font-normal">{t(`tasks.L1-3.steps.${step.key}`)}</th>
          <td className="px-3 py-3 font-mono">{trial?.params.initial ?? "—"}</td>
          <td className="px-3 py-3 font-mono">{trial ? trial.params.enabled === "off" ? "0" : `${trial.params.A}u(t)` : "—"}</td>
          <td className="px-3 py-3 font-mono">{value === null ? "—" : engine.format(value, 4)}</td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
  if (taskID === "L1-1") return <div className="space-y-5" data-lab-comparison>
    {[false, true].map((pulse) => <div key={String(pulse)} className="overflow-x-auto"><table className="w-full text-left text-sm">
      <caption className="mb-2 text-left font-medium">{t(pulse ? "comparisonPulse" : "comparisonSignal")}</caption>
      <thead className="border-b border-border"><tr>{(pulse ? ["resultWidth", "resultHeight", "resultArea"] : ["resultSetup", "resultPeakTime", "resultPeak", "resultWidth"]).map((key) => <th key={key} className="px-2 py-2 first:pl-0 font-normal">{t(key)}</th>)}</tr></thead>
      <tbody>{flow.steps.map((step, index) => {
        if (step.key.startsWith("pulse") !== pulse) return null;
        const trial = trials[index];
        const keys = pulse ? ["width", "height", "numericalArea"] : ["peakTime", "peak", "supportEnd"];
        return <tr key={step.key} className="border-b border-border/50 last:border-0">
          {!pulse && <th scope="row" className="py-2 pr-2 font-normal">{t(`transformNames.${step.key}`)}</th>}
          {keys.map((key) => {
            const value = key === "supportEnd" && trial ? Number(trial.measurements.supportEnd) - Number(trial.measurements.supportStart) : trial?.measurements[key];
            return <td key={key} className="px-2 py-2 font-mono first:pl-0">{typeof value === "number" ? engine.format(value, 3) : "—"}</td>;
          })}
        </tr>;
      })}</tbody>
    </table></div>)}
  </div>;
  return <div className="divide-y divide-border/60" data-lab-comparison>
    {flow.steps.map((step, index) => {
      const trial = trials[index];
      const scene = trial ? engine.scene(taskID, trial.params, trial.answers) : null;
      return <div key={step.key} className="grid gap-3 py-4 first:pt-0 sm:grid-cols-[minmax(0,1fr)_2fr]">
        <p className="text-sm leading-6">{t(`tasks.${taskID}.steps.${step.key}`)}</p>
        {scene ? <dl className="grid grid-cols-2 gap-x-4 gap-y-3">{scene.metrics.map((metric) => <div key={metric.label}><dt className="text-sm text-muted-foreground">{metric.label}</dt><dd className="break-words font-mono text-sm">{metric.value} {metric.unit}</dd></div>)}</dl> : <p className="text-sm text-muted-foreground">{t("notRecorded")}</p>}
      </div>;
    })}
  </div>;
}
