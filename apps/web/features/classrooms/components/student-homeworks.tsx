"use client";

import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { HomeworkQuestions } from "@/features/classrooms/components/shared/homework-questions";
import { useClassroomStudentHomeworks } from "@/features/classrooms/hooks/use-classroom-student-homeworks";
import { useAuthSession } from "@/shared/auth/auth-session-context";

export function StudentHomeworksEntry() {
  const { accessToken, user, userStatus } = useAuthSession();
  const t = useTranslations("classrooms.homework");
  if (userStatus === "loading") return <div className="m-auto"><Spinner className="size-5" /></div>;
  if (user?.role !== "student") return <main className="m-auto"><Button asChild variant="outline"><Link href="/classrooms">{t("teacherLink")}<ArrowRight className="size-4" /></Link></Button></main>;
  return <StudentHomeworks key={user.publicID} accessToken={accessToken} />;
}

function StudentHomeworks({ accessToken }: { accessToken: string }) {
  const t = useTranslations("classrooms.homework");
  const locale = useLocale();
  const model = useClassroomStudentHomeworks(accessToken);
  const [selectedID, setSelectedID] = useState("");
  const [confirming, setConfirming] = useState(false);
  const selected = model.data?.items.find((item) => item.id === selectedID);
  const canAnswer = !!selected && !selected.submission && model.now >= new Date(selected.startsAt).getTime() && model.now < new Date(selected.deadline).getTime() && selected.questions.length > 0;
  const date = (value: string) => new Date(value).toLocaleString(locale, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const answered = selected ? (model.answers[selected.id] ?? []).filter((row) => row.length && row.every((value) => value.trim())).length : 0;
  return <main className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-background" data-homework-student>
    <header className="shrink-0 border-b border-border px-5 py-6 pb-8 md:px-8"><div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-3"><h1 className="font-display text-3xl font-normal tracking-[-0.015em] md:text-4xl">{t("studentTitle")}</h1>{model.data && <Badge variant="outline">{model.data.classroom.name}</Badge>}</div><Button variant="ghost" onClick={model.refresh}><RefreshCw className="size-4" strokeWidth={1.6} />{t("refresh")}</Button></div></header>
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8"><div className="mx-auto max-w-4xl">
      {model.error && <p role="alert" className="mb-4 text-sm text-destructive">{model.error}</p>}
      {model.loading ? <Spinner className="size-5" /> : selected ? <>
        <Button variant="ghost" className="mb-6" onClick={() => setSelectedID("")}><ArrowLeft className="size-4" />{t("back")}</Button>
        <div className="mb-6 border-b border-border pb-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl font-normal">{selected.title}</h2>{selected.submission ? <span role="status" className="border-l-2 border-primary pl-3 font-mono text-lg">{t("graded", { score: selected.submission.score, total: selected.total })}</span> : <span className="text-sm">{t("progress", { count: answered, total: selected.questionCount })}</span>}</div><p className="mt-4 text-sm">{t("deadline")}：{date(selected.deadline)}</p>{selected.submission && <p className="mt-2 text-sm">{t("submittedAt")}：{date(selected.submission.submittedAt)}</p>}</div>
        <HomeworkQuestions questions={selected.questions} answers={model.answers[selected.id]} submission={selected.submission} disabled={!canAnswer || !!model.pending} onAnswer={(question, blank, value) => model.setAnswer(selected.id, question, blank, value)} />
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-6"><p className="text-sm text-muted-foreground">{t(selected.submission ? "locked" : canAnswer ? "submitOnce" : "closed")}</p>{canAnswer && <Button disabled={!!model.pending || answered !== selected.questionCount} onClick={() => setConfirming(true)}>{t("submit")}</Button>}</div>
      </> : model.data?.items.length ? <div className="divide-y divide-border border-y border-border">{model.data.items.map((item) => {
        const state = model.now < new Date(item.startsAt).getTime() ? "scheduled" : model.now >= new Date(item.deadline).getTime() ? "closed" : "open";
        return <article key={item.id} className="py-6"><div className="flex flex-wrap items-center gap-3"><h2 className="font-display text-2xl font-normal">{item.title}</h2><Badge variant="outline">{t(item.submission ? "submitted" : `status.${state}`)}</Badge>{item.submission && <span className="ml-auto font-mono text-lg">{item.submission.score}/{item.total}</span>}</div><div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div className="space-y-2 text-sm"><p>{t("startsAt")}：{date(item.startsAt)}</p><p>{t("deadline")}：{date(item.deadline)}</p><p>{t("paperMeta", { count: item.questionCount, total: item.total })}</p></div><Button variant={item.submission ? "outline" : "default"} disabled={state === "scheduled" || !item.questions.length} onClick={() => setSelectedID(item.id)}>{t(item.submission ? "viewResult" : state === "closed" ? "viewPaper" : "answer")}<ArrowRight className="size-4" /></Button></div></article>;
      })}</div> : !model.error && <p className="py-16 text-center text-muted-foreground">{t("empty")}</p>}
    </div></div>
    <Dialog open={confirming} onOpenChange={(open) => { if (!model.pending) setConfirming(open); }}><DialogContent><DialogHeader><DialogTitle>{t("confirmTitle")}</DialogTitle><DialogDescription>{t("submitOnce")}</DialogDescription></DialogHeader><DialogFooter><Button variant="ghost" disabled={!!model.pending} onClick={() => setConfirming(false)}>{t("cancel")}</Button><Button disabled={!!model.pending || !canAnswer} onClick={() => { if (selected) void model.submit(selected).then((ok) => { if (ok) setConfirming(false); }); }}>{model.pending && <Spinner className="size-4" />}{t("submit")}</Button></DialogFooter></DialogContent></Dialog>
  </main>;
}
