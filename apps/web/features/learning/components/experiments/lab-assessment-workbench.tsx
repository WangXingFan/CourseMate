"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MathFormula } from "@/features/learning/components/shared/math-formula";
import { PoleZeroPlot } from "@/features/learning/components/shared/pole-zero-plot";
import { useLearningLabAccess } from "@/features/learning/hooks/use-learning-lab-access";
import { labObservationFormulas } from "@/features/learning/model/virtual-lab-presentation";
import { createVirtualLabEngine, type LabParameters } from "@/public/vendor/signal-lab/core.mjs";
import { NativeLabClosed } from "./native-lab-closed";
import { NativeLabParameter } from "./native-lab-parameter";
import { NativeLabPlot } from "./native-lab-plot";
import { NativeLabAudio } from "./native-lab-audio";

export function LabAssessmentWorkbench({ taskID }: { taskID: string }) {
  const access = useLearningLabAccess();
  if (!access.courses?.[taskID.slice(0, 2)]) return <NativeLabClosed loading={!access.courses && !access.error} error={access.error} refresh={access.refresh} />;
  return <InteractiveWorkbench key={taskID} taskID={taskID} />;
}

function InteractiveWorkbench({ taskID }: { taskID: string }) {
  const t = useTranslations("learning.assessment");
  const f = useTranslations("learning.virtualLab.flow");
  const [engine] = useState(() => createVirtualLabEngine());
  const [params, setParams] = useState(() => engine.defaults(taskID));
  const [view, setView] = useState("");
  const [cursor, setCursor] = useState<number | null>(null);
  const scene = useMemo(() => engine.scene(taskID, params, engine.defaultAnswers(taskID)), [engine, taskID, params]);
  const formulas = labObservationFormulas(taskID, params);
  const selected = view === "poles" && scene.poles ? "poles" : scene.plots.find((plot) => plot.key === view)?.key ?? scene.plots[0].key;
  const rawPlot = scene.plots.find((plot) => plot.key === selected) ?? scene.plots[0];
  const plot = taskID === "L1-1" && params.mode === "transform"
    ? { ...rawPlot, title: f("waveform"), series: rawPlot.series.filter((series) => series.label !== "目标波形") } : rawPlot;
  const update = (changes: LabParameters) => {
    const next = { ...params, ...changes };
    if (!engine.validParams(taskID, next)) return false;
    setParams(next); setCursor(null); return true;
  };
  const visible = (key: string) => {
    if (taskID === "L1-1") return (params.mode === "impulse" ? ["mode", "delta"] : ["mode", "A", "a", "shift"]).includes(key);
    if (taskID === "L1-2") return !(params.test === "linearity" ? ["delay"] : ["x2", "alpha", "beta"]).includes(key);
    if (taskID === "L1-3") return params.enabled !== "off" || key !== "A";
    if (taskID === "L1-4") return params.kind === "ecg" || key !== "width";
    if (taskID === "L2-3") return (params.filterType === "lowpass" ? ["filterType", "fc"] : ["filterType", "center", "alpha"]).includes(key);
    if (taskID === "L2-4") return (params.mode === "audio" ? ["mode", "fs", "antiAlias", ...(params.antiAlias === "on" ? ["filterOrder", "filterCutoff"] : [])] : ["mode", "fs", "candidate"]).includes(key);
    if (taskID === "L3-1") return ["mode", "A", ...(params.mode === "exp" ? ["a"] : params.mode === "delayed" ? ["start", "T"] : ["T"])].includes(key);
    return true;
  };
  return <section aria-label={t("workbench")} data-assessment-workbench className="min-w-0 space-y-5 border-y border-border py-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h4 className="font-display text-xl font-normal">{t("workbench")}</h4>
      <Button type="button" variant="ghost" onClick={() => { setParams(engine.defaults(taskID)); setCursor(null); setView(""); }}>{t("resetWorkbench")}</Button>
    </div>
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {engine.tasks[taskID].params.filter((spec) => visible(spec.key)).map((spec) => <NativeLabParameter key={spec.key} spec={spec} value={params[spec.key]} taskID={taskID} onChange={(value) => update({ [spec.key]: value })} />)}
    </div>
    {!!formulas.length && <div className="space-y-2 overflow-x-auto border-l-2 border-seal pl-4">{formulas.map((formula) => <div key={formula}><MathFormula>{formula}</MathFormula></div>)}</div>}
    {(scene.plots.length > 1 || scene.poles) && <nav aria-label={t("plotView")} className="flex flex-wrap gap-2">
      {scene.plots.map((item) => <Button type="button" key={item.key} variant={selected === item.key ? "default" : "outline"} aria-pressed={selected === item.key} onClick={() => { setView(item.key); setCursor(null); }}>{item.title}</Button>)}
      {scene.poles && <Button type="button" variant={selected === "poles" ? "default" : "outline"} aria-pressed={selected === "poles"} onClick={() => setView("poles")}>{t("poleZeroView")}</Button>}
    </nav>}
    {selected === "poles" && scene.poles ? <div data-assessment-poles className="mx-auto max-w-2xl">
      <PoleZeroPlot poles={scene.poles} zeros={scene.zeros} roc={{ kind: "right", boundary: Math.max(...scene.poles.map((pole) => pole.re)) }} xDomain={[-85, 25]} yDomain={[-400, 400]} />
    </div> : <figure className="min-w-0">
      <figcaption className="mb-3 text-sm">{plot.title}</figcaption>
      <NativeLabPlot engine={engine} taskID={taskID} plot={plot} cursor={cursor ?? plot.marker ?? null} onCursor={setCursor} />
    </figure>}
    {taskID === "L2-4" && params.mode === "audio" && <NativeLabAudio engine={engine} params={params} />}
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">{scene.metrics.filter((metric) => metric.label !== "已填写模板项").map((metric) => <div key={metric.label} className="border-l-2 border-border pl-3"><dt className="text-sm text-muted-foreground">{metric.label}</dt><dd className="mt-1 break-words font-mono text-lg">{metric.value} {metric.unit}</dd></div>)}</dl>
  </section>;
}
