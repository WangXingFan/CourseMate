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
import { labAnswerFormulas, labObservationFormulas, labObservationPlotKey, labSystemPropertyReadout, labSystemPropertyRoutes } from "@/features/learning/model/virtual-lab-presentation";
import { LearningHelp } from "@/features/learning/components/shared/learning-help";
import { NativeLabComparison } from "./native-lab-comparison";
import { NativeLabAudio } from "./native-lab-audio";
import { NativeLabExplanation } from "./native-lab-explanation";
import { NativeLabGivens } from "./native-lab-givens";
import { labReadingUnit, parseLabReading } from "@/features/learning/model/virtual-lab-reading";
import { NativeLabPredictionSummary } from "./native-lab-prediction-summary";
import { NativeLabPlot } from "./native-lab-plot";
import { NativeLabParameter } from "./native-lab-parameter";
import { NativeLabTrials } from "./native-lab-records";
import { NativeLabResponse, NativeLabResponseControls } from "./native-lab-response";

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
  const [stepIndex, setStepIndex] = useState(() => taskID === "L1-3" && missingStep >= 0 ? missingStep : resumeLabStep(flow, record));
  const [cursor, setCursor] = useState<{ chart: string; value: number } | null>(null);
  const [message, setMessage] = useState("");
  const [observation, setObservation] = useState({ signature: "", text: "" });
  const [readingEstimates, setReadingEstimates] = useState<Record<string, string>>({});
  const [revealedEstimates, setRevealedEstimates] = useState<Record<string, boolean>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const step = flow.steps[stepIndex];
  const observationSignature = `${taskID}:${step.key}:${JSON.stringify(record.params)}`;
  const readingEstimateSignature = taskID === "L1-1" ? `${taskID}:${step.key}` : observationSignature;
  const observationText = observation.signature === observationSignature ? observation.text : "";
  const defaultParams = engine.defaults(taskID);
  const setupChanged = Object.entries(step.params).some(([key, value]) => record.params[key] !== value)
    || taskID === "L1-2" && (step.controls ?? []).some((key) => record.params[key] !== defaultParams[key]);
  const parameterEvidence = taskID === "L1-2"
    ? record.params.test === "linearity"
      ? `x1=${record.params.x1}; x2=${record.params.x2}; alpha=${record.params.alpha}; beta=${record.params.beta}`
      : `x1=${record.params.x1}; delay=${record.params.delay}`
    : "";
  const parameterRecordSummary = taskID === "L1-2"
    ? record.params.test === "linearity"
      ? f("tasks.L1-2.linearityRecord", {
          x1: f(`tasks.L1-2.signals.${String(record.params.x1)}`),
          x2: f(`tasks.L1-2.signals.${String(record.params.x2)}`),
          alpha: String(record.params.alpha),
          beta: String(record.params.beta),
        })
      : f("tasks.L1-2.timeShiftRecord", {
          x1: f(`tasks.L1-2.signals.${String(record.params.x1)}`),
          delay: String(record.params.delay),
        })
    : "";
  const sceneAnswers = useMemo(() => taskID === "L1-2" ? { ...record.answers, evidence: parameterEvidence } : record.answers, [taskID, record.answers, parameterEvidence]);
  const scene = useMemo(() => engine.scene(taskID, record.params, sceneAnswers), [engine, taskID, record.params, sceneAnswers]);
  const primaryPlot = labObservationPlotKey(taskID, step.key);
  const systemPropertyRoutes = taskID === "L1-2" ? labSystemPropertyRoutes(record.params) : null;
  const rawPlot = scene.plots.find((plot) => plot.key === primaryPlot) ?? scene.plots[0];
  const differencePlot = taskID === "L1-2" ? scene.plots.find((plot) => plot.key === "difference") : null;
  const systemPropertyReadout = taskID === "L1-2" ? labSystemPropertyReadout(engine, scene) : null;
  const responseSeries = record.params.enabled === "off" ? ["initial"] : Number(record.params.initial) === 0 ? ["input"] : ["total", "initial", "input"];
  const plotted = taskID === "L1-1" && record.params.mode === "transform" ? { ...rawPlot, title: f("waveform"), series: rawPlot.series.filter((series) => series.label !== "目标波形") }
    : taskID === "L1-3" ? { ...rawPlot, title: f(`tasks.L1-3.plots.${record.params.enabled === "off" ? "zeroInput" : Number(record.params.initial) === 0 ? "zeroState" : "total"}`), series: rawPlot.series.slice(0, responseSeries.length).map((series, index) => ({ ...series, label: f(`tasks.L1-3.series.${responseSeries[index]}`), color: engine.plot.colors[["total", "initial", "input"].indexOf(responseSeries[index])] })) }
    : taskID === "L2-4" && step.key !== "candidate" ? { ...rawPlot, title: f("samplingPlot"), series: rawPlot.series.filter((series) => !series.label.startsWith("候选")) } : rawPlot;
  const observationFormulas = labObservationFormulas(taskID, record.params);
  const hiddenMetrics = new Set(step.hiddenMetrics ?? []);
  const visibleMetrics = scene.metrics.filter((metric) => !hiddenMetrics.has(metric.label) && !(taskID === "L2-4" && step.key !== "candidate" && ["候选频率", "全部样本最大差"].includes(metric.label)));
  const predictedReading = step.predictedReadingKey ? labMeasurementAt(scene.readings, step.predictedReadingKey) : null;
  const isCategoricalPrediction = typeof predictedReading === "boolean";
  const matchingTrial = record.trials.findLast((trial) => Object.entries(record.params).every(([key, value]) => trial.params[key] === value) && labTrialPrediction(step, trial) !== null);
  const savedEstimate = labTrialPrediction(step, matchingTrial);
  const measuredReading = savedEstimate?.value ?? (step.observation && validLabObservation(step, scene.readings, observationText) ? parseLabReading(observationText, step.observation?.reading ?? "") : null);
  const readingEstimate = readingEstimates[readingEstimateSignature] ?? (savedEstimate ? String(Number(savedEstimate.predictedValue)) : "");
  const currentEstimateRevealed = !!revealedEstimates[readingEstimateSignature] || !!savedEstimate;
  // L1-1 asks for an estimate before controls appear, then compares it with the adjusted result.
  const readingEstimateRevealed = currentEstimateRevealed || taskID !== "L1-2" && (!!stepTrials[stepIndex] || Object.entries(revealedEstimates).some(([signature, shown]) => shown && signature.startsWith(`${taskID}:${step.key}:`)));
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
    if (taskID !== "L1-2") for (const key of next.controls ?? []) params[key] = record.params[key];
    Object.assign(params, next.initial);
    if (taskID === "L1-3" && stepTrials[index]) Object.assign(params, stepTrials[index].params);
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
    if (taskID === "L1-2") record.answers = { ...record.answers, evidence: parameterEvidence };
    engine.records.trial(taskID, { ...scene, readings: { ...scene.readings, cursor: reading, observation: observed, exerciseStep: step.key } }, cursor?.value ?? null);
  };
  const saveTrial = () => {
    if (!matchesLabStep(step, { params: record.params, answers: sceneAnswers })) {
      throw new Error(scene.answerFeedback?.some((item) => item.status === "missing") ? f("fillAnswers") : step.controls?.length ? f("reachSetup") : f("restoreStep"));
    }
    if (scene.answerFeedback?.some((item) => item.status !== "correct")) throw new Error(f("reviewCoefficients"));
    if (step.predictedReadingKey && !readingEstimateRevealed) throw new Error(f("enterEstimate"));
    if (!validLabObservation(step, scene.readings, observationText)) throw new Error(f("checkReading"));
    if (!hasLabStepEvidence(step, { params: record.params, answers: sceneAnswers, measurements: { ...scene.readings, exerciseStep: step.key, observation: { step: step.key, value: observationValue } } })) throw new Error(f(`tasks.${taskID}.target`));
    saveCurrent();
    const nextMissing = firstMissingLabStep(flow, record);
    if (nextMissing < 0) { setObservation({ signature: "", text: "" }); go("conclude"); }
    else { applyStep(nextMissing); heading.current?.scrollIntoView({ block: "start" }); }
  };
  const plotFigure = (plot: typeof plotted) => <figure key={plot.key} className="min-w-0">
    <figcaption className="mb-2 text-sm">{taskID === "L1-2" ? f(plot.key === "difference" ? "tasks.L1-2.differencePlotTitle" : "tasks.L1-2.outputPlotTitle") : plot.title}</figcaption>
    <NativeLabPlot engine={engine} taskID={taskID} plot={systemPropertyReadout ? { ...plot, marker: systemPropertyReadout.time } : plot} cursor={systemPropertyReadout?.time ?? (cursor?.chart === plot.key ? cursor.value : taskID === "L1-3" ? 1 : null)} onCursor={systemPropertyReadout ? undefined : (value) => setCursor({ chart: plot.key, value })} yRange={taskID === "L1-3" ? [-1.1, 3.1] : undefined} yTicks={taskID === "L1-3" ? [-1, 0, 1, 2, 3] : undefined} />
  </figure>;
  return <div className="space-y-6" data-native-task={taskID}>
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
      <h1 className="font-display text-3xl md:text-4xl font-normal tracking-[-0.015em]">{task.title}</h1>
      <select aria-label={t("chooseTask")} value={taskID} className="w-full max-w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-auto sm:max-w-80" onChange={(event) => { window.location.hash = `task/${event.target.value}`; }}>
        {courseTasks.map((id, index) => <option key={id} value={id}>{index + 1}. {engine.tasks[id].short || engine.tasks[id].title}</option>)}
      </select>
    </header>
    <div className="flex flex-wrap justify-end gap-3"><LearningHelp title={task.title} context={JSON.stringify({ task: taskID, parameters: record.params, prediction: record.predictionDraft || record.prediction, observation: observationText, analysis: record.analysis, readings: scene.metrics })} returnHref={`/learn/experiments/workspace#task/${taskID}`} /><Button asChild variant="outline"><a href={`/learn/experiments/assessment#${taskID}`}>{assessmentT("title")}</a></Button></div>
    {taskID !== "L1-3" && <p className="text-base leading-7" data-lab-objective><span className="mr-2 font-medium">{f("objective")}</span>{f(`tasks.${taskID}.objective`)}</p>}
    <nav aria-label={f("steps")} className="grid grid-cols-3 border-b border-border">
      {(["predict", "observe", "conclude"] as const).map((item, index) => <button type="button" key={item} data-phase={item} aria-current={phase === item ? "step" : undefined} disabled={item !== "predict" && !hasPrediction} onClick={() => go(item)} className={`flex min-h-12 items-center justify-center gap-2 border-b-2 px-2 py-3 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${phase === item ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}><span className="font-mono">0{index + 1}</span>{f(item)}</button>)}
    </nav>
    <NativeLabExplanation taskID={taskID} />
    {message && phase !== "observe" && <p role="alert" className="text-sm text-destructive">{message}</p>}
    <h2 ref={heading} tabIndex={-1} className="sr-only">{f(phase)}</h2>
    {phase === "predict" && <section className="mx-auto max-w-3xl space-y-5 py-4" data-lab-phase="predict">
      <NativeLabGivens engine={engine} taskID={taskID} />
      <h2 className="font-display text-2xl font-normal leading-relaxed">{f(`tasks.${taskID}.question`)}</h2>
      {["L1-2", "L1-3"].includes(taskID) && <p className="text-base leading-7" data-prediction-guide>{f(`tasks.${taskID}.predictionGuide`)}</p>}
      <textarea id="prediction" aria-label={t("prediction")} maxLength={12000} placeholder={f(["L1-2", "L1-3"].includes(taskID) ? `tasks.${taskID}.predictionPlaceholder` : "predictionPlaceholder")} value={record.predictionDraft} onChange={(event) => saveText("predictionDraft", event.target.value)} className={`${inputClass} min-h-28 resize-y leading-7`} />
      <div className="flex justify-end"><Button data-action="prediction" onClick={begin}>{f(taskID === "L1-2" ? "tasks.L1-2.startComparisons" : "start")}<ArrowRight aria-hidden className="size-4" /></Button></div>
      {record.prediction && <details className="border-t border-border pt-4 text-sm leading-7"><summary className="cursor-pointer">{t("predictionHistory", { count: record.revisions.length })}</summary><p className="mt-3 whitespace-pre-wrap">{record.prediction}</p>{record.revisions.map((item, index) => <p key={`${item.time}-${index}`} className="mt-3 whitespace-pre-wrap">{t("revision", { number: index + 1 })}：{item.text}</p>)}</details>}
    </section>}
    {phase === "observe" && <section className="space-y-5" data-lab-phase="observe">
      <div className="flex flex-wrap items-center gap-3">
        {taskID === "L1-2" ? <nav aria-label={f("comparison")} className="grid w-full grid-cols-2 gap-2 sm:grid-cols-5">
          {flow.steps.map((item, index) => <button type="button" key={item.key} aria-current={stepIndex === index ? "step" : undefined} onClick={() => attempt(() => applyStep(index))}
            className={`flex min-h-12 min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${stepIndex === index ? "border-primary bg-accent text-primary shadow-[inset_2px_0_0_var(--primary)]" : "border-border text-foreground hover:bg-accent/60"}`}>
            {stepTrials[index] ? <Check aria-hidden className="size-4 shrink-0" /> : <span className="w-4 shrink-0 text-center font-mono text-muted-foreground">{index + 1}</span>}
            <span className="min-w-0">{f(`tasks.${taskID}.steps.${item.key}`)}</span>
          </button>)}
        </nav> : <>
          <select aria-label={f("comparison")} value={stepIndex} className="h-10 shrink-0 rounded-md border border-input bg-background px-2 font-mono text-sm" onChange={(event) => attempt(() => applyStep(Number(event.target.value)))}>{flow.steps.map((item, index) => <option key={item.key} value={index}>{index + 1} / {flow.steps.length}</option>)}</select>
          <h2 className="min-w-0 flex-1 text-base leading-7">{f(`tasks.${taskID}.steps.${step.key}`)}</h2>
        </>}
        {setupChanged && !step.initial && <Button variant="ghost" size="sm" onClick={() => attempt(() => applyStep(stepIndex))}><RotateCcw aria-hidden className="size-4" />{f("resetStep")}</Button>}
      </div>
      {taskID === "L1-2" && <h2 className="font-display text-xl font-normal leading-relaxed">{f(`tasks.${taskID}.steps.${step.key}`)}</h2>}
      {taskID === "L1-3" && <p className="text-base leading-7" data-response-instructions>{f(`tasks.L1-3.instructions.${step.key}`)}</p>}
      {systemPropertyRoutes && <section className="space-y-4 border-y border-border py-4" data-system-property-routes>
        <p className="text-base leading-7">{f(`tasks.L1-2.instructions.${step.key}`)}</p>
        <div className="overflow-x-auto border-l-2 border-seal pl-4"><MathFormula>{systemPropertyRoutes.system}</MathFormula></div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2 border-t border-border pt-3"><dt className="text-sm text-muted-foreground">{f(systemPropertyRoutes.test === "linearity" ? "tasks.L1-2.linearityPathA" : "tasks.L1-2.timeShiftPathA")}</dt><dd className="overflow-x-auto"><MathFormula>{systemPropertyRoutes.pathA}</MathFormula></dd></div>
          <div className="min-w-0 space-y-2 border-t border-border pt-3"><dt className="text-sm text-muted-foreground">{f(systemPropertyRoutes.test === "linearity" ? "tasks.L1-2.linearityPathB" : "tasks.L1-2.timeShiftPathB")}</dt><dd className="overflow-x-auto"><MathFormula>{systemPropertyRoutes.pathB}</MathFormula></dd></div>
        </dl>
        <ol className="list-decimal space-y-2 border-t border-border pt-4 pl-5 text-base leading-7" data-system-property-actions>
          <li>{f("tasks.L1-2.action1")}</li>
          <li>{f("tasks.L1-2.action2")}</li>
          <li>{f("tasks.L1-2.action3")}</li>
        </ol>
        <p className="border-l-2 border-primary pl-4 text-base leading-7">{f("tasks.L1-2.differenceRule")}</p>
      </section>}
      {taskID === "L1-2" && step.controls?.length ? <details className="border-y border-border py-3" data-optional-parameters>
        <summary className="cursor-pointer text-base font-medium">{f("tasks.L1-2.exploreParametersTitle")}</summary>
        <div className="mt-4 space-y-4">
          <p className="text-base leading-7">{f("tasks.L1-2.parameterEffect")}</p>
          <div className="grid max-w-xl gap-4 sm:grid-cols-2">{task.params.filter((spec) => step.controls?.includes(spec.key)).map((spec) => <NativeLabParameter key={spec.key} taskID={taskID} spec={spec} value={record.params[spec.key]} onChange={(value) => model.updateParams(taskID, { [spec.key]: value })} />)}</div>
        </div>
      </details> : taskID === "L1-3" ? <NativeLabResponseControls params={record.params} specs={task.params} onChange={(params) => model.updateParams(taskID, params)} />
        : !!step.controls?.length && (taskID !== "L1-1" || readingEstimateRevealed) && <div className="grid max-w-xl gap-4 sm:grid-cols-2">{task.params.filter((spec) => step.controls?.includes(spec.key)).map((spec) => <NativeLabParameter key={spec.key} taskID={taskID} spec={spec} value={record.params[spec.key]} onChange={(value) => model.updateParams(taskID, { [spec.key]: value })} />)}</div>}
      {taskID === "L1-2" ? <div className="max-w-3xl" data-estimate-givens><NativeLabGivens engine={engine} taskID={taskID} params={record.params} /></div>
        : step.predictedReadingKey && !readingEstimateRevealed && <div className="max-w-3xl" data-estimate-givens><NativeLabGivens engine={engine} taskID={taskID} params={record.params} /></div>}
      {step.predictedReadingKey && !readingEstimateRevealed && <fieldset className="max-w-xl min-w-0 space-y-3 border-t border-border pt-4" data-reading-prediction>
        <legend className="text-base font-medium">{f("estimateReading")}</legend>
        {taskID === "L1-2" && <p className="text-sm leading-6">{f("tasks.L1-2.estimateGuide")}</p>}
        <label htmlFor="reading-estimate" className="block text-base">{f(`readings.${step.predictedReadingKey.replaceAll(".", "_")}`)}{readingUnit && <span className="ml-2 font-mono text-sm">({readingUnit})</span>}</label>
        {isCategoricalPrediction ? <select id="reading-estimate" value={readingEstimate} className={inputClass} onChange={(event) => {
          setReadingEstimates((current) => ({ ...current, [readingEstimateSignature]: event.target.value }));
          setRevealedEstimates((current) => ({ ...current, [readingEstimateSignature]: false })); setMessage("");
        }}><option value="">{f("chooseObservation")}</option><option value="1">{taskID === "L1-2" ? f("tasks.L1-2.different") : f("yes")}</option><option value="0">{taskID === "L1-2" ? f("tasks.L1-2.same") : f("no")}</option></select>
          : <input id="reading-estimate" type="text" maxLength={40} inputMode="text" autoComplete="off" placeholder={f("estimateReadingPlaceholder")} value={readingEstimate} className={inputClass} onChange={(event) => {
            setReadingEstimates((current) => ({ ...current, [readingEstimateSignature]: event.target.value }));
            setRevealedEstimates((current) => ({ ...current, [readingEstimateSignature]: false })); setMessage("");
          }} />}
        <div className="flex justify-end"><Button data-action="reading-estimate" disabled={!validReadingEstimate} onClick={() => {
          setRevealedEstimates((current) => ({ ...current, [readingEstimateSignature]: true }));
          setObservation({ signature: "", text: "" }); setMessage("");
        }}>{f(taskID === "L1-2" ? "tasks.L1-2.showComparison" : "showReading")}<ArrowRight aria-hidden className="size-4" /></Button></div>
      </fieldset>}
      {(!step.predictedReadingKey || readingEstimateRevealed) && <>
      {taskID !== "L1-2" && !!observationFormulas.length && <div className="space-y-2 overflow-x-auto border-l-2 border-seal pl-4" data-observation-formula>{observationFormulas.map((formula) => <div key={formula}><MathFormula>{formula}</MathFormula></div>)}</div>}
      {!!scene.answerFeedback?.length && <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2"><div className="space-y-2 overflow-x-auto sm:col-span-2" data-answer-formula>{labAnswerFormulas(taskID, record.params).map((formula) => <div key={formula}><MathFormula>{formula}</MathFormula></div>)}</div>{taskID === "L1-2" ? <section className="space-y-2 sm:col-span-2" data-parameter-record data-evidence={parameterEvidence}>
        <h3 className="text-base font-medium">{f("tasks.L1-2.parameterRecordTitle")}</h3>
        <p className="text-base leading-7">{parameterRecordSummary}</p>
        <p className="text-sm leading-6">{f("tasks.L1-2.parameterRecordHelp")}</p>
      </section> : task.answers?.filter((answer) => scene.answerFeedback?.some((item) => item.key === answer.key)).map((answer) => <AnswerControl key={answer.key} label={answer.label} fieldKey={answer.key} isText={answer.type === "text"} placeholder={answer.placeholder} value={record.answers[answer.key] || ""} onChange={(value) => {
        const next = { ...record.answers, [answer.key]: value }; if (!engine.validAnswers(taskID, next)) return false;
        record.answers = next; record.completion = { confirmed: false, confirmedAt: null }; engine.records.save(); return true;
      }} />)}{scene.answerFeedback?.some((item) => item.status === "review") && <p role="status" className="text-sm sm:col-span-2">{f("reviewCoefficients")}</p>}</div>}
      {taskID === "L3-3" && scene.poles && Number(record.params.alpha) !== 0 && <div className="max-w-2xl" data-lab-poles><PoleZeroPlot poles={scene.poles} zeros={scene.zeros} roc={{ kind: "right", boundary: Math.max(...scene.poles.map((pole) => pole.re)) }} xDomain={[-85, 25]} yDomain={[-400, 400]} onPoleMove={step.controls?.includes("alpha") ? (point) => {
        const center = Math.max(40, Math.min(60, Math.abs(point.im) / (2 * Math.PI)));
        const alpha = Math.max(-20, Math.min(80, -point.re));
        model.updateParams(taskID, { center: Math.round(center * 10) / 10, alpha: Math.round(alpha) });
      } : undefined} /></div>}
      <div className="min-w-0">{plotFigure(plotted)}</div>
      {taskID === "L1-3" && ["total", "lower", "amplitude"].includes(step.key) && <NativeLabResponse engine={engine} readings={scene.readings} />}
      {taskID === "L1-2" && differencePlot && <div className="space-y-2 border-t border-border pt-4" data-system-property-difference>
        {plotFigure(differencePlot)}
        <p className="text-base leading-7">{f("tasks.L1-2.differencePlotGuide")}</p>
      </div>}
      {taskID === "L1-2" && systemPropertyReadout && <section className="space-y-3 border-y border-border py-4" data-system-property-readout>
        <h3 className="text-base font-medium">{f("tasks.L1-2.readoutTitle")}</h3>
        <p className="text-base leading-7">{f("tasks.L1-2.readoutTime", { time: engine.format(systemPropertyReadout.time, 3) })}</p>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="border-l-2 border-border pl-3"><dt className="text-sm text-muted-foreground">{f("tasks.L1-2.outputA")}</dt><dd className="mt-1 break-words font-mono text-lg">{engine.format(systemPropertyReadout.a, 4)}</dd></div>
          <div className="border-l-2 border-border pl-3"><dt className="text-sm text-muted-foreground">{f("tasks.L1-2.outputB")}</dt><dd className="mt-1 break-words font-mono text-lg">{engine.format(systemPropertyReadout.b, 4)}</dd></div>
          <div className="border-l-2 border-border pl-3"><dt className="text-sm text-muted-foreground">{f("tasks.L1-2.absoluteDifference")}</dt><dd className="mt-1 break-words font-mono text-lg">{engine.format(systemPropertyReadout.difference, 4)}</dd></div>
          <div className="border-l-2 border-border pl-3"><dt className="text-sm text-muted-foreground">{f("tasks.L1-2.result")}</dt><dd className="mt-1 break-words text-base font-medium">{f(systemPropertyReadout.counterexample ? "tasks.L1-2.different" : "tasks.L1-2.same")}</dd></div>
        </dl>
      </section>}
      {taskID === "L3-3" && step.key === "frequency" && scene.plots.filter((plot) => plot.key === "main").map(plotFigure)}
      {taskID === "L2-4" && record.params.mode === "audio" && <NativeLabAudio engine={engine} params={record.params} />}
      {taskID !== "L1-3" && <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">{visibleMetrics.map((metric) => <div key={metric.label} className="border-l-2 border-border pl-3"><dt className="text-sm text-muted-foreground">{metric.label}</dt><dd className="mt-1 break-words font-mono text-lg">{metric.value} <span className="text-sm">{metric.unit}</span></dd></div>)}</dl>}
      {step.observation && <div className="space-y-3 border-t border-border pt-4" data-lab-observation>
        <label htmlFor="observation" className="block text-base">{f(`readings.${step.observation.reading.replaceAll(".", "_")}`)}{readingUnit && <span className="ml-2 font-mono text-sm">({readingUnit})</span>}</label>
        {typeof labMeasurementAt(scene.readings, step.observation.reading) === "boolean" ? <select id="observation" value={observationText} className={`${inputClass} max-w-sm`} onChange={(event) => { setObservation({ signature: observationSignature, text: event.target.value }); setMessage(""); }}><option value="">{f("chooseObservation")}</option><option value="1">{taskID === "L1-2" ? f("tasks.L1-2.different") : f("yes")}</option><option value="0">{taskID === "L1-2" ? f("tasks.L1-2.same") : f("no")}</option></select>
          : <input id="observation" inputMode="text" autoComplete="off" maxLength={40} placeholder={f("readingPlaceholder")} value={observationText} className={`${inputClass} max-w-sm`} onChange={(event) => { setObservation({ signature: observationSignature, text: event.target.value }); setMessage(""); }} />}
        {step.predictedReadingKey && currentEstimateRevealed && <dl className="grid max-w-xl grid-cols-2 gap-4" data-reading-comparison>
          <div className="border-l-2 border-border pl-3"><dt className="text-sm text-muted-foreground">{f("predictedValue")}</dt><dd className="mt-1 break-words font-mono text-lg">{isCategoricalPrediction ? readingEstimate === "1" ? taskID === "L1-2" ? f("tasks.L1-2.different") : f("yes") : taskID === "L1-2" ? f("tasks.L1-2.same") : f("no") : engine.format(estimateValue ?? 0, 6)}</dd></div>
          <div className="border-l-2 border-border pl-3"><dt className="text-sm text-muted-foreground">{f("measuredValue")}</dt><dd className="mt-1 break-words font-mono text-lg">{measuredReading === null ? "—" : isCategoricalPrediction ? measuredReading === 1 ? taskID === "L1-2" ? f("tasks.L1-2.different") : f("yes") : taskID === "L1-2" ? f("tasks.L1-2.same") : f("no") : engine.format(measuredReading, 6)}</dd></div>
        </dl>}
      </div>}
      {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-sm text-muted-foreground" role="status">{f("recorded", { count: completedSteps, total: flow.steps.length })}</span>
        <Button data-action="trial" disabled={taskID === "L1-3" && setupChanged || !!step.observation && !observationText.trim() || !!scene.answerFeedback?.some((item) => item.status === "missing")} onClick={() => attempt(saveTrial)}>{f(taskID === "L1-2" ? "tasks.L1-2.recordAndContinue" : taskID === "L1-3" ? "tasks.L1-3.recordNext" : "recordNext")}<ArrowRight aria-hidden className="size-4" /></Button>
      </div>
      <details className="border-t border-border pt-4 text-sm" data-lab-tools><summary className="cursor-pointer">{f("tools")}</summary><div className="mt-5 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{task.params.filter((spec) => !step.controls?.includes(spec.key)).map((spec) => <NativeLabParameter key={spec.key} taskID={taskID} spec={spec} value={record.params[spec.key]} onChange={(value) => model.updateParams(taskID, { [spec.key]: value })} />)}</div>
        {scene.plots.filter((plot) => plot.key !== plotted.key && !(taskID === "L1-2" && plot.key === "difference")).map(plotFigure)}
        <p className="overflow-x-auto border-l-2 border-seal pl-4 font-mono leading-7">{scene.formula}</p><p className="leading-7">{scene.note}</p>
        {scene.answerFeedback?.map((item) => <p key={item.key} className="leading-6">{item.label}：{item.message}</p>)}
        <div className="flex flex-wrap gap-3"><Button variant="outline" size="sm" data-action="extra-trial" onClick={() => attempt(saveCurrent)}>{f("recordExtra")}</Button><Button variant="outline" size="sm" data-action="png" onClick={() => { void exportLabPNG(engine, taskID, scene, cursor?.value ?? null, cursor?.chart ?? "").catch((error: unknown) => setMessage(error instanceof Error ? error.message : t("actionFailed"))); }}><Download aria-hidden className="size-4" />{t("exportPNG")}</Button></div>
      </div></details>
      </>}
    </section>}
    {phase === "conclude" && <section className="space-y-6" data-lab-phase="conclude">
      <NativeLabPredictionSummary engine={engine} taskID={taskID} />
      <details className="border-b border-border pb-4" open={["L1-1", "L1-3"].includes(taskID)}><summary className="cursor-pointer text-sm">{f("results", { count: completedSteps })}</summary><div className="mt-5"><NativeLabComparison engine={engine} taskID={taskID} /></div></details>
      {predictionNeedsRevision && <p role="status" className="border-l-2 border-seal pl-4 text-base leading-7">{f(numericPredictionDiffers ? "predictionLargeDifference" : categoricalPredictionDiffers ? "predictionDifferent" : "predictionLargeDifference")}</p>}
      <label htmlFor="analysis" className="block space-y-3"><span className="font-display text-xl leading-8">{f(`tasks.${taskID}.conclusion`)}</span>{taskID === "L1-2" && <span className="block text-base leading-7">{f(`tasks.${taskID}.conclusionGuide`)}</span>}<textarea id="analysis" maxLength={12000} placeholder={f(["L1-2", "L1-3"].includes(taskID) ? `tasks.${taskID}.conclusionPlaceholder` : "conclusionPlaceholder")} value={record.analysis} onChange={(event) => saveText("analysis", event.target.value)} className={`${inputClass} ${taskID === "L1-2" ? "min-h-48" : "min-h-28"} resize-y leading-7`} /></label>
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
