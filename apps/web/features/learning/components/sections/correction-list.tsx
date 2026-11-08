"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { LearningCorrectionResponse } from "@deeix/api-contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuestionContent } from "@/shared/components/question-content";
import { MathFormula } from "@/features/learning/components/shared/math-formula";
import { useLearningCorrections, useLearningCorrectionAnswer } from "@/features/learning/hooks/use-learning-corrections";
import { LearningHelp } from "@/features/learning/components/shared/learning-help";

export function CorrectionList() {
  const t = useTranslations("learning.continuity");
  const m = useLearningCorrections();
  const params = useSearchParams();
  const requestedSource = params.get("source") ?? "all";
  const [source, setSource] = useState(["practice", "course", "classroom", "homework"].includes(requestedSource) ? requestedSource : "all");
  const [filter, setFilter] = useState("active");
  const [selected, setSelected] = useState<LearningCorrectionResponse>();
  useEffect(() => { setSelected(undefined); }, [m.owner]);
  const items = m.items.filter((item) => (source === "all" || source === item.source) && (filter === "all" || filter === "due" && item.reviewDue || filter === "active" && item.reviewStage < 5 || filter === "done" && item.reviewStage === 5));
  return <section className="space-y-5 border-t border-border pt-7">
    <h2 className="font-display text-2xl font-normal">{t("corrections")}</h2>
    <div className="flex flex-wrap gap-3"><select aria-label={t("source")} value={source} onChange={(e) => setSource(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">{["all", "practice", "course", "classroom", "homework"].map((key) => <option key={key} value={key}>{t(`sources.${key}`)}</option>)}</select><select aria-label={t("reviewState")} value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">{["active", "due", "done", "all"].map((key) => <option key={key} value={key}>{t(`filters.${key}`)}</option>)}</select><Button variant="ghost" onClick={m.refresh}>{t("refresh")}</Button></div>
    {m.error && <p role="alert" className="text-sm text-destructive">{m.error}</p>}
    {m.loading ? <p role="status">{t("loading")}</p> : !items.length && <p className="py-5 text-sm">{t("emptyCorrections")}</p>}
    <div className="divide-y divide-border">{items.map((item) => <article key={item.id} className="space-y-4 py-5"><p className="text-sm">{t(`sources.${item.source}`)} · {item.title}</p><QuestionContent content={item.prompt} /><div className="flex flex-wrap gap-3 text-sm"><span>{t("stage", { stage: item.reviewStage })}</span>{item.nextReviewAt && <span>{item.reviewDue ? t("due") : new Date(item.nextReviewAt).toLocaleDateString()}</span>}</div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setSelected(item)}>{t("correct")}</Button><Button asChild variant="ghost"><Link href={item.originHref}>{t("original")}</Link></Button>{item.lessonId && <Button asChild variant="ghost"><Link href={`/learn/knowledge?lesson=${encodeURIComponent(item.lessonId)}`}>{t("notes")}</Link></Button>}{item.conceptId && <Button asChild variant="ghost"><Link href={`/learn/practice?concept=${encodeURIComponent(item.conceptId)}`}>{t("practice")}</Link></Button>}</div></article>)}</div>
    <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(undefined); }}><DialogContent aria-describedby={undefined} className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{t("correct")}</DialogTitle></DialogHeader>{selected && <CorrectionAnswer key={`${m.owner}:${selected.id}`} item={selected} onSaved={m.refresh} onClose={() => setSelected(undefined)} />}</DialogContent></Dialog>
  </section>;
}

function CorrectionAnswer({ item, onSaved, onClose }: { item: LearningCorrectionResponse; onSaved: () => void; onClose: () => void }) {
  const t = useTranslations("learning.continuity");
  const m = useLearningCorrectionAnswer(item.id, onSaved);
  return <div className="space-y-5 rounded-lg border border-primary p-5" role="region" aria-label={t("correct")}>
    <div className="flex items-center justify-between gap-3"><h3 className="font-display text-xl font-normal">{t("correct")}</h3><Button variant="ghost" onClick={onClose} disabled={m.pending}>{t("close")}</Button></div>
    <QuestionContent content={item.prompt} />{item.formula && <MathFormula>{item.formula}</MathFormula>}
    <p className="text-sm">{t("originalAnswer")}: {item.options.length ? item.originalAnswers?.choice?.trim() ? item.options[Number(item.originalAnswers.choice)] ?? t("blank") : t("blank") : Object.values(item.originalAnswers ?? {}).join("；") || t("blank")}</p>
    {item.options.length ? <div className="grid gap-3 sm:grid-cols-2">{item.options.map((option, i) => <label key={option} aria-label={option} className="flex gap-3 rounded-md border border-border p-3 text-sm"><input type="radio" name={item.id} disabled={m.locked} checked={m.answers.choice === String(i)} onChange={() => m.setAnswers({ choice: String(i) })} /><QuestionContent content={option} /></label>)}</div> : item.fields.map((field) => <label key={field.id} className="grid gap-2 text-sm">{field.label} {field.unit}<Input disabled={m.locked} value={m.answers[field.id] ?? ""} maxLength={200} onChange={(e) => m.setAnswers({ ...m.answers, [field.id]: e.target.value })} /></label>)}
    {m.error && <p role="alert" className="text-sm text-destructive">{m.error}</p>}
    {!m.result && <Button onClick={() => void m.submit()} disabled={m.pending || !(item.options.length ? m.answers.choice !== undefined : item.fields.every((field) => m.answers[field.id]?.trim()))}>{m.error ? t("retry") : t("submit")}</Button>}
    {m.result && <div className="space-y-3 border-t border-border pt-4"><p role="status" className="font-mono">{m.result.attempt.score}/{m.result.attempt.total}</p>{m.result.attempt.results.map((field) => <div key={field.id}><QuestionContent content={`${field.correct ? t("correctAnswer") : t("expected")}: ${field.expected}`} /></div>)}<QuestionContent content={m.result.attempt.explanation} /><LearningHelp title={item.title} context={`${item.prompt}\n${item.formula}\n${item.options.join("\n")}\n${JSON.stringify(m.answers)}\n${m.result.attempt.explanation}`} returnHref="/learn/progress" /></div>}
  </div>;
}
