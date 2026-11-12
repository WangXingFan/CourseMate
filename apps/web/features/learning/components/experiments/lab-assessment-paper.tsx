"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import type { LabPaperResponse, LabResultResponse } from "@/shared/api/lab-assessments";
import { QuestionContent } from "@/shared/components/question-content";
import { responseSetupFromPoints } from "@/features/learning/model/virtual-lab-response-diagnosis";
import { ResponseComparisonPlot } from "./response-comparison-plot";
import { EcgObservationPlot } from "./ecg-observation-plot";
import { BlackBoxObservationPlot } from "./black-box-observation-plot";

function diagnosisSetup(paper: LabPaperResponse) {
  return paper.taskId === "L1-3" && paper.fields.some((field) => field.id === "test") ? responseSetupFromPoints(paper.reference) : null;
}

export function LabAssessmentPaper({ paper, onObservationView }: { paper: LabPaperResponse; onObservationView?: (id: string) => void }) {
  const t = useTranslations("learning.assessment");
  const points = paper.reference;
  const setup = diagnosisSetup(paper);
  const minX = Math.min(...points.map((p) => p.x)), maxX = Math.max(...points.map((p) => p.x));
  const maxY = Math.max(1, ...points.map((p) => p.y));
  const x = (v: number) => 50 + (v - minX) / (maxX - minX || 1) * 500;
  const y = (v: number) => 170 - v / maxY * 120;
  return <div className="space-y-4">
    <QuestionContent className="text-base leading-8" content={paper.prompt} />
    {paper.formula && <QuestionContent className="border-l-2 border-seal pl-4 text-sm leading-7 break-words" content={paper.formula} />}
    {!!paper.observations?.length && <BlackBoxObservationPlot observations={paper.observations} onView={onObservationView} />}
    {paper.taskId === "L1-4" && paper.fields.some((field) => field.id === "ecgPlan") ? <EcgObservationPlot station="shape" widthMs={20} compare /> : setup ? <ResponseComparisonPlot setup={setup} /> : points.length > 0 && <figure className="max-w-2xl border-b border-border pb-3">
      <figcaption className="text-sm text-muted-foreground">{t("reference")}</figcaption>
      <svg viewBox="0 0 600 210" role="img" aria-label={t("reference")} className="w-full">
        <path d="M40 20V170H565" fill="none" stroke="currentColor" opacity=".45" />
        <polyline points={points.map((p) => `${x(p.x)},${y(p.y)}`).join(" ")} fill="none" stroke="var(--chart-1)" strokeWidth="2.25" />
        {[...new Set(points.map((p) => p.x))].map((v) => <text key={v} x={x(v)} y="192" textAnchor="middle" fill="currentColor" fontSize="14">{v}</text>)}
        <text x="12" y="52" fill="currentColor" fontSize="14">{maxY}</text><text x="567" y="192" fill="currentColor" fontSize="14">t/s</text>
      </svg>
    </figure>}
  </div>;
}

export function LabAssessmentResult({ paper, result, conditionsOnly = false, referenceOnly = false }: { paper: LabPaperResponse; result: LabResultResponse; conditionsOnly?: boolean; referenceOnly?: boolean }) {
  const t = useTranslations("learning.assessment");
  return <div className="divide-y divide-border">
    {result.fields.map((item) => { const field = paper.fields.find((f) => f.id === item.id); const label = (value: string) => field?.options.find((o) => o.id === value)?.label ?? value;
      return <details key={item.id} open={!item.correct} className="py-3">
        <summary className="cursor-pointer text-sm leading-7">{field?.label} {!conditionsOnly && <span className="font-mono">{referenceOnly ? t("points", { value: Number(item.maximum.toFixed(2)) }) : `${Number(item.points.toFixed(2))}/${Number(item.maximum.toFixed(2))}`}</span>}{!referenceOnly && <> · {t(item.correct ? "correct" : "incorrect")}</>}</summary>
        {!referenceOnly && <QuestionContent className="mt-2 text-sm text-muted-foreground" content={`${t("yourAnswer")}${label(item.submitted) || t("blank")}`} />}
        {item.expected && <QuestionContent className="mt-2 text-sm" content={`${t("referenceAnswer")}${label(item.expected)} ${field?.unit ?? ""}`} />}
        {item.explanation && <QuestionContent className="mt-2 text-sm leading-7" content={item.explanation} />}
      </details>;
    })}
  </div>;
}

export function LabAssessmentForm({ paper, initial, draftKey, pending, disabled, checkpoint = false, onSubmit }: {
  paper: LabPaperResponse; initial: Record<string, string>; draftKey: string; pending: boolean; disabled: boolean; checkpoint?: boolean;
  onSubmit: (answers: Record<string, string>, requestID: string, confirmBlank: boolean) => Promise<void>;
}) {
  const t = useTranslations("learning.assessment");
  const d = useTranslations("learning.virtualLab.responseDiagnosis");
  const e = useTranslations("learning.virtualLab.ecg");
  const b = useTranslations("learning.virtualLab.blackBox");
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    try { const saved = sessionStorage.getItem(draftKey); return saved ? JSON.parse(saved) : initial; } catch { return initial; }
  });
  const [requestID, setRequestID] = useState(() => crypto.randomUUID());
  const [confirm, setConfirm] = useState(false);
  const blackBoxProbes = checkpoint ? paper.observations ?? [] : [];
  const [blackBoxSeen, setBlackBoxSeen] = useState([blackBoxProbes[0]?.id]);
  const blackBoxReady = blackBoxProbes.every((probe) => blackBoxSeen.includes(probe.id));
  const setup = diagnosisSetup(paper), operation = checkpoint && setup !== null;
  const ecgMode = checkpoint && paper.taskId === "L1-4" ? paper.fields.some((field) => field.id === "ecgNoise") ? "noise" : paper.fields.some((field) => field.id === "ecgTiming") ? "timing" : null : null;
  const ecgWidths = ecgMode === "noise" ? [10, 20] : [20, 80];
  const [ecgWidth, setEcgWidth] = useState(ecgWidths[0]);
  const [ecgSeen, setEcgSeen] = useState([ecgWidths[0]]);
  const [ecgTime, setEcgTime] = useState(400);
  const ecgReady = ecgWidths.every((width) => ecgSeen.includes(width)) && (ecgMode !== "timing" || ecgTime !== 400);
  const [tested, setTested] = useState(operation && disabled ? initial.test ?? "" : "");
  const hasRun = !!tested && tested === answers.test;
  const change = (id: string, value: string) => {
    const next = { ...answers, [id]: value };
    if (operation && id === "test") { setTested(""); next.observation = ""; }
    setAnswers(next); setRequestID(crypto.randomUUID());
    try { sessionStorage.setItem(draftKey, JSON.stringify(next)); } catch { /* The form remains usable if browser storage is full. */ }
  };
  return <>
    <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); if (!checkpoint && paper.fields.some((f) => !answers[f.id]?.trim())) setConfirm(true); else void onSubmit(answers, requestID, checkpoint); }}>
      <LabAssessmentPaper paper={paper} onObservationView={(id) => setBlackBoxSeen((seen) => seen.includes(id) ? seen : [...seen, id])} />
      {!blackBoxReady && !disabled && <p className="text-base leading-7">{b("compareFirst")}</p>}
      {ecgMode && <div className="space-y-5" data-ecg-operation={ecgMode}><div className="flex flex-wrap gap-3">{ecgWidths.map((width) => <Button key={width} type="button" variant={width === ecgWidth ? "default" : "outline"} aria-pressed={width === ecgWidth} data-ecg-width={width} onClick={() => { setEcgWidth(width); setEcgSeen((seen) => seen.includes(width) ? seen : [...seen, width]); }}>{width} ms</Button>)}</div><EcgObservationPlot station={ecgMode} widthMs={ecgWidth} timeMs={ecgTime} onTime={setEcgTime} />{!ecgReady && !disabled && <p className="text-base leading-7">{e(ecgMode === "timing" ? "moveFirst" : "compareFirst")}</p>}</div>}
      {paper.fields.some((field) => field.kind !== "choice") && <p className="text-sm text-muted-foreground">{t("numberHint")}</p>}
      <div className="space-y-5">
        {paper.fields.map((f) => <div key={f.id} className="min-w-0"><label htmlFor={`${draftKey}:${f.id}`} className="block text-sm leading-7">
          <span className="mb-2 block">{f.label}{f.unit ? ` (${f.unit})` : ""}{!checkpoint && <span className="ml-2 font-mono text-muted-foreground">{t("points", { value: f.points })}</span>}</span>
          {f.kind === "choice" ? <select id={`${draftKey}:${f.id}`} aria-label={f.label} value={answers[f.id] ?? ""} onChange={(e) => change(f.id, e.target.value)} disabled={disabled || pending || !blackBoxReady || ecgMode !== null && !ecgReady || operation && f.id === "observation" && !hasRun} className="min-h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">{t("choose")}</option>{f.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select> : <Input id={`${draftKey}:${f.id}`} aria-label={f.label} value={answers[f.id] ?? ""} onChange={(e) => change(f.id, e.target.value)} disabled={disabled || pending || !blackBoxReady} autoComplete="off" />}
        </label>{operation && f.id === "test" && <div className="mt-4 space-y-4"><Button type="button" variant="outline" data-response-test-run disabled={!answers.test || pending || disabled} onClick={() => setTested(answers.test)}>{d("runTest")}</Button>{hasRun && <div className="space-y-3" data-response-operation-result><p className="text-base leading-7">{paper.fields.find((field) => field.id === "test")?.options.find((option) => option.id === tested)?.label}</p><ResponseComparisonPlot setup={setup} test={tested} /></div>}</div>}</div>)}
      </div>
      <Button type="submit" disabled={pending || disabled || !blackBoxReady || blackBoxProbes.length > 0 && paper.fields.some((field) => !answers[field.id]?.trim()) || ecgMode !== null && (!ecgReady || paper.fields.some((field) => !answers[field.id])) || operation && (!hasRun || !answers.observation)}>{t(pending ? "saving" : checkpoint ? "check" : "submit")}</Button>
    </form>
    <AlertDialog open={confirm} onOpenChange={setConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("blankTitle")}</AlertDialogTitle><AlertDialogDescription>{t("blankDescription")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("back")}</AlertDialogCancel><AlertDialogAction onClick={() => { setConfirm(false); void onSubmit(answers, requestID, true); }}>{t("confirmSubmit")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
