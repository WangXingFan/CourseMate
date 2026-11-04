"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { MathFormula } from "@/features/learning/components/shared/math-formula";
import { LAB_PREDICTION_FORMULAS, labObservationFormulas, labPredictionPlot } from "@/features/learning/model/virtual-lab-presentation";
import type { LabParameters, VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";
import { NativeLabPlot } from "./native-lab-plot";

export function NativeLabGivens({ engine, taskID, params }: { engine: VirtualLabEngine; taskID: string; params?: LabParameters }) {
  const t = useTranslations("learning.virtualLab.flow");
  const plot = useMemo(() => labPredictionPlot(engine, taskID, params), [engine, taskID, params]);
  const givenKey = taskID === "L1-1" && params?.mode === "impulse" ? "pulseGiven" : taskID === "L2-4" && params?.mode === "audio" ? "audioGiven" : "given";
  return <div className="min-w-0 space-y-4" data-lab-givens>
    {plot && <figure><figcaption className="mb-2 text-sm">{t(`tasks.${taskID}.${givenKey}`)}</figcaption><NativeLabPlot engine={engine} taskID={taskID} plot={plot} /></figure>}
    {!plot && <p className="text-sm leading-6">{t(`tasks.${taskID}.given`)}</p>}
    <div className="space-y-2 overflow-x-auto border-l-2 border-seal pl-4" data-given-formula>{(params ? labObservationFormulas(taskID, params) : LAB_PREDICTION_FORMULAS[taskID]).map((formula) => <div key={formula}><MathFormula>{formula}</MathFormula></div>)}</div>
  </div>;
}
