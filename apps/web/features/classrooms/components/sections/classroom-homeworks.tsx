"use client";

import { ArrowLeft, ArrowRight, BookOpen, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { HomeworkQuestions } from "@/features/classrooms/components/shared/homework-questions";
import { useClassroomHomeworks } from "@/features/classrooms/hooks/use-classroom-homeworks";
import type { HomeworkPaperResponse } from "@/shared/api/homeworks";

export function ClassroomHomeworks({ accessToken, classroomID }: { accessToken: string; classroomID: string }) {
  const t = useTranslations("classrooms.homework");
  const locale = useLocale();
  const model = useClassroomHomeworks(accessToken, classroomID);
  const [paper, setPaper] = useState<HomeworkPaperResponse>();
  const [startsAt, setStartsAt] = useState("");
  const [deadline, setDeadline] = useState("");
  const [studentID, setStudentID] = useState("");
  const report = model.report;
  const submission = report?.submissions.find((item) => item.studentId === studentID);
  const date = (value: string) => new Date(value).toLocaleString(locale, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const openPaper = (next: HomeworkPaperResponse) => {
    const current = new Date(); current.setMinutes(current.getMinutes() - current.getTimezoneOffset());
    setStartsAt(current.toISOString().slice(0, 16));
    current.setDate(current.getDate() + 7); setDeadline(current.toISOString().slice(0, 16)); setPaper(next);
  };
  return <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8" data-homework-teacher>
    <div className="mb-5 flex items-center justify-between gap-3"><h3 className="font-display text-2xl font-normal">{t("bank")}</h3><Button variant="ghost" onClick={model.refresh}><RefreshCw className="size-4" strokeWidth={1.6} />{t("refresh")}</Button></div>
    {model.error && <p role="alert" className="mb-4 text-sm text-destructive">{model.error}</p>}
    {model.loading ? <Spinner className="size-5" /> : <>
      <div className="divide-y divide-border border-y border-border">
        {model.papers.map((item, index) => <div key={item.id} className="flex flex-wrap items-center gap-4 py-4">
          <span className="font-mono text-sm text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
          <h4 className="flex-1 font-display text-xl font-normal">{item.title}</h4>
          <span className="text-sm">{t("paperMeta", { count: item.questions.length, total: item.total })}</span>
          <Button variant="outline" onClick={() => openPaper(item)}><BookOpen className="size-4" strokeWidth={1.6} />{t("selectPublish")}</Button>
        </div>)}
      </div>
      <h3 className="mb-4 mt-9 font-display text-2xl font-normal">{t("publishedList")}</h3>
      {model.items.length === 0 ? <p className="py-8 text-sm text-muted-foreground">{t("empty")}</p> : <div className="space-y-3">{model.items.map((item) => <article key={item.id} className="rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center gap-3"><h4 className="font-display text-xl font-normal">{item.title}</h4><Badge variant="outline">{t(`status.${item.status}`)}</Badge><span className="ml-auto text-sm">{t("submissionCount", { count: item.submissionCount })}</span></div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="space-y-1 text-sm"><p>{t("startsAt")}：{date(item.startsAt)}</p><p>{t("deadline")}：{date(item.deadline)}</p></div><Button variant="ghost" onClick={() => { setStudentID(""); model.selectReport(item.id); }}>{t("report")}<ArrowRight className="size-4" strokeWidth={1.6} /></Button></div>
      </article>)}</div>}
    </>}
    <Dialog open={!!paper} onOpenChange={(open) => { if (!open && !model.pending) setPaper(undefined); }}>
      <DialogContent aria-describedby={undefined} className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader><DialogTitle>{paper?.title} · {t("selectPublish")}</DialogTitle></DialogHeader>
        {paper && <form className="flex min-h-0 flex-col gap-5" onSubmit={(event) => { event.preventDefault(); void model.publish(paper.id, startsAt, deadline).then((ok) => { if (ok) setPaper(undefined); }); }}>
          <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm"><span>{t("startsAt")}</span><Input type="datetime-local" required value={startsAt} onChange={(event) => setStartsAt(event.target.value)} disabled={model.pending} /></label><label className="space-y-2 text-sm"><span>{t("deadline")}</span><Input type="datetime-local" required value={deadline} min={startsAt} onChange={(event) => setDeadline(event.target.value)} disabled={model.pending} /></label></div>
          <div className="min-h-0 overflow-y-auto border-y border-border py-4"><HomeworkQuestions questions={paper.questions} disabled showKey /></div>
          <div className="flex shrink-0 justify-end gap-2"><Button type="button" variant="ghost" disabled={model.pending} onClick={() => setPaper(undefined)}>{t("cancel")}</Button><Button type="submit" disabled={model.pending || !startsAt || !deadline}>{model.pending && <Spinner className="size-4" />}{t("publish")}</Button></div>
        </form>}
      </DialogContent>
    </Dialog>
    <Dialog open={!!model.reportID} onOpenChange={(open) => { if (!open) model.selectReport(""); }}>
      <DialogContent aria-describedby={undefined} className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader><DialogTitle>{report?.homework.title} · {t("report")}</DialogTitle></DialogHeader>
        <div className="min-h-0 overflow-y-auto">
          {model.reportLoading ? <Spinner className="size-5" /> : submission && report ? <>
            <Button className="mb-4" variant="ghost" onClick={() => setStudentID("")}><ArrowLeft className="size-4" />{t("back")}</Button>
            <div className="mb-6 flex flex-wrap justify-between gap-3 text-base"><span>{submission.studentName} · {submission.username}</span><span className="font-mono">{t("graded", { score: submission.score, total: report.homework.total })}</span></div>
            <HomeworkQuestions questions={report.homework.questions} answers={submission.answers} submission={submission} disabled showKey />
          </> : report ? <div className="divide-y divide-border">
            <p className="pb-4 text-sm">{t("reportCount", { submitted: report.submissions.length, total: report.students.length })}</p>
            {report.students.map((student) => { const sub = report.submissions.find((item) => item.studentId === student.id); return <div key={student.id} className="flex flex-wrap items-center gap-3 py-4"><div className="min-w-0 flex-1"><p className="font-display text-lg font-normal">{student.displayName || student.username}</p><p className="font-mono text-sm text-muted-foreground">{student.username}</p></div>{sub ? <><span className="font-mono text-base">{sub.score}/{report.homework.total}</span><Button variant="ghost" onClick={() => setStudentID(student.id)}>{t("viewAnswers")}<ArrowRight className="size-4" /></Button></> : <Badge variant="outline">{t("notSubmitted")}</Badge>}</div>; })}
          </div> : <p role="alert" className="text-sm text-destructive">{model.error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
