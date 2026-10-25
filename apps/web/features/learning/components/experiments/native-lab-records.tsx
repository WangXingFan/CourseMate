"use client";

import { ArrowUpRight, Download, Printer, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { labMeasurementText, labParameterText } from "@/features/learning/model/virtual-lab-native";
import type { VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";
import { NativeLabPlot } from "./native-lab-plot";

const inputClass = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-70";

export function NativeLabTrials({ engine, taskID, onRestore, report = false }: {
  engine: VirtualLabEngine; taskID: string; onRestore?: (index: number) => void; report?: boolean;
}) {
  const t = useTranslations("learning.virtualLab.native");
  const trials = engine.records.data.tasks[taskID].trials;
  if (!trials.length) return <p className="py-4 text-sm text-muted-foreground">{t("noTrials")}</p>;
  return <div className="max-w-full overflow-x-auto"><table className="w-full min-w-[500px] text-left text-sm">
    <thead className="border-b border-border text-xs text-muted-foreground"><tr><th className="py-3 pr-3">{t("sequence")}</th><th className="p-3">{t("measurements")}</th>{!report && <th className="py-3 pl-3">{t("actions")}</th>}</tr></thead>
    <tbody>{trials.map((trial, index) => <tr key={`${trial.time}-${index}`} className="border-b border-border/50 align-top last:border-0">
      <td className="w-28 py-3 pr-3 font-mono text-sm text-muted-foreground">{String(index + 1).padStart(2, "0")}<br />{new Date(trial.time).toLocaleString()}</td>
      <td className="space-y-2 p-3 leading-6"><p>{labParameterText(engine, taskID, trial.params)}</p>{Object.keys(trial.answers).length > 0 && <p className="font-mono text-muted-foreground">{Object.entries(trial.answers).map(([key, value]) => `${key}=${value || "—"}`).join("；")}</p>}<p className="break-words font-mono text-sm text-muted-foreground">{Object.entries(trial.measurements).map(([key, value]) => `${key}: ${labMeasurementText(value)}`).join("；")}</p><p className="text-sm text-muted-foreground">{trial.window.map((item) => `${item.key}: [${item.range.join(", ")}]`).join("；")} · {Object.values(trial.units).join(" / ")}</p></td>
      {!report && <td className="py-3 pl-3"><Button type="button" variant="ghost" size="sm" onClick={() => onRestore?.(index)}><RotateCcw aria-hidden className="size-4" />{t("restore")}</Button></td>}
    </tr>)}</tbody>
  </table></div>;
}

export function NativeLabRecords({ engine, courseID, onPrint }: { engine: VirtualLabEngine; courseID: string; onPrint: (id: string) => void }) {
  const t = useTranslations("learning.virtualLab.native");
  const data = engine.records.data;
  const [clearOpen, setClearOpen] = useState(false);
  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-display text-3xl md:text-4xl font-normal tracking-[-0.015em]">{t("records")}</h1></div><div className="flex flex-wrap gap-2"><Button variant="outline" data-action="export" onClick={() => engine.records.export()}><Download aria-hidden className="size-3.5" />{t("export")}</Button><Button data-action="print" onClick={() => onPrint(courseID)}><Printer aria-hidden className="size-3.5" />{t("print")}</Button></div></header>
    <div className="grid gap-4 rounded-lg border border-border/60 bg-card p-5 sm:grid-cols-3">
      <label className="space-y-2 text-sm text-muted-foreground" htmlFor="student-name">{t("name")}<input id="student-name" readOnly value={data.student.name} className={inputClass} /></label>
      <label className="space-y-2 text-sm text-muted-foreground" htmlFor="student-number">{t("studentNumber")}<input id="student-number" readOnly value={data.student.number} className={inputClass} /></label>
      <label className="space-y-2 text-sm text-muted-foreground" htmlFor="student-classroom">{t("classroom")}<input id="student-classroom" maxLength={100} value={data.student.classroom} onChange={(event) => { data.student.classroom = event.target.value; engine.records.save(); }} className={inputClass} /></label>
    </div>
    <nav aria-label={t("chooseRecords")} className="flex flex-wrap gap-2">{engine.courses.map((course) => <a key={course.id} href={`#records/${course.id}`} aria-current={courseID === course.id ? "page" : undefined} className={`rounded-lg border px-4 py-2 text-sm ${courseID === course.id ? "border-primary/25 bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>{t("course", { number: course.number })} · {course.short}</a>)}</nav>
    <div className="flex justify-end"><Button variant="ghost" size="sm" className="text-destructive" onClick={() => setClearOpen(true)}>{t("clearRecords")}</Button></div>
    <AlertDialog open={clearOpen} onOpenChange={setClearOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("clearRecords")}</AlertDialogTitle><AlertDialogDescription>{t("clearWarning")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => engine.records.clear()}>{t("confirm")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    {engine.courseIds(courseID).map((id) => {
      const task = data.tasks[id];
      return <section key={id} className="rounded-lg border border-border/60 bg-card p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-medium"><span className="mr-3 font-mono text-sm text-primary">{id}</span>{engine.tasks[id].title}</h2><a href={`#task/${id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground">{t("openTask")}<ArrowUpRight aria-hidden className="size-4" /></a></div><p className="text-sm leading-6 text-muted-foreground">{task.completion.confirmed ? t("confirmed") : engine.records.missing(id).join("；") || t("notConfirmed")}</p><NativeLabTrials engine={engine} taskID={id} onRestore={(index) => { const trial = task.trials[index]; if (!trial || !engine.validParams(id, trial.params)) return; task.params = { ...trial.params }; task.answers = { ...engine.defaultAnswers(id), ...trial.answers }; task.completion = { confirmed: false, confirmedAt: null }; engine.records.save(); window.location.hash = `task/${id}`; }} /></section>;
    })}
  </div>;
}

export function NativeLabReport({ engine, courseID, onClose }: { engine: VirtualLabEngine; courseID: string; onClose: (value: null) => void }) {
  const t = useTranslations("learning.virtualLab.native");
  const course = engine.courses.find((item) => item.id === courseID);
  useEffect(() => {
    const title = document.title;
    document.title = engine.records.filename("", `实验${courseID.slice(1)}`);
    document.body.dataset.labReport = "true";
    const finish = () => onClose(null);
    window.addEventListener("afterprint", finish);
    const frame = requestAnimationFrame(() => window.print());
    return () => { cancelAnimationFrame(frame); document.title = title; delete document.body.dataset.labReport; window.removeEventListener("afterprint", finish); };
  }, [engine, courseID, onClose]);
  if (!course) return null;
  const data = engine.records.data;
  return createPortal(<article id="print-report" className="native-lab-print">
    <h1>{t("reportTitle", { number: course.number })}</h1><p>{course.name}</p><p>{t("name")}：{data.student.name}　{t("studentNumber")}：{data.student.number}　{t("classroom")}：{data.student.classroom || "—"}</p><p>CS3017 / v{data.appVersion} / schema {data.schemaVersion} / {new Date().toLocaleString()}</p>
    {engine.courseIds(courseID).map((id) => {
      const record = data.tasks[id];
      return <section key={id} className="native-lab-report-task"><h2>{id} {engine.tasks[id].title}</h2><h3>{t("prediction")}</h3><p>{record.prediction || "—"}</p>{record.predictionDraft.trim() !== (record.revisions.at(-1)?.text ?? record.prediction) && <><h3>{t("draft")}</h3><p>{record.predictionDraft || "—"}</p></>}{record.revisions.map((item, index) => <div key={`${item.time}-${index}`}><h3>{t("revision", { number: index + 1 })} · {new Date(item.time).toLocaleString()}</h3><p>{item.text}</p></div>)}<h3>{t("derivation")}</h3><p>{record.derivation || "—"}</p><h3>{t("measurements")}</h3><NativeLabTrials engine={engine} taskID={id} report /><h3>{t("analysis")}</h3><p>{record.analysis || "—"}</p><h3>{t("selfCheck")}</h3><p>{record.completion.confirmed ? t("confirmed") : engine.records.missing(id).join("；") || t("notConfirmed")}</p>
        {record.figures.map((figure, index) => {
          const scene = engine.scene(id, figure.params, figure.answers);
          return <div key={`${figure.time}-${index}`} className="native-lab-report-figure"><h3>{t("trialNumber", { number: index + 1 })} · {new Date(figure.time).toLocaleString()}</h3><p>{labParameterText(engine, id, figure.params)}</p>{scene.studentExpression && <p>{scene.studentExpression}</p>}{scene.plots.map((plot) => <div key={plot.key}><h4>{plot.title}</h4><NativeLabPlot engine={engine} taskID={id} plot={plot} cursor={plot.marker} /></div>)}</div>;
        })}
      </section>;
    })}
  </article>, document.body);
}
