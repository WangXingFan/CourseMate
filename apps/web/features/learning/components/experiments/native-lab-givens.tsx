"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { MathFormula } from "@/features/learning/components/shared/math-formula";
import { LAB_PREDICTION_FORMULAS, LAB_SYSTEM_PROPERTY_SYSTEMS, labObservationFormulas, labPredictionPlot } from "@/features/learning/model/virtual-lab-presentation";
import type { LabParameters, VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";
import { NativeLabPlot } from "./native-lab-plot";

export function NativeLabGivens({ engine, taskID, params }: { engine: VirtualLabEngine; taskID: string; params?: LabParameters }) {
  const t = useTranslations("learning.virtualLab.flow");
  const plot = useMemo(() => labPredictionPlot(engine, taskID, params), [engine, taskID, params]);
  const givenKey = taskID === "L1-1" && params?.mode === "impulse" ? "pulseGiven" : taskID === "L2-4" && params?.mode === "audio" ? "audioGiven" : "given";
  if (taskID === "L1-2" && !params) return <div className="min-w-0 space-y-5" data-lab-givens>
    <section className="space-y-3">
      <h3 className="text-base font-medium">{t("tasks.L1-2.systemsTitle")}</h3>
      <ol className="divide-y divide-border/60 border-y border-border/60">{LAB_SYSTEM_PROPERTY_SYSTEMS.map((formula, index) => <li key={formula} className="flex min-h-12 items-center gap-4 py-2">
        <span className="font-mono text-sm text-muted-foreground">0{index + 1}</span><MathFormula>{formula}</MathFormula>
      </li>)}</ol>
    </section>
    <div className="grid gap-5 sm:grid-cols-2">
      <section className="space-y-2"><h3 className="text-base font-medium">{t("tasks.L1-2.linearityTitle")}</h3><p className="text-sm leading-6">{t("tasks.L1-2.linearityDescription")}</p><div className="overflow-x-auto"><MathFormula>{String.raw`T[\alpha x_1+\beta x_2](t)=\alpha T[x_1](t)+\beta T[x_2](t)`}</MathFormula></div></section>
      <section className="space-y-2"><h3 className="text-base font-medium">{t("tasks.L1-2.timeInvariantTitle")}</h3><p className="text-sm leading-6">{t("tasks.L1-2.timeInvariantDescription")}</p><div className="overflow-x-auto"><MathFormula>{`T[x(t-d)](t)=T[x](t-d)`}</MathFormula></div></section>
    </div>
  </div>;
  return <div className="min-w-0 space-y-4" data-lab-givens>
    {plot && <figure><figcaption className="mb-2 text-sm">{t(taskID === "L1-2" && params ? "tasks.L1-2.inputSignals" : `tasks.${taskID}.${givenKey}`)}</figcaption><NativeLabPlot engine={engine} taskID={taskID} plot={plot} /></figure>}
    {!plot && <p className="text-sm leading-6">{t(`tasks.${taskID}.given`)}</p>}
    <div className="space-y-2 overflow-x-auto border-l-2 border-seal pl-4" data-given-formula>{(params && taskID === "L1-2" ? labObservationFormulas(taskID, params).slice(1, 2) : params ? labObservationFormulas(taskID, params) : LAB_PREDICTION_FORMULAS[taskID]).map((formula) => <div key={formula}><MathFormula>{formula}</MathFormula></div>)}</div>
  </div>;
}
