"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuestionContent } from "@/shared/components/question-content";
import { useClassroomRemediation } from "@/features/classrooms/hooks/use-classroom-remediation";

export type RemediationStudent = { id: string; name: string; weakConceptIds: string[] };
export function RemediationDialog({ accessToken, classroomID, concept, students, onClose }: { accessToken: string; classroomID: string; concept: { id: string; title: string }; students: RemediationStudent[]; onClose: () => void }) {
  const t = useTranslations("classrooms.continuity");
  const m = useClassroomRemediation(accessToken, classroomID, concept.id);
  const [title, setTitle] = useState(t("remediationTitle", { title: concept.title }).slice(0, 120));
  const [targets, setTargets] = useState(students.filter((s) => s.weakConceptIds.includes(concept.id)).map((s) => s.id));
  return <Dialog open onOpenChange={(open) => { if (!open && !m.pending) onClose(); }}><DialogContent aria-describedby={undefined} className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{t("remediate")}</DialogTitle></DialogHeader>
    {m.error && <p role="alert" className="text-sm text-destructive">{m.error}</p>}
    {m.loading ? <p role="status">{t("loading")}</p> : m.published ? <div className="space-y-5"><p role="status">{t("remediationPublished")}</p><Button variant="outline" disabled={m.pending} onClick={() => void m.refreshReport()}>{t("remediationResults")}</Button>{m.report && <><p>{t("resultCounts", { submitted: m.report.submissions.length, total: m.report.students.length })}</p><div className="divide-y divide-border">{m.report.students.map((student) => { const sub = m.report?.submissions.find((s) => s.studentId === student.id); return <p key={student.id} className="flex justify-between gap-3 py-3 text-sm"><span>{student.displayName || student.username}</span><span>{sub ? sub.score : t("notSubmitted")}</span></p>; })}</div></>}</div> : <div className="space-y-6">
      <label className="grid gap-2 text-sm">{t("taskTitle")}<Input maxLength={120} value={title} disabled={m.locked} onChange={(e) => setTitle(e.target.value)} /></label>
      <fieldset disabled={m.locked} className="space-y-3"><legend className="mb-3 font-display text-xl">{t("recipients", { count: targets.length })}</legend><div className="flex flex-wrap gap-4">{students.map((student) => <label key={student.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={targets.includes(student.id)} onChange={(e) => setTargets((ids) => e.target.checked ? [...ids, student.id] : ids.filter((id) => id !== student.id))} />{student.name}</label>)}</div></fieldset>
      <fieldset disabled={m.locked} className="space-y-4"><legend className="mb-3 font-display text-xl">{t("pickQuestions", { count: m.selected.length })}</legend>{m.questions.map((q) => <div key={q.id} className="space-y-3 border-t border-border pt-4"><label aria-label={q.prompt} className="flex gap-3"><input type="checkbox" checked={m.selected.includes(q.id)} disabled={!m.selected.includes(q.id) && m.selected.length >= 10} onChange={(e) => m.setSelected((ids) => e.target.checked ? [...ids, q.id] : ids.filter((id) => id !== q.id))} /><QuestionContent content={q.prompt} /></label>{q.options?.map((option, i) => <QuestionContent key={option} content={`${String.fromCharCode(65+i)}. ${option}`} className="pl-6 text-sm" />)}<details className="pl-6 text-sm leading-7"><summary className="cursor-pointer">{t("answer")}</summary><QuestionContent content={q.options?.length ? q.options[q.answer] : q.fields.map((f) => `${f.label}: ${f.expected} ${f.unit}`).join("；")} /><QuestionContent content={q.explanation} /></details></div>)}</fieldset>
      {!m.questions.length && <Button variant="outline" onClick={m.retry}>{t("retry")}</Button>}
      <Button disabled={m.pending || !title.trim() || !targets.length || !m.selected.length} onClick={() => void m.publish(title, targets)}>{m.locked ? t("retryPublish") : t("publishRemediation")}</Button>
    </div>}
  </DialogContent></Dialog>;
}
