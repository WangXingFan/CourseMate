"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { MathFormula } from "@/features/learning/components/shared/math-formula";
import { LAB_PREDICTION_FORMULAS, labPredictionPlot } from "@/features/learning/model/virtual-lab-presentation";
import type { VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";
import { NativeLabPlot } from "./native-lab-plot";

export function NativeLabGivens({ engine, taskID }: { engine: VirtualLabEngine; taskID: string }) {
  const t = useTranslations("learning.virtualLab.flow");
  const plot = useMemo(() => labPredictionPlot(engine, taskID), [engine, taskID]);
  return <div className="min-w-0 space-y-4" data-lab-givens>
    {plot && <figure><figcaption className="mb-2 text-sm">{t(`tasks.${taskID}.given`)}</figcaption><NativeLabPlot engine={engine} taskID={taskID} plot={plot} /></figure>}
    {!plot && <p className="text-sm leading-6">{t(`tasks.${taskID}.given`)}</p>}
    <div className="space-y-2 overflow-x-auto border-l-2 border-seal pl-4" data-given-formula>{LAB_PREDICTION_FORMULAS[taskID].map((formula) => <div key={formula}><MathFormula>{formula}</MathFormula></div>)}</div>
  </div>;
}
