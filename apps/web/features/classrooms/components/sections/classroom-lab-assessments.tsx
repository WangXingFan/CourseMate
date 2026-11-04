"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { LabAssessmentPaper, LabAssessmentResult } from "@/features/learning";
import { useClassroomLabAssessments } from "@/features/classrooms/hooks/use-classroom-lab-assessments";

export function ClassroomLabAssessments({ accessToken, classroomID }: { accessToken: string; classroomID: string }) {
  const t = useTranslations("learning.assessment");
  const model = useClassroomLabAssessments(accessToken, classroomID);
  const [course, setCourse] = useState("L1");
  const [start, setStart] = useState("");
  const [deadline, setDeadline] = useState("");
  const exists = model.items.some((item) => item.courseId === course);
  return <section className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8" data-lab-teacher>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl font-normal">{t("teacherTitle")}</h2><div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/learn/experiments/guide">{t("guide")}</Link></Button><Button variant="ghost" onClick={model.refresh}>{t("refresh")}</Button></div></div>
    <p className="mb-6 text-sm leading-7 text-muted-foreground">{t("teacherRules")}</p>
    {model.error && <p role="alert" className="mb-5 text-sm text-destructive">{model.error}</p>}
    {model.loading ? <Spinner /> : <>
      <form className="mb-8 space-y-4 border-y border-border py-5" onSubmit={(e) => { e.preventDefault(); void model.publish(course, start, deadline); }}>
        <h3 className="font-display text-xl font-normal">{t("publishTitle")}</h3>
        <div className="grid gap-4 lg:grid-cols-3"><label className="space-y-2 text-sm"><span className="block">{t("course")}</span><select aria-label={t("course")} value={course} onChange={(e) => setCourse(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">{["L1", "L2", "L3"].map((id) => <option key={id} value={id}>{t(id)}</option>)}</select></label>
          <label className="space-y-2 text-sm"><span className="block">{t("startOptional")}</span><Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label className="space-y-2 text-sm"><span className="block">{t("deadlineOptional")}</span><Input type="datetime-local" value={deadline} min={start || undefined} onChange={(e) => setDeadline(e.target.value)} /></label></div>
        <Button type="submit" disabled={model.pending || exists}>{t(exists ? "published" : "publish")}</Button>
      </form>
      <div className="divide-y divide-border">{model.items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="text-base">{t(item.courseId)} · {t(item.open ? "open" : "closed")}</p><p className="mt-2 text-sm text-muted-foreground">{t("deadline")} {item.deadline ? new Date(item.deadline).toLocaleString() : t("noDeadline")}</p></div><div className="flex gap-2"><Button variant="outline" disabled={model.pending} onClick={() => void model.setOpen(item.id, !item.open)}>{t(item.open ? "closeAction" : "openAction")}</Button><Button variant={model.selected === item.id ? "default" : "outline"} onClick={() => model.select(item.id)}>{t("viewReport")}</Button></div></div>)}</div>
      {model.report && <div className="mt-8 space-y-6">
        <h3 className="font-display text-2xl font-normal">{t(model.report.assignment.courseId)} · {t("report")}</h3>
        <div className="space-y-3"><p className="text-sm text-muted-foreground">{t("previewHint")}</p><div className="flex flex-wrap gap-2">{[1, 2, 3, 4].map((n) => <Button key={n} variant="outline" disabled={model.pending} onClick={() => void model.showPreview(model.selected, `${model.report?.assignment.courseId}-${n}`)}>{t("previewTask", { count: n })}</Button>)}</div></div>
        {model.preview && <details open className="rounded-lg border border-border p-5"><summary className="mb-4 cursor-pointer text-base">{t("sample")} · {model.preview.paper.title}</summary><LabAssessmentPaper paper={model.preview.paper} /><LabAssessmentResult paper={model.preview.paper} result={model.preview.result} referenceOnly /></details>}
        {model.report.students.length === 0 && <p className="text-sm">{t("noStudents")}</p>}
        {model.report.students.map((student) => <details key={student.id} className="rounded-lg border border-border p-4 sm:p-5"><summary className="cursor-pointer text-base">{student.name || student.username} <span className="ml-3 font-mono">{student.grade.total}/100</span></summary><div className="mt-5 divide-y divide-border">
          {student.grade.tasks.map((task) => <div key={task.id} className="space-y-4 py-5"><h4 className="font-display text-xl font-normal">{task.id} · {task.title} <span className="font-mono text-base">{task.total}/25</span></h4><p className="text-sm text-muted-foreground">{t(`status.${task.status}`)}</p><p className="text-sm text-muted-foreground">{t("operations")} {task.operations}/5 · {t("independent")} {task.independent}/15 · {t("concepts")} {task.concepts}/5</p>
            {task.attempts.map((attempt, index) => <details key={attempt.id}><summary className="cursor-pointer text-sm">{t("attempt", { count: index + 1 })} · {attempt.result ? `${attempt.result.score}/20` : t("inProgress")}</summary><div className="mt-4"><LabAssessmentPaper paper={attempt.paper} />{attempt.result && <LabAssessmentResult paper={attempt.paper} result={attempt.result} />}</div></details>)}
            {task.corrections.map((item) => <p key={item.at} className="text-sm">{t("correction", { score: item.score, reason: item.reason })}</p>)}
            <details><summary className="cursor-pointer text-sm text-muted-foreground">{t("correctGrade")}</summary><CorrectionForm key={task.corrections.length} score={task.total} pending={model.pending} onSave={(score, reason) => model.correct(student.id, task.id, score, reason)} /></details>
          </div>)}
        </div></details>)}
      </div>}
    </>}
  </section>;
}
function CorrectionForm({ score, pending, onSave }: { score: number; pending: boolean; onSave: (score: number, reason: string) => Promise<void> }) {
  const t = useTranslations("learning.assessment");
  const [value, setValue] = useState(String(score)); const [reason, setReason] = useState("");
  return <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void onSave(Number(value), reason); }}><label className="space-y-2 text-sm"><span className="block">{t("correctedScore")}</span><Input required type="number" min="0" max="25" step="0.5" value={value} onChange={(e) => setValue(e.target.value)} /></label><label className="space-y-2 text-sm"><span className="block">{t("reason")}</span><Input required value={reason} maxLength={600} onChange={(e) => setReason(e.target.value)} /></label><Button type="submit" className="justify-self-start" disabled={pending || !reason.trim()}>{t("saveCorrection")}</Button></form>;
}
