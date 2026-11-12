"use client";

import { useTranslations } from "next-intl";

import { LAB_FLOWS, labStepTrials, labTrialPrediction } from "@/features/learning/model/virtual-lab-flow";
import type { VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";

export function NativeLabPredictionSummary({ engine, taskID }: { engine: VirtualLabEngine; taskID: string }) {
  const t = useTranslations("learning.virtualLab.flow");
  const flow = LAB_FLOWS[taskID];
  const trials = labStepTrials(flow, engine.records.data.tasks[taskID]);
  const rows = flow.steps.flatMap((step, index) => {
    const trial = trials[index], readingKey = step.predictedReadingKey;
    const comparison = labTrialPrediction(step, trial);
    return readingKey && comparison ? [{ step, readingKey, comparison }] : [];
  });

  if (!rows.length) return null;

  const formatValue = (value: number | boolean, categorical: boolean) => categorical
    ? taskID === "L1-2" ? t(value ? "tasks.L1-2.different" : "tasks.L1-2.same") : t(value ? "yes" : "no")
    : engine.format(Number(value), 6);

  return <section className="space-y-3" data-lab-prediction-summary>
    <h3 className="font-medium">{t("predictionComparison")}</h3>
    <div role="region" aria-label={t("predictionComparison")} className="overflow-x-auto rounded-md border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b border-border bg-muted/30">
          <tr>
            {["comparisonStep", "comparisonReading", "comparisonPredicted", "comparisonMeasured"].map((key) => <th scope="col" key={key} className="h-10 px-3 py-2 text-xs font-normal">{t(key)}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ step, readingKey, comparison }) => {
            const categorical = typeof comparison.predictedValue === "boolean";
            return <tr key={step.key} className="border-b border-border/50 last:border-0">
              <th scope="row" className="px-3 py-3 font-normal">{t(`tasks.${taskID}.steps.${step.key}`)}</th>
              <td className="px-3 py-3 text-muted-foreground">{t(`readings.${readingKey.replaceAll(".", "_")}`)}</td>
              <td className="px-3 py-3 font-mono">{formatValue(comparison.predictedValue, categorical)}</td>
              <td className="px-3 py-3 font-mono">{formatValue(comparison.value, categorical)}</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  </section>;
}
