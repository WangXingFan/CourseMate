"use client";

import { ArrowLeft, ArrowRight, Check, Download, Pause, Play, RotateCcw, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { NativeLabModel } from "@/features/learning/hooks/use-learning-native-lab";
import { exportLabPNG, labPresets } from "@/features/learning/model/virtual-lab-native";
import type { LabParameter, LabValue, VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";
import { NativeLabPlot } from "./native-lab-plot";
import { NativeLabTrials } from "./native-lab-records";

const inputClass = "w-full rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-invalid:border-destructive";
const panelClass = "min-w-0 rounded-xl border border-border/60 bg-card p-4 sm:p-5";

function ParameterControl({ spec, value, onChange, taskID }: { spec: LabParameter; value: LabValue; onChange: (value: LabValue) => boolean; taskID: string }) {
  const t = useTranslations("learning.virtualLab.native");
  const [text, setText] = useState(String(value));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { setText(String(value)); setInvalid(false); }, [value]);
  const id = `param-${spec.key}`;
  return <div className="space-y-2">
    <label htmlFor={id} className="flex items-center justify-between gap-2 text-xs"><span>{spec.label}</span><span className="font-mono text-[10px] text-muted-foreground">{spec.unit}</span></label>
    {spec.type === "select" ? <select id={id} value={value} className={inputClass} onChange={(event) => onChange(event.target.value)}>{spec.options?.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select> : <>
      <input id={id} type="number" min={spec.min} max={spec.max} step={spec.step} value={text} aria-invalid={invalid} aria-label={`${spec.label}精确值`} className={inputClass}
        onChange={(event) => { const next = event.target.value; setText(next); setInvalid(!next.trim() || !onChange(Number(next))); }} />
      <input type="range" min={spec.min} max={spec.max} step={spec.step} value={value} aria-label={`${spec.label}滑块`} className="h-1.5 w-full cursor-pointer accent-primary"
        onChange={(event) => { let next = Number(event.target.value); if (taskID === "L1-1" && spec.key === "a" && Math.abs(next) < 0.25) next = Number(value) > 0 ? -0.25 : 0.25; if (onChange(next)) { setText(String(next)); setInvalid(false); } }} />
      {invalid && <p role="alert" className="text-[10px] leading-5 text-destructive">{t("invalidParameter")}</p>}
    </>}
  </div>;
}

function AnswerControl({ label, fieldKey, placeholder, value, onChange }: { label: string; fieldKey: string; placeholder: string; value: string; onChange: (value: string) => boolean }) {
  const t = useTranslations("learning.virtualLab.native");
  const [text, setText] = useState(value);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { setText(value); setInvalid(false); }, [value]);
  return <label htmlFor={`answer-${fieldKey}`} className="block space-y-2 text-xs leading-5"><span>{label}</span><input id={`answer-${fieldKey}`} data-answer={fieldKey} inputMode="decimal" maxLength={100} placeholder={placeholder} value={text} aria-invalid={invalid} className={inputClass}
    onChange={(event) => { setText(event.target.value); setInvalid(!onChange(event.target.value)); }} />{invalid && <span role="alert" className="block text-[10px] text-destructive">{t("invalidAnswer")}</span>}</label>;
}

export function NativeLabTask({ model, engine, taskID }: { model: NativeLabModel; engine: VirtualLabEngine; taskID: string }) {
  const t = useTranslations("learning.virtualLab.native");
  const task = engine.tasks[taskID], record = engine.records.data.tasks[taskID];
  const courseTasks = engine.courseIds(taskID.slice(0, 2)), taskIndex = courseTasks.indexOf(taskID);
  const [cursor, setCursor] = useState<{ chart: string; value: number } | null>(null);
  const [hints, setHints] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null);
  const scene = useMemo(() => engine.scene(taskID, record.params, record.answers), [engine, taskID, record.params, record.answers]);
  const refreshView = model.refreshView;
  useEffect(() => {
    if (!playing) return;
    let frame = 0, previous = 0;
    const advance = (timestamp: number) => {
      if (!previous) previous = timestamp;
      if (timestamp - previous >= 45) {
        record.params = { ...record.params, time: Math.min(5, Number((Number(record.params.time) + Math.min((timestamp - previous) / 1000, 0.15) * Number(record.params.speed)).toFixed(3))) };
        record.completion = { confirmed: false, confirmedAt: null };
        previous = timestamp;
        refreshView();
      }
      if (Number(record.params.time) >= 5) setPlaying(false);
      else frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => { cancelAnimationFrame(frame); engine.records.save(); };
  }, [engine, record, playing, refreshView]);

  const run = async (action: () => void | Promise<void>, success?: string) => {
    try { await action(); if (success) setMessage({ text: success, failed: false }); }
    catch (error) { setMessage({ text: error instanceof Error ? error.message : t("actionFailed"), failed: true }); }
  };
  const setParams = (partial: Record<string, LabValue>) => { setPlaying(false); return model.updateParams(taskID, partial); };
  const saveText = (field: "predictionDraft" | "derivation" | "analysis", value: string) => {
    record[field] = value; record.completion = { confirmed: false, confirmedAt: null }; engine.records.save();
  };
  const saveTrial = () => {
    setPlaying(false);
    const plot = scene.plots.find((item) => item.key === cursor?.chart);
    const reading = plot && cursor ? { chart: plot.key, x: cursor.value, unit: plot.xUnit || "s", values: plot.series.map((series) => ({ label: series.label, value: engine.plot.read(series, cursor.value, plot.breakJump) })) } : null;
    engine.records.trial(taskID, { ...scene, readings: { ...scene.readings, cursor: reading } }, cursor?.value ?? null);
  };
  const guide = engine.guides[taskID];
  return <div className="space-y-5" data-native-task={taskID}>
    <nav aria-label={t("chooseTask")} className="flex flex-wrap gap-2">{courseTasks.map((id, index) => <a key={id} href={`#task/${id}`} aria-current={id === taskID ? "step" : undefined} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${id === taskID ? "border-primary/30 bg-primary/5 text-primary" : "border-border/70 text-muted-foreground"}`}><span className="font-mono text-[10px]">0{index + 1}</span>{engine.tasks[id].short || engine.tasks[id].title}{engine.records.data.tasks[id].completion.confirmed && <Check aria-hidden className="size-3" />}</a>)}</nav>
    <header><p className="mb-2 font-mono text-[10px] tracking-wider text-primary">{taskID} / {task.eyebrow}</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{task.title}</h1><p className="mt-3 max-w-3xl text-xs leading-6 text-muted-foreground">{task.goal}</p></header>
    {guide && <details className={`${panelClass} text-xs leading-7`} open={record.trials.length === 0}><summary className="cursor-pointer font-medium">{t("taskGuide")}</summary><ol className="mt-3 list-decimal space-y-2 pl-5 text-muted-foreground">{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol><p className="mt-3 border-t border-border pt-3">{t("evidenceCheck")}：{guide.evidence}</p></details>}
    {message && <p role={message.failed ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-xs ${message.failed ? "border-destructive/30 text-destructive" : "border-primary/20 text-primary"}`}>{message.text}</p>}
    <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-5">
        <section className={panelClass}><h2 className="mb-4 text-sm font-medium">01 / {t("prediction")}</h2><p className="mb-3 text-sm leading-7">{task.question}</p><textarea id="prediction" aria-label={t("prediction")} maxLength={12000} placeholder={task.prediction} value={record.predictionDraft} onChange={(event) => saveText("predictionDraft", event.target.value)} className={`${inputClass} min-h-28 resize-y leading-6`} /><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] text-muted-foreground">{t("predictionHint")}</p><Button size="sm" variant="outline" data-action="prediction" onClick={() => run(() => engine.records.prediction(taskID), t("predictionSaved"))}>{record.prediction ? t("saveRevision") : t("savePrediction")}</Button></div>
          {record.prediction && <details className="mt-4 rounded-lg bg-muted/30 p-3 text-xs leading-6"><summary className="cursor-pointer">{t("predictionHistory", { count: record.revisions.length })}</summary><p className="mt-3 whitespace-pre-wrap">{record.prediction}</p>{record.revisions.map((item, index) => <div key={`${item.time}-${index}`} className="mt-3 border-t border-border pt-3"><p className="text-[10px] text-muted-foreground">{t("revision", { number: index + 1 })} · {new Date(item.time).toLocaleString()}</p><p className="whitespace-pre-wrap">{item.text}</p></div>)}</details>}
        </section>
        <section className={panelClass}><h2 className="mb-4 text-sm font-medium">02 / {t("observe")}</h2><p className="mb-4 overflow-x-auto rounded-lg bg-muted/35 px-4 py-3 font-mono text-xs leading-6">{scene.formula}</p><div className="space-y-5">{scene.plots.map((plot) => <figure key={plot.key} className="min-w-0"><figcaption className="mb-2 text-xs font-medium">{plot.title}</figcaption><NativeLabPlot engine={engine} taskID={taskID} plot={plot} cursor={plot.marker ?? (cursor?.chart === plot.key ? cursor.value : null)} onCursor={(value) => setCursor({ chart: plot.key, value })} />{cursor?.chart === plot.key && <p className="px-3 text-[10px] leading-6 text-muted-foreground">{plot.series.map((series) => { const value = engine.plot.read(series, cursor.value, plot.breakJump); return `${series.label}: ${value === null ? "—" : engine.format(value, 6)}`; }).join(" · ")}</p>}</figure>)}</div><dl className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">{scene.metrics.map((metric) => <div key={metric.label} className="rounded-lg border border-border/50 bg-muted/20 p-3"><dt className="text-[10px] leading-5 text-muted-foreground">{metric.label}</dt><dd className="mt-1 break-words font-mono text-sm">{metric.value} <span className="text-[10px] text-muted-foreground">{metric.unit}</span></dd></div>)}</dl><p className="mt-4 text-[11px] leading-6 text-muted-foreground">{scene.note}</p><p className="mt-2 text-[10px] text-muted-foreground">{t("cursorHint")}</p><div className="mt-5 flex flex-wrap justify-end gap-2"><Button variant="outline" size="sm" data-action="png" onClick={() => run(() => exportLabPNG(engine, taskID, scene, cursor?.value ?? null, cursor?.chart ?? ""), t("pngSaved"))}><Download aria-hidden className="size-3.5" />{t("exportPNG")}</Button><Button size="sm" data-action="trial" onClick={() => run(saveTrial, t("trialSaved"))}><Save aria-hidden className="size-3.5" />{t("saveTrial")}</Button></div></section>
        <section className={panelClass}><h2 className="text-sm font-medium">03 / {t("trialRecords")}</h2><NativeLabTrials engine={engine} taskID={taskID} onRestore={(index) => { const trial = record.trials[index]; record.answers = { ...engine.defaultAnswers(taskID), ...trial.answers }; setParams(trial.params); }} /></section>
        <section className={`${panelClass} space-y-4`}><h2 className="text-sm font-medium">04 / {t("explain")}</h2><label htmlFor="derivation" className="block space-y-2 text-xs"><span>{t("derivation")}</span><textarea id="derivation" maxLength={12000} value={record.derivation} onChange={(event) => saveText("derivation", event.target.value)} className={`${inputClass} min-h-28 resize-y leading-6`} /></label><label htmlFor="analysis" className="block space-y-2 text-xs"><span>{t("analysis")}</span><textarea id="analysis" maxLength={12000} placeholder={task.analysis} value={record.analysis} onChange={(event) => saveText("analysis", event.target.value)} className={`${inputClass} min-h-32 resize-y leading-6`} /></label><p className="text-[10px] leading-6 text-muted-foreground">{t("selfCheckHint")}</p><Button variant="outline" data-action="complete" onClick={() => { const missing = engine.records.missing(taskID); if (missing.length) setMessage({ text: `${t("missing")}：${missing.join("、")}`, failed: true }); else setConfirming(true); }}><Check aria-hidden className="size-3.5" />{record.completion.confirmed ? t("confirmed") : t("confirmCompletion")}</Button></section>
        <nav className="flex flex-wrap justify-between gap-4 text-xs text-muted-foreground"><a className="inline-flex items-center gap-2" href={taskIndex > 0 ? `#task/${courseTasks[taskIndex - 1]}` : `#course/${taskID.slice(0, 2)}`}><ArrowLeft aria-hidden className="size-3.5" />{t("previous")}</a><a className="inline-flex items-center gap-2" href={taskIndex < 3 ? `#task/${courseTasks[taskIndex + 1]}` : `#records/${taskID.slice(0, 2)}`}>{taskIndex < 3 ? t("next") : t("records")}<ArrowRight aria-hidden className="size-3.5" /></a></nav>
      </div>
      <aside className="min-w-0 space-y-5">
        <section className={`${panelClass} space-y-5`}><div className="flex items-center justify-between"><h2 className="text-sm font-medium">{t("parameters")}</h2><Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setParams(engine.defaults(taskID))}><RotateCcw aria-hidden className="size-3" />{t("reset")}</Button></div>{labPresets(taskID).length > 0 && <div className="space-y-2"><p className="text-[10px] text-muted-foreground">{t("quickPresets")}</p><div className="flex flex-wrap gap-2">{labPresets(taskID).map((preset) => <Button key={preset.label} size="sm" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => setParams(preset.params)}>{preset.label}</Button>)}</div></div>}{taskID === "L1-4" && <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => { if (!playing && Number(record.params.time) >= 5) model.updateParams(taskID, { time: -1 }); setPlaying(!playing); }}>{playing ? <Pause aria-hidden className="size-3" /> : <Play aria-hidden className="size-3" />}{playing ? t("pause") : t("play")}</Button><Button size="sm" variant="outline" onClick={() => setParams({ time: Math.min(5, Number(record.params.time) + 0.05) })}>{t("singleStep")}</Button></div>}{task.params.map((spec) => <ParameterControl key={spec.key} taskID={taskID} spec={spec} value={record.params[spec.key]} onChange={(value) => setParams({ [spec.key]: value })} />)}<p className="text-[10px] leading-5 text-muted-foreground">{t("parameterHint")}</p>
          {!!task.answers?.length && <div className="space-y-4 border-t border-border pt-5"><h3 className="text-xs font-medium">{t("templates")}</h3>{task.answers.map((answer) => <AnswerControl key={answer.key} label={answer.label} fieldKey={answer.key} placeholder={answer.placeholder} value={record.answers[answer.key] || ""} onChange={(value) => { const next = { ...record.answers, [answer.key]: value }; if (!engine.validAnswers(taskID, next)) return false; record.answers = next; record.completion = { confirmed: false, confirmedAt: null }; engine.records.save(); return true; }} />)}<p className="break-words font-mono text-[10px] leading-6">{scene.studentExpression}</p>{scene.answerFeedback?.map((item) => <p key={item.key} className={`text-[10px] leading-6 ${item.status === "correct" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>{item.label}：{item.message}</p>)}</div>}
        </section>
        <section className={panelClass}><div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-sm font-medium">{t("hints")}</h2><Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" disabled={hints >= task.hints.length} onClick={() => setHints((value) => value + 1)}>{t("nextHint")}</Button></div><ol className="list-decimal space-y-3 pl-4 text-[11px] leading-6 text-muted-foreground">{task.hints.slice(0, hints).map((hint) => <li key={hint}>{hint}</li>)}</ol></section>
        <section className={panelClass}><h2 className="mb-3 text-sm font-medium">{t("evidence")}</h2><p className="text-[11px] leading-7 text-muted-foreground">{task.evidence}</p></section>
      </aside>
    </div>
    <AlertDialog open={confirming} onOpenChange={setConfirming}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("confirmCompletion")}</AlertDialogTitle><AlertDialogDescription>{t("selfCheckHint")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => { record.completion = { confirmed: true, confirmedAt: new Date().toISOString() }; engine.records.save(); }}>{t("confirm")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
