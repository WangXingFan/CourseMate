"use client";

import { ArrowLeft, ArrowRight, Check, Download, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { MathFormula } from "@/features/learning/components/shared/math-formula";
import { PoleZeroPlot } from "@/features/learning/components/shared/pole-zero-plot";
import type { NativeLabModel } from "@/features/learning/hooks/use-learning-native-lab";
import { exportLabPNG } from "@/features/learning/model/virtual-lab-native";
import type { VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";
import { LAB_FLOWS, firstMissingLabStep, hasLabStepEvidence, labMeasurementAt, labPredictionDiffers, labStepTrials, labTrialPrediction, matchesLabStep, resumeLabStep, validLabObservation } from "@/features/learning/model/virtual-lab-flow";
import { labAnswerFormulas, labObservationFormulas, labObservationPlotKey } from "@/features/learning/model/virtual-lab-presentation";
import { NativeLabComparison } from "./native-lab-comparison";
import { NativeLabAudio } from "./native-lab-audio";
import { NativeLabGivens } from "./native-lab-givens";
import { labReadingUnit, parseLabReading } from "@/features/learning/model/virtual-lab-reading";
import { NativeLabPredictionSummary } from "./native-lab-prediction-summary";
import { NativeLabPlot } from "./native-lab-plot";
import { NativeLabParameter } from "./native-lab-parameter";
import { NativeLabTrials } from "./native-lab-records";

const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-invalid:border-destructive";


function AnswerControl({ label, fieldKey, placeholder, value, onChange, isText = false }: { label: string; fieldKey: string; placeholder: string; value: string; onChange: (value: string) => boolean; isText?: boolean }) {
  const t = useTranslations("learning.virtualLab.native");
  const [text, setText] = useState(value);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { setText(value); setInvalid(false); }, [value]);
  return <label htmlFor={`answer-${fieldKey}`} className="block space-y-2 text-sm leading-6"><span>{label}</span><input id={`answer-${fieldKey}`} data-answer={fieldKey} inputMode={isText ? "text" : "decimal"} maxLength={100} placeholder={placeholder} value={text} aria-invalid={invalid} className={inputClass}
    onChange={(event) => { setText(event.target.value); setInvalid(!onChange(event.target.value)); }} />{invalid && <span role="alert" className="block text-sm text-destructive">{t("invalidAnswer")}</span>}</label>;
}

type Phase = "predict" | "observe" | "conclude";

export function NativeLabTask({ model, engine, taskID }: { model: NativeLabModel; engine: VirtualLabEngine; taskID: string }) {
  const assessmentT = useTranslations("learning.assessment");
  const t = useTranslations("learning.virtualLab.native");
  const f = useTranslations("learning.virtualLab.flow");
  const task = engine.tasks[taskID], record = engine.records.data.tasks[taskID];
  const flow = LAB_FLOWS[taskID];
  const stepTrials = labStepTrials(flow, record);
  const missingStep = stepTrials.findIndex((trial) => !trial);
  const completedSteps = stepTrials.filter(Boolean).length;
  const courseTasks = engine.courseIds(taskID.slice(0, 2)), taskIndex = courseTasks.indexOf(taskID);
  const nextHref = taskIndex < 3 ? `#task/${courseTasks[taskIndex + 1]}` : `#records/${taskID.slice(0, 2)}`;
  const [phase, setPhase] = useState<Phase>(() => record.analysis.trim() ? "conclude" : record.prediction ? "observe" : "predict");
  const [stepIndex, setStepIndex] = useState(() => resumeLabStep(flow, record));
  const [cursor, setCursor] = useState<{ chart: string; value: number } | null>(null);
  const [message, setMessage] = useState("");
  const [observation, setObservation] = useState({ signature: "", text: "" });
  const [readingEstimates, setReadingEstimates] = useState<Record<string, string>>({});
  const [revealedEstimates, setRevealedEstimates] = useState<Record<string, boolean>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const step = flow.steps[stepIndex];
  const observationSignature = `${taskID}:${step.key}:${JSON.stringify(record.params)}`;
  const observationText = observation.signature === observationSignature ? observation.text : "";
  const setupChanged = Object.entries(step.params).some(([key, value]) => record.params[key] !== value);
  const scene = useMemo(() => engine.scene(taskID, record.params, record.answers), [engine, taskID, record.params, record.answers]);
  const primaryPlot = labObservationPlotKey(taskID, step.key);
  const rawPlot = scene.plots.find((plot) => plot.key === primaryPlot) ?? scene.plots[0];
  const plotted = taskID === "L1-1" && record.params.mode === "transform" ? { ...rawPlot, title: f("waveform"), series: rawPlot.series.filter((series) => series.label !== "目标波形") }
    : taskID === "L2-4" && step.key !== "candidate" ? { ...rawPlot, title: f("samplingPlot"), series: rawPlot.series.filter((series) => !series.label.startsWith("候选")) } : rawPlot;
  const observationFormulas = labObservationFormulas(taskID, record.params);
  const hiddenMetrics = new Set(step.hiddenMetrics ?? []);
  const visibleMetrics = scene.metrics.filter((metric) => !hiddenMetrics.has(metric.label) && !(taskID === "L2-4" && step.key !== "candidate" && ["候选频率", "全部样本最大差"].includes(metric.label)));
  const predictedReading = step.predictedReadingKey ? labMeasurementAt(scene.readings, step.predictedReadingKey) : null;
  const isCategoricalPrediction = typeof predictedReading === "boolean";
  const matchingTrial = record.trials.findLast((trial) => Object.entries(record.params).every(([key, value]) => trial.params[key] === value) && labTrialPrediction(step, trial) !== null);
  const savedEstimate = labTrialPrediction(step, matchingTrial);
  const measuredReading = savedEstimate?.value ?? (step.observation && validLabObservation(step, scene.readings, observationText) ? parseLabReading(observationText, step.observation?.reading ?? "") : null);
  const readingEstimate = readingEstimates[observationSignature] ?? (savedEstimate ? String(Number(savedEstimate.predictedValue)) : "");
  const currentEstimateRevealed = !!revealedEstimates[observationSignature] || !!savedEstimate;
  // Once observation begins, parameter changes update the plot without hiding it.
  // Predictions remain attached to their original parameters, never a new setup.
  const readingEstimateRevealed = currentEstimateRevealed || !!stepTrials[stepIndex] || Object.entries(revealedEstimates).some(([signature, shown]) => shown && signature.startsWith(`${taskID}:${step.key}:`));
  const readingUnit = labReadingUnit(step.predictedReadingKey ?? step.observation?.reading ?? "");
  const estimateValue = parseLabReading(readingEstimate, step.predictedReadingKey ?? "");
  const observationValue = parseLabReading(observationText, step.observation?.reading ?? "");
  const validReadingEstimate = !!step.predictedReadingKey && (isCategoricalPrediction ? ["0", "1"].includes(readingEstimate) : predictedReading !== null && estimateValue !== null);
  const predictionDifferences = flow.steps.flatMap((item, index) => {
    const prediction = labTrialPrediction(item, stepTrials[index]);
    return prediction ? [{ categorical: typeof prediction.predictedValue === "boolean", differs: labPredictionDiffers(prediction.predictedValue, prediction.value) }] : [];
  });
  const predictionNeedsRevision = predictionDifferences.some((item) => item.differs);
  const numericPredictionDiffers = predictionDifferences.some((item) => !item.categorical && item.differs);
  const categoricalPredictionDiffers = predictionDifferences.some((item) => item.categorical && item.differs);
  const hasPrediction = !!record.prediction.trim();
  const ready = hasPrediction && missingStep < 0 && !!record.analysis.trim() && (!flow.derivation || !!record.derivation.trim());
  const go = (next: Phase) => {
    setMessage(""); setCursor(null); setPhase(next);
    requestAnimationFrame(() => { heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: "start" }); });
  };
  const saveText = (field: "predictionDraft" | "derivation" | "analysis", value: string) => {
    record[field] = value; record.completion = { confirmed: false, confirmedAt: null }; engine.records.save();
  };
  const applyStep = (index: number) => {
    const next = flow.steps[index];
    // Defaults prevent parameters from a previous comparison leaking into this one.
    const params = { ...engine.defaults(taskID), ...next.params };
    for (const key of next.controls ?? []) params[key] = record.params[key];
    Object.assign(params, next.initial);
    if (taskID === "L3-3" && ["design", "frequency"].includes(next.key)) {
      const design = next.key === "frequency" ? record.trials.findLast((trial) => trial.measurements.exerciseStep === "design") : engine.records.data.tasks["L2-3"].trials.findLast((trial) => trial.measurements.exerciseStep === "design" && trial.params.filterType === "notch" && trial.measurements.passed === true);
      if (design) { params.center = design.params.center; params.alpha = design.params.alpha; }
    }
    if (!model.updateParams(taskID, params)) throw new Error(t("invalidParameter"));
    setStepIndex(index); setCursor(null); setMessage(""); setObservation({ signature: "", text: "" });
  };
  const attempt = (action: () => void) => {
    try { action(); } catch (error) { setMessage(error instanceof Error ? error.message : t("actionFailed")); }
  };
  const begin = () => attempt(() => {
    const latest = record.revisions.at(-1)?.text ?? record.prediction;
    if (!record.predictionDraft.trim()) throw new Error(f("enterPrediction"));
    if (record.predictionDraft.trim() !== latest) engine.records.prediction(taskID);
    applyStep(Math.max(0, missingStep)); go("observe");
  });
  const saveCurrent = () => {
    const plot = scene.plots.find((item) => item.key === cursor?.chart);
    const reading = plot && cursor ? { chart: plot.key, x: cursor.value, unit: plot.xUnit || "s", values: plot.series.map((series) => ({ label: series.label, value: engine.plot.read(series, cursor.value, plot.breakJump) })) } : null;
    const predictedValue = currentEstimateRevealed && validReadingEstimate ? isCategoricalPrediction ? readingEstimate === "1" : estimateValue ?? undefined : undefined;
    const observed = step.observation && validLabObservation(step, scene.readings, observationText) ? { step: step.key, reading: step.observation.reading, value: observationValue, ...(predictedValue === undefined ? {} : { predictedValue }) } : null;
    engine.records.trial(taskID, { ...scene, readings: { ...scene.readings, cursor: reading, observation: observed, exerciseStep: step.key } }, cursor?.value ?? null);
  };
  const saveTrial = () => {
    if (!matchesLabStep(step, { params: record.params, answers: record.answers })) {
      throw new Error(scene.answerFeedback?.some((item) => item.status === "missing") ? f("fillAnswers") : step.controls?.length ? f("reachSetup") : f("restoreStep"));
    }
    if (scene.answerFeedback?.some((item) => item.status !== "correct")) throw new Error(f("reviewCoefficients"));
    if (step.predictedReadingKey && !readingEstimateRevealed) throw new Error(f("enterEstimate"));
    if (!validLabObservation(step, scene.readings, observationText)) throw new Error(f("checkReading"));
    if (!hasLabStepEvidence(step, { params: record.params, answers: record.answers, measurements: { ...scene.readings, exerciseStep: step.key, observation: { step: step.key, value: observationValue } } })) throw new Error(f(`tasks.${taskID}.target`));
    saveCurrent();
    const nextMissing = firstMissingLabStep(flow, record);
    if (nextMissing < 0) { setObservation({ signature: "", text: "" }); go("conclude"); }
    else { applyStep(nextMissing); heading.current?.scrollIntoView({ block: "start" }); }
  };
  const plotFigure = (plot: typeof plotted) => <figure key={plot.key} className="min-w-0">
    <figcaption className="mb-2 text-sm">{plot.title}</figcaption>
    <NativeLabPlot engine={engine} taskID={taskID} plot={plot} cursor={plot.marker ?? (cursor?.chart === plot.key ? cursor.value : null)} onCursor={(value) => setCursor({ chart: plot.key, value })} />
  </figure>;
  return <div className="space-y-6" data-native-task={taskID}>
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
      <h1 className="font-display text-3xl md:text-4xl font-normal tracking-[-0.015em]">{task.title}</h1>
      <select aria-label={t("chooseTask")} value={taskID} className="w-full max-w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-auto sm:max-w-80" onChange={(event) => { window.location.hash = `task/${event.target.value}`; }}>
        {courseTasks.map((id, index) => <option key={id} value={id}>{index + 1}. {engine.tasks[id].short || engine.tasks[id].title}</option>)}
      </select>
    </header>
    <div className="flex justify-end"><Button asChild variant="outline"><a href={`/learn/experiments/assessment#${taskID}`}>{assessmentT("title")}</a></Button></div>
    <p className="text-base leading-7" data-lab-objective><span className="mr-2 font-medium">{f("objective")}</span>{f(`tasks.${taskID}.objective`)}</p>
    <nav aria-label={f("steps")} className="grid grid-cols-3 border-b border-border">
      {(["predict", "observe", "conclude"] as const).map((item, index) => <button type="button" key={item} data-phase={item} aria-current={phase === item ? "step" : undefined} disabled={item !== "predict" && !hasPrediction} onClick={() => go(item)} className={`flex min-h-12 items-center justify-center gap-2 border-b-2 px-2 py-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${phase === item ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}><span className="font-mono">0{index + 1}</span>{f(item)}</button>)}
    </nav>
    {message && phase !== "observe" && <p role="alert" className="text-sm text-destructive">{message}</p>}
    <h2 ref={heading} tabIndex={-1} className="sr-only">{f(phase)}</h2>
    {phase === "predict" && <section className="mx-auto max-w-3xl space-y-5 py-4" data-lab-phase="predict">
      <NativeLabGivens engine={engine} taskID={taskID} />
      <h2 className="font-display text-2xl font-normal leading-relaxed">{f(`tasks.${taskID}.question`)}</h2>
      <textarea id="prediction" aria-label={t("prediction")} maxLength={12000} placeholder={f("predictionPlaceholder")} value={record.predictionDraft} onChange={(event) => saveText("predictionDraft", event.target.value)} className={`${inputClass} min-h-28 resize-y leading-7`} />
      <div className="flex justify-end"><Button data-action="prediction" onClick={begin}>{f("start")}<ArrowRight aria-hidden className="size-4" /></Button></div>
      {record.prediction && <details className="border-t border-border pt-4 text-sm leading-7"><summary className="cursor-pointer">{t("predictionHistory", { count: record.revisions.length })}</summary><p className="mt-3 whitespace-pre-wrap">{record.prediction}</p>{record.revisions.map((item, index) => <p key={`${item.time}-${index}`} className="mt-3 whitespace-pre-wrap">{t("revision", { number: index + 1 })}：{item.text}</p>)}</details>}
    </section>}
    {phase === "observe" && <section className="space-y-5" data-lab-phase="observe">
      <div className="flex flex-wrap items-center gap-3">
        <select aria-label={f("comparison")} value={stepIndex} className="h-10 shrink-0 rounded-md border border-input bg-background px-2 font-mono text-sm" onChange={(event) => attempt(() => applyStep(Number(event.target.value)))}>{flow.steps.map((item, index) => <option key={item.key} value={index}>{index + 1} / {flow.steps.length}</option>)}</select>
        <h2 className="min-w-0 flex-1 text-base leading-7">{f(`tasks.${taskID}.steps.${step.key}`)}</h2>
        {setupChanged && !step.initial && <Button variant="ghost" size="sm" onClick={() => attempt(() => applyStep(stepIndex))}><RotateCcw aria-hidden className="size-4" />{f("resetStep")}</Button>}
      </div>
      {!!step.controls?.length && <div className="grid max-w-xl gap-4 sm:grid-cols-2">{task.params.filter((spec) => step.controls?.includes(spec.key)).map((spec) => <NativeLabParameter key={spec.key} taskID={taskID} spec={spec} value={record.params[spec.key]} onChange={(value) => model.updateParams(taskID, { [spec.key]: value })} />)}</div>}
      {step.predictedReadingKey && !readingEstimateRevealed && <div className="max-w-3xl" data-estimate-givens><NativeLabGivens engine={engine} taskID={taskID} params={record.params} /></div>}
      {step.predictedReadingKey && !readingEstimateRevealed && <fieldset className="max-w-xl min-w-0 space-y-3 border-t border-border pt-4" data-reading-prediction>
        <legend className="text-base font-medium">{f("estimateReading")}</legend>
        <label htmlFor="reading-estimate" className="block text-base">{f(`readings.${step.predictedReadingKey.replaceAll(".", "_")}`)}{readingUnit && <span className="ml-2 font-mono text-sm">({readingUnit})</span>}</label>
        {isCategoricalPrediction ? <select id="reading-estimate" value={readingEstimate} className={inputClass} onChange={(event) => {
          setReadingEstimates((current) => ({ ...current, [observationSignature]: event.target.value }));
          setRevealedEstimates((current) => ({ ...current, [observationSignature]: false })); setMessage("");
        }}><option value="">{f("chooseObservation")}</option><option value="1">{f("yes")}</option><option value="0">{f("no")}</option></select>
          : <input id="reading-estimate" type="text" maxLength={40} inputMode="text" autoComplete="off" placeholder={f("estimateReadingPlaceholder")} value={readingEstimate} className={inputClass} onChange={(event) => {
            setReadingEstimates((current) => ({ ...current, [observationSignature]: event.target.value }));
            setRevealedEstimates((current) => ({ ...current, [observationSignature]: false })); setMessage("");
          }} />}
        <div className="flex justify-end"><Button data-action="reading-estimate" disabled={!validReadingEstimate} onClick={() => {
          setRevealedEstimates((current) => ({ ...current, [observationSignature]: true }));
          setObservation({ signature: "", text: "" }); setMessage("");
        }}>{f("showReading")}<ArrowRight aria-hidden className="size-4" /></Button></div>
      </fieldset>}
      {(!step.predictedReadingKey || readingEstimateRevealed) && <>
      {!!observationFormulas.length && <div className="space-y-2 overflow-x-auto border-l-2 border-seal pl-4" data-observation-formula>{observationFormulas.map((formula) => <div key={formula}><MathFormula>{formula}</MathFormula></div>)}</div>}
      {!!scene.answerFeedback?.length && <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2"><div className="space-y-2 overflow-x-auto sm:col-span-2" data-answer-formula>{labAnswerFormulas(taskID, record.params).map((formula) => <div key={formula}><MathFormula>{formula}</MathFormula></div>)}</div>{task.answers?.filter((answer) => scene.answerFeedback?.some((item) => item.key === answer.key)).map((answer) => <AnswerControl key={answer.key} label={answer.label} fieldKey={answer.key} isText={answer.type === "text"} placeholder={taskID === "L1-2" && record.params.test === "invariance" ? "x1=step; delay=1" : answer.placeholder} value={record.answers[answer.key] || ""} onChange={(value) => {
        const next = { ...record.answers, [answer.key]: value }; if (!engine.validAnswers(taskID, next)) return false;
        record.answers = next; record.completion = { confirmed: false, confirmedAt: null }; engine.records.save(); return true;
      }} />)}{scene.answerFeedback?.some((item) => item.status === "review") && <p role="status" className="text-sm sm:col-span-2">{f("reviewCoefficients")}</p>}</div>}
      {taskID === "L3-3" && scene.poles && Number(record.params.alpha) !== 0 && <div className="max-w-2xl" data-lab-poles><PoleZeroPlot poles={scene.poles} zeros={scene.zeros} roc={{ kind: "right", boundary: Math.max(...scene.poles.map((pole) => pole.re)) }} xDomain={[-85, 25]} yDomain={[-400, 400]} onPoleMove={step.controls?.includes("alpha") ? (point) => {
        const center = Math.max(40, Math.min(60, Math.abs(point.im) / (2 * Math.PI)));
        const alpha = Math.max(-20, Math.min(80, -point.re));
        model.updateParams(taskID, { center: Math.round(center * 10) / 10, alpha: Math.round(alpha) });
      } : undefined} /></div>}
      <div className="min-w-0">{plotFigure(plotted)}</div>
      {taskID === "L3-3" && step.key === "frequency" && scene.plots.filter((plot) => plot.key === "main").map(plotFigure)}
      {taskID === "L2-4" && record.params.mode === "audio" && <NativeLabAudio engine={engine} params={record.params} />}
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">{visibleMetrics.map((metric) => <div key={metric.label} className="border-l-2 border-border pl-3"><dt className="text-sm text-muted-foreground">{metric.label}</dt><dd className="mt-1 break-words font-mono text-lg">{metric.value} <span className="text-sm">{metric.unit}</span></dd></div>)}</dl>
      {step.observation && <div className="space-y-3 border-t border-border pt-4" data-lab-observation>
        <label htmlFor="observation" className="block text-base">{f(`readings.${step.observation.reading.replaceAll(".", "_")}`)}{readingUnit && <span className="ml-2 font-mono text-sm">({readingUnit})</span>}</label>
        {typeof labMeasurementAt(scene.readings, step.observation.reading) === "boolean" ? <select id="observation" value={observationText} className={`${inputClass} max-w-sm`} onChange={(event) => { setObservation({ signature: observationSignature, text: event.target.value }); setMessage(""); }}><option value="">{f("chooseObservation")}</option><option value="1">{f("yes")}</option><option value="0">{f("no")}</option></select>
          : <input id="observation" inputMode="text" autoComplete="off" maxLength={40} placeholder={f("readingPlaceholder")} value={observationText} className={`${inputClass} max-w-sm`} onChange={(event) => { setObservation({ signature: observationSignature, text: event.target.value }); setMessage(""); }} />}
        {step.predictedReadingKey && currentEstimateRevealed && <dl className="grid max-w-xl grid-cols-2 gap-4" data-reading-comparison>
          <div className="border-l-2 border-border pl-3"><dt className="text-sm text-muted-foreground">{f("predictedValue")}</dt><dd className="mt-1 break-words font-mono text-lg">{isCategoricalPrediction ? readingEstimate === "1" ? f("yes") : f("no") : engine.format(estimateValue ?? 0, 6)}</dd></div>
          <div className="border-l-2 border-border pl-3"><dt className="text-sm text-muted-foreground">{f("measuredValue")}</dt><dd className="mt-1 break-words font-mono text-lg">{measuredReading === null ? "—" : isCategoricalPrediction ? measuredReading === 1 ? f("yes") : f("no") : engine.format(measuredReading, 6)}</dd></div>
        </dl>}
      </div>}
      {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-sm text-muted-foreground" role="status">{f("recorded", { count: completedSteps, total: flow.steps.length })}</span>
        <Button data-action="trial" disabled={!!step.observation && !observationText.trim() || !!scene.answerFeedback?.some((item) => item.status === "missing")} onClick={() => attempt(saveTrial)}>{f("recordNext")}<ArrowRight aria-hidden className="size-4" /></Button>
      </div>
      <details className="border-t border-border pt-4 text-sm" data-lab-tools><summary className="cursor-pointer">{f("tools")}</summary><div className="mt-5 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{task.params.filter((spec) => !step.controls?.includes(spec.key)).map((spec) => <NativeLabParameter key={spec.key} taskID={taskID} spec={spec} value={record.params[spec.key]} onChange={(value) => model.updateParams(taskID, { [spec.key]: value })} />)}</div>
        {scene.plots.filter((plot) => plot.key !== plotted.key).map(plotFigure)}
        <p className="overflow-x-auto border-l-2 border-seal pl-4 font-mono leading-7">{scene.formula}</p><p className="leading-7">{scene.note}</p>
        {scene.answerFeedback?.map((item) => <p key={item.key} className="leading-6">{item.label}：{item.message}</p>)}
        <div className="flex flex-wrap gap-3"><Button variant="outline" size="sm" data-action="extra-trial" onClick={() => attempt(saveCurrent)}>{f("recordExtra")}</Button><Button variant="outline" size="sm" data-action="png" onClick={() => { void exportLabPNG(engine, taskID, scene, cursor?.value ?? null, cursor?.chart ?? "").catch((error: unknown) => setMessage(error instanceof Error ? error.message : t("actionFailed"))); }}><Download aria-hidden className="size-4" />{t("exportPNG")}</Button></div>
      </div></details>
      </>}
    </section>}
    {phase === "conclude" && <section className="space-y-6" data-lab-phase="conclude">
      <NativeLabPredictionSummary engine={engine} taskID={taskID} />
      <details className="border-b border-border pb-4" open={taskID === "L1-1"}><summary className="cursor-pointer text-sm">{f("results", { count: completedSteps })}</summary><div className="mt-5"><NativeLabComparison engine={engine} taskID={taskID} /></div></details>
      {predictionNeedsRevision && <p role="status" className="border-l-2 border-seal pl-4 text-base leading-7">{f(numericPredictionDiffers ? "predictionLargeDifference" : categoricalPredictionDiffers ? "predictionDifferent" : "predictionLargeDifference")}</p>}
      <label htmlFor="analysis" className="block space-y-3"><span className="font-display text-xl leading-8">{f(`tasks.${taskID}.conclusion`)}</span><textarea id="analysis" maxLength={12000} placeholder={f("conclusionPlaceholder")} value={record.analysis} onChange={(event) => saveText("analysis", event.target.value)} className={`${inputClass} min-h-28 resize-y leading-7`} /></label>
      {flow.derivation ? <label htmlFor="derivation" className="block space-y-3"><span className="text-sm">{f(`tasks.${taskID}.derivation`)}</span><textarea id="derivation" maxLength={12000} value={record.derivation} onChange={(event) => saveText("derivation", event.target.value)} className={`${inputClass} min-h-24 resize-y leading-7`} /></label> : <details className="text-sm"><summary className="cursor-pointer">{f("extraDerivation")}</summary><textarea id="derivation" aria-label={t("derivation")} maxLength={12000} value={record.derivation} onChange={(event) => saveText("derivation", event.target.value)} className={`${inputClass} mt-3 min-h-24 resize-y leading-7`} /></details>}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
        <div role="group" className="flex flex-wrap gap-3 text-sm" aria-label={f("checklist")}>
          <span className={missingStep < 0 ? "text-primary" : "text-muted-foreground"}>{f("recorded", { count: completedSteps, total: flow.steps.length })}</span>
          <span className={record.analysis.trim() ? "text-primary" : "text-muted-foreground"}>{f(record.analysis.trim() ? "conclusionDone" : "conclusionMissing")}</span>
          {flow.derivation && <span className={record.derivation.trim() ? "text-primary" : "text-muted-foreground"}>{f(record.derivation.trim() ? "derivationDone" : "derivationMissing")}</span>}
        </div>
        {missingStep >= 0 ? <Button onClick={() => attempt(() => { applyStep(missingStep); go("observe"); })}>{f("continueComparisons")}<ArrowRight aria-hidden className="size-4" /></Button> : record.completion.confirmed && ready ? <Button asChild><a href={nextHref}>{taskIndex < 3 ? t("next") : t("records")}<ArrowRight aria-hidden className="size-4" /></a></Button> : <Button data-action="complete" disabled={!ready} onClick={() => { record.completion = { confirmed: true, confirmedAt: new Date().toISOString() }; engine.records.save(); }}><Check aria-hidden className="size-4" />{f("finish")}</Button>}
      </div>
    </section>}
    {phase !== "predict" && <div className="space-y-4 border-t border-border pt-5">
      <details className="text-sm"><summary className="cursor-pointer">{f("help")}</summary><ul className="mt-3 list-disc space-y-2 pl-5 leading-7">{task.hints.map((hint) => <li key={hint}>{hint}</li>)}</ul></details>
      <details className="text-sm" data-lab-history><summary className="cursor-pointer">{f("history", { count: record.trials.length })}</summary><NativeLabTrials engine={engine} taskID={taskID} onRestore={(index) => { const trial = record.trials[index]; record.answers = { ...engine.defaultAnswers(taskID), ...trial.answers }; model.updateParams(taskID, trial.params); const matching = flow.steps.findIndex((item) => matchesLabStep(item, trial)); if (matching >= 0) setStepIndex(matching); go("observe"); }} /></details>
    </div>}
    <a className="inline-flex items-center gap-2 text-sm text-muted-foreground" href={`#course/${taskID.slice(0, 2)}`}><ArrowLeft aria-hidden className="size-4" />{f("back")}</a>
  </div>;
}
