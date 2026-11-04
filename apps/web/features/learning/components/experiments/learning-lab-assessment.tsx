"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { LessonShell } from "@/features/learning/components/shared/lesson-shell";
import { LabAssessmentForm, LabAssessmentResult } from "@/features/learning/components/experiments/lab-assessment-paper";
import { useLearningLabAssessment } from "@/features/learning/hooks/use-learning-lab-assessment";
import { useAuthSession } from "@/shared/auth/auth-session-context";

const LabAssessmentWorkbench = dynamic(() => import("./lab-assessment-workbench").then((module) => module.LabAssessmentWorkbench), { ssr: false, loading: () => <Spinner /> });

export function LearningLabAssessment() {
  const { accessToken, user } = useAuthSession();
  const t = useTranslations("learning.assessment");
  if (user?.role === "teacher") return <LessonShell title={t("title")}><p className="mb-5 text-sm">{t("teacherNotice")}</p><Button asChild><Link href="/classrooms">{t("classrooms")}</Link></Button></LessonShell>;
  return <AssessmentWorkspace key={user?.id} accessToken={accessToken} accountID={user?.id ?? 0} />;
}
function AssessmentWorkspace({ accessToken, accountID }: { accessToken: string; accountID: number }) {
  const t = useTranslations("learning.assessment");
  const [taskID, setTaskID] = useState("L1-1");
  const [explain, setExplain] = useState(false);
  useEffect(() => {
    const sync = () => { const id = window.location.hash.slice(1); if (/^L[123]-[1-4]$/.test(id)) setTaskID(id); };
    sync(); window.addEventListener("hashchange", sync); return () => window.removeEventListener("hashchange", sync);
  }, []);
  const course = taskID.slice(0, 2);
  const model = useLearningLabAssessment(accessToken, course);
  const task = model.data?.tasks.find((item) => item.id === taskID);
  const active = !!model.data?.assignment.active;
  const latest = task?.attempts.at(-1);
  const unfinished = latest && !latest.submittedAt;
  return <LessonShell title={t("title")}>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <nav className="flex flex-wrap gap-2" aria-label={t("course")}>{["L1", "L2", "L3"].map((id) => <Button asChild key={id} variant={course === id ? "default" : "outline"}><a href={`#${id}-1`}>{t(id)}</a></Button>)}</nav>
      <Button variant="ghost" onClick={model.refresh} disabled={model.pending}>{t("refresh")}</Button>
    </div>
    <p className="mb-6 text-sm leading-7 text-muted-foreground">{t("rules")}</p>
    {model.error && <p role="alert" className="mb-5 text-sm text-destructive">{model.error}</p>}
    {model.loading ? <Spinner /> : !model.data ? <p className="text-sm">{t("unpublished")}</p> : <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-y border-border py-5">
        <p className="text-sm">{t("courseScore")} <span className="ml-3 font-display text-3xl">{model.data.total}<span className="text-lg text-muted-foreground"> /100</span></span></p>
        <div className="space-y-1 text-sm text-muted-foreground"><p>{t(active ? "open" : "closed")}</p><p>{t("startsAt")} {new Date(model.data.assignment.startsAt).toLocaleString()}</p><p>{t("deadline")} {model.data.assignment.deadline ? new Date(model.data.assignment.deadline).toLocaleString() : t("noDeadline")}</p></div>
      </div>
      <nav className="mb-7 grid gap-2 sm:grid-cols-2" aria-label={t("task")}>{model.data.tasks.map((item) => <a key={item.id} href={`#${item.id}`} aria-current={taskID === item.id ? "page" : undefined} className={`flex items-center justify-between gap-3 border-b border-border px-3 py-4 text-sm ${taskID === item.id ? "bg-accent shadow-[inset_2px_0_0_var(--primary)]" : "hover:bg-accent/50"}`}><span>{item.id} · {item.title}</span><span className="shrink-0 font-mono">{item.total}/25</span></a>)}</nav>
      {task && <section key={`${model.data.assignment.id}:${taskID}`} className="space-y-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl font-normal">{task.title}</h2><span className="text-sm text-muted-foreground">{t(`status.${task.status}`)}</span></div>
        <dl className="grid grid-cols-3 gap-3">{[["operations", task.operations, 5], ["independent", task.independent, 15], ["concepts", task.concepts, 5]].map(([key, value, max]) => <div key={key} className="border-l-2 border-border pl-3"><dt className="text-sm text-muted-foreground">{t(String(key))}</dt><dd className="mt-2 font-mono text-lg">{value}/{max}</dd></div>)}</dl>
        <div className="space-y-3"><h3 className="font-display text-xl font-normal">{t("operationTitle")}</h3><p className="text-sm leading-7 text-muted-foreground">{t("operationHint")}</p>
          {active && <LabAssessmentWorkbench taskID={taskID} />}
          {task.checkpoints.map((point) => <details key={point.id} className="rounded-lg border border-border p-4 sm:p-5"><summary className="cursor-pointer text-sm">{point.id} · {t("points", { value: point.maximum })} · {t(point.passed ? "passed" : "notPassed")}</summary><div className="mt-5 space-y-5">
            <LabAssessmentForm key={`${point.id}:${point.passed}`} paper={point.paper} initial={point.answers} draftKey={`lab:${accountID}:${model.data?.assignment.id}:${taskID}:${point.id}`} checkpoint pending={model.pending} disabled={!active || point.passed} onSubmit={(answers) => model.checkpoint(taskID, point.id, answers)} />
            {point.result && <LabAssessmentResult paper={point.paper} result={point.result} conditionsOnly />}
          </div></details>)}
        </div>
        <section className="space-y-5 border-t border-border pt-6"><h3 className="font-display text-xl font-normal">{t("formalTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("attemptRule", { count: task.remaining })}</p>
          {unfinished ? <div key={latest.id} className="space-y-5"><p className="font-mono text-sm">{t("attempt", { count: task.attempts.length })}</p><LabAssessmentForm paper={latest.paper} initial={latest.answers} draftKey={`lab:${accountID}:${model.data.assignment.id}:${latest.id}`} pending={model.pending} disabled={!active || task.explained} onSubmit={(answers, requestID, blank) => model.submit(taskID, latest.id, answers, requestID, blank)} /></div> : <div className="flex flex-wrap gap-3">
            <Button disabled={!active || model.pending || task.remaining === 0} onClick={() => void model.start(taskID)}>{t(latest ? "retry" : "start")}</Button>
            {latest && !task.explained && <Button variant="outline" disabled={model.pending} onClick={() => setExplain(true)}>{t("explain")}</Button>}
          </div>}
          {task.explained && <p className="text-sm text-muted-foreground">{t("explanationOpen")}</p>}
          {task.attempts.filter((a) => a.result).map((a, index) => <details key={a.id} open={a.id === latest?.id} className="rounded-lg border border-border p-4 sm:p-5"><summary className="cursor-pointer text-sm">{t("attempt", { count: index + 1 })} · {a.result?.score}/20</summary>{a.result && <LabAssessmentResult paper={a.paper} result={a.result} />}</details>)}
        </section>
        {task.corrections.map((item) => <p key={item.at} className="border-l-2 border-seal pl-4 text-sm leading-7">{t("correction", { score: item.score, reason: item.reason })}</p>)}
      </section>}
    </>}
    <AlertDialog open={explain} onOpenChange={setExplain}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("explainTitle")}</AlertDialogTitle><AlertDialogDescription>{t("explainDescription")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("back")}</AlertDialogCancel><AlertDialogAction onClick={() => { setExplain(false); void model.explain(taskID); }}>{t("confirmExplain")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </LessonShell>;
}
