"use client";

import { ArrowUpRight, Download, Printer, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { labMissingWork, labTaskComplete } from "@/features/learning/model/virtual-lab-flow";
import { blackBoxPulse, blackBoxScene, readBlackBoxTrial } from "@/features/learning/model/virtual-lab-black-box";
import { diagnosisScene, readDiagnosisTrial } from "@/features/learning/model/virtual-lab-response-diagnosis";
import { ecgObservationPassed, ecgObservationScene, readEcgObservation } from "@/features/learning/model/virtual-lab-ecg";
import { labMeasurementText, labParameterText } from "@/features/learning/model/virtual-lab-native";
import type { VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";
import { NativeLabPlot } from "./native-lab-plot";
import { NativeLabLegacy } from "./native-lab-legacy";

const inputClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-70";

export function NativeLabTrials({ engine, taskID, onRestore, report = false }: {
  engine: VirtualLabEngine; taskID: string; onRestore?: (index: number) => void; report?: boolean;
}) {
  const t = useTranslations("learning.virtualLab.native");
  const b = useTranslations("learning.virtualLab.blackBox");
  const d = useTranslations("learning.virtualLab.responseDiagnosis");
  const e = useTranslations("learning.virtualLab.ecg");
  const trials = engine.records.data.tasks[taskID].trials;
  if (!trials.length) return <p className="py-4 text-sm text-muted-foreground">{t("noTrials")}</p>;
  return <div className="max-w-full overflow-x-auto"><table className="w-full min-w-[500px] text-left text-sm">
    <thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="py-3 pr-3">{t("sequence")}</th><th className="p-3">{t("measurements")}</th>{!report && onRestore && <th className="py-3 pl-3">{t("actions")}</th>}</tr></thead>
    <tbody>{trials.map((trial, index) => {
      const test = taskID === "L1-2" ? readBlackBoxTrial(trial) : null;
      const diagnosis = taskID === "L1-3" ? readDiagnosisTrial(trial) : null;
      const ecg = taskID === "L1-4" ? readEcgObservation(trial) : null;
      const pulse = test ? blackBoxPulse(test.box, test.probe) : null;
      return <tr key={`${trial.time}-${index}`} className="border-b border-border/50 align-top last:border-0">
      <td className="w-28 py-3 pr-3 font-mono text-sm text-muted-foreground">{String(index + 1).padStart(2, "0")}<br />{new Date(trial.time).toLocaleString()}</td>
      <td className="space-y-2 p-3 leading-6">{ecg ? <>
        <p>{e("answerRecord", { station: e(`stations.${ecg.station}.title`), answer: e(`stations.${ecg.station}.options.${ecg.answer}`) })}</p>
        <p>{e("window")}：{ecg.widths.join(" / ")} ms{ecg.station === "timing" && <> · t：{ecg.startTime} → {ecg.time} ms</>}</p>
        <p>{e(ecgObservationPassed(ecg) ? "correct" : "incorrect")}</p>
      </> : diagnosis ? <>
        <p>{d("answerRecord", { number: diagnosis.caseIndex + 1, source: d(`sources.${diagnosis.answers.source}`), test: d(`tests.${diagnosis.answers.test}`), prediction: d(`predictions.${diagnosis.answers.prediction}`) })}</p>
        <p>{d(diagnosis.result.passed ? "passed" : "revise")}</p>
      </> : test && pulse ? <>
        <p>{b("box", { id: test.box.id })} · {b(`probes.${test.probe}`)}</p>
        <p>{b(`observations.${test.probe}`, pulse)}</p>
        {test.guess && <p>{b("guessRecord", { id: test.box.id, model: b(`models.${test.guess}`) })} · {b(test.identified ? "identified" : "revise")}</p>}
        {test.guess && test.reasoning && <p>{b("reasoningRecord", { height: test.reasoning.height ?? "—", shift: test.reasoning.shift ?? "—" })}</p>}
      </> : <><p>{labParameterText(engine, taskID, trial.params)}</p>{Object.keys(trial.answers).length > 0 && <p className="font-mono text-muted-foreground">{Object.entries(trial.answers).map(([key, value]) => `${key}=${value || "—"}`).join("；")}</p>}<p className="break-words font-mono text-sm text-muted-foreground">{Object.entries(trial.measurements).map(([key, value]) => `${key}: ${labMeasurementText(value)}`).join("；")}</p><p className="text-sm text-muted-foreground">{trial.window.map((item) => `${item.key}: [${item.range.join(", ")}]`).join("；")} · {Object.values(trial.units).join(" / ")}</p></>}</td>
      {!report && onRestore && <td className="py-3 pl-3"><Button type="button" variant="ghost" size="sm" onClick={() => onRestore?.(index)}><RotateCcw aria-hidden className="size-4" />{t("restore")}</Button></td>}
    </tr>; })}</tbody>
  </table></div>;
}

export function NativeLabRecords({ engine, courseID, onPrint, openCourses }: { engine: VirtualLabEngine; courseID: string; onPrint: (id: string) => void; openCourses: Record<string, boolean> }) {
  const t = useTranslations("learning.virtualLab.native");
  const f = useTranslations("learning.virtualLab.flow");
  const data = engine.records.data;
  const allOpen = ["L1", "L2", "L3"].every((id) => openCourses[id]);
  const [clearOpen, setClearOpen] = useState(false);
  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-display text-3xl md:text-4xl font-normal tracking-[-0.015em]">{t("records")}</h1></div><div className="flex flex-wrap gap-2"><Button variant="outline" data-action="export" onClick={() => engine.records.export()}><Download aria-hidden className="size-3.5" />{t("export")}</Button><Button data-action="print" onClick={() => onPrint(courseID)}><Printer aria-hidden className="size-3.5" />{t("print")}</Button></div></header>
    <div className="grid gap-4 rounded-lg border border-border/60 bg-card p-5 sm:grid-cols-3">
      <label className="space-y-2 text-sm text-muted-foreground" htmlFor="student-name">{t("name")}<input id="student-name" readOnly value={data.student.name} className={inputClass} /></label>
      <label className="space-y-2 text-sm text-muted-foreground" htmlFor="student-number">{t("studentNumber")}<input id="student-number" readOnly value={data.student.number} className={inputClass} /></label>
      <label className="space-y-2 text-sm text-muted-foreground" htmlFor="student-classroom">{t("classroom")}<input id="student-classroom" readOnly={!Object.values(openCourses).some(Boolean)} maxLength={100} value={data.student.classroom} onChange={(event) => { data.student.classroom = event.target.value; engine.records.save(); }} className={inputClass} /></label>
    </div>
    <nav aria-label={t("chooseRecords")} className="flex flex-wrap gap-2">{engine.courses.map((course) => <a key={course.id} href={`#records/${course.id}`} aria-current={courseID === course.id ? "page" : undefined} className={`rounded-lg border px-4 py-2 text-sm ${courseID === course.id ? "border-primary/25 bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>{t("course", { number: course.number })} · {course.short}</a>)}</nav>
    {allOpen && <div className="flex justify-end"><Button variant="ghost" size="sm" className="text-destructive" onClick={() => setClearOpen(true)}>{t("clearRecords")}</Button></div>}
    <AlertDialog open={clearOpen} onOpenChange={setClearOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("clearRecords")}</AlertDialogTitle><AlertDialogDescription>{t("clearWarning")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => { if (allOpen) engine.records.clear(); }}>{t("confirm")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <NativeLabLegacy engine={engine} courseID={courseID} />
    {engine.courseIds(courseID).map((id) => {
      const task = data.tasks[id];
      return <section key={id} className="rounded-lg border border-border/60 bg-card p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-medium"><span className="mr-3 font-mono text-sm text-primary">{id}</span>{engine.tasks[id].title}</h2><a href={`#task/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground">{t("openTask")}<ArrowUpRight aria-hidden className="size-4" /></a></div><p className="text-sm leading-6 text-muted-foreground">{labTaskComplete(id, task) ? t("confirmed") : labMissingWork(id, task).map((key) => f(key)).join("；") || t("notConfirmed")}</p><NativeLabTrials engine={engine} taskID={id} onRestore={openCourses[courseID] ? (index) => { const trial = task.trials[index]; if (!trial || !engine.validParams(id, trial.params)) return; task.params = { ...trial.params }; task.answers = { ...engine.defaultAnswers(id), ...trial.answers }; task.completion = { confirmed: false, confirmedAt: null }; engine.records.save(); window.location.hash = `task/${id}`; } : undefined} /></section>;
    })}
  </div>;
}

export function NativeLabReport({ engine, courseID, onClose }: { engine: VirtualLabEngine; courseID: string; onClose: (value: null) => void }) {
  const f = useTranslations("learning.virtualLab.flow");
  const t = useTranslations("learning.virtualLab.native");
  const b = useTranslations("learning.virtualLab.blackBox");
  const d = useTranslations("learning.virtualLab.responseDiagnosis");
  const e = useTranslations("learning.virtualLab.ecg");
  const course = engine.courses.find((item) => item.id === courseID);
  useEffect(() => {
    const title = document.title;
    document.title = engine.records.filename("", `实验${courseID.slice(1)}`);
    document.body.dataset.labReport = "true";
    const finish = () => onClose(null);
    window.addEventListener("afterprint", finish);
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      void Promise.all(Array.from(document.querySelectorAll<HTMLImageElement>("#print-report img"), (image) => image.decode().catch(() => {}))).then(() => { if (!cancelled) window.print(); });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); document.title = title; delete document.body.dataset.labReport; window.removeEventListener("afterprint", finish); };
  }, [engine, courseID, onClose]);
  if (!course) return null;
  const data = engine.records.data;
  return createPortal(<article id="print-report" className="native-lab-print">
    <h1>{t("reportTitle", { number: course.number })}</h1><p>{course.name}</p><p>{t("name")}：{data.student.name}　{t("studentNumber")}：{data.student.number}　{t("classroom")}：{data.student.classroom || "—"}</p><p>CS3017 / v{data.appVersion} / schema {data.schemaVersion} / {new Date().toLocaleString()}</p>
    {engine.courseIds(courseID).map((id) => {
      const record = data.tasks[id];
      return <section key={id} className="native-lab-report-task"><h2>{id} {engine.tasks[id].title}</h2>{(id !== "L1-4" || record.prediction.trim()) && <><h3>{t("prediction")}</h3><p>{record.prediction || "—"}</p></>}{record.predictionDraft.trim() !== (record.revisions.at(-1)?.text ?? record.prediction) && <><h3>{t("draft")}</h3><p>{record.predictionDraft || "—"}</p></>}{record.revisions.map((item, index) => <div key={`${item.time}-${index}`}><h3>{t("revision", { number: index + 1 })} · {new Date(item.time).toLocaleString()}</h3><p>{item.text}</p></div>)}{(id !== "L1-4" || record.derivation.trim()) && <><h3>{t("derivation")}</h3><p>{record.derivation || "—"}</p></>}<h3>{t("measurements")}</h3><NativeLabTrials engine={engine} taskID={id} report /><h3>{t("analysis")}</h3><p>{record.analysis || "—"}</p><h3>{t("selfCheck")}</h3><p>{labTaskComplete(id, record) ? t("confirmed") : labMissingWork(id, record).map((key) => f(key)).join("；") || t("notConfirmed")}</p>
        {record.figures.map((figure, index) => {
          const test = id === "L1-2" ? readBlackBoxTrial(record.trials[index]) : null;
          const diagnosis = id === "L1-3" ? readDiagnosisTrial(record.trials[index]) : null;
          const ecg = id === "L1-4" ? readEcgObservation(record.trials[index]) : null;
          const scene = ecg ? ecgObservationScene(engine, ecg) : diagnosis ? diagnosisScene(engine, diagnosis.cases, diagnosis.caseIndex, diagnosis.answers) : test ? blackBoxScene(engine, test.box, test.probe) : engine.scene(id, figure.params, figure.answers);
          return <div key={`${figure.time}-${index}`} className="native-lab-report-figure"><h3>{t("trialNumber", { number: index + 1 })} · {new Date(figure.time).toLocaleString()}</h3><p>{ecg ? e("answerRecord", { station: e(`stations.${ecg.station}.title`), answer: e(`stations.${ecg.station}.options.${ecg.answer}`) }) : test ? `${b("box", { id: test.box.id })} · ${b(`probes.${test.probe}`)}` : labParameterText(engine, id, figure.params)}</p>{!test && scene.studentExpression && <p>{scene.studentExpression}</p>}{scene.plots.map((plot) => <div key={plot.key}><h4>{diagnosis ? plot.key === "response-comparison" ? d("originalChart") : `${d("verificationChart")} · ${d(`tests.${diagnosis.answers.test}`)}` : plot.title}</h4><NativeLabPlot engine={engine} taskID={id} plot={plot} cursor={plot.marker} yRange={ecg ? ecg.station === "noise" ? [-0.24, 0.24] : [-0.4, 1.2] : diagnosis ? [-0.15, 3.15] : test ? [-0.5, 4.5] : undefined} yTicks={diagnosis ? [0, 1, 2, 3] : test ? [0, 1, 2, 3, 4] : undefined} /></div>)}</div>;
        })}
      </section>;
    })}
    <NativeLabLegacy engine={engine} courseID={courseID} report />
  </article>, document.body);
}
