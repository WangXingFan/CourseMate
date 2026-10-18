"use client";

import { ArrowRight, BookOpen, CheckCircle2, History, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LessonPanel, LessonShell, Readout } from "@/features/learning/components/shared/lesson-shell";
import { ProgressStatus } from "@/features/learning/components/shared/progress-status";
import { useLearningProgress } from "@/features/learning/hooks/use-learning-progress";
import type { LearningQuestionDTO } from "@/shared/api/learning-types";

export function LearningProgress() {
  const t = useTranslations("learningLabs.progress");
  const q = useTranslations("learningLabs.quiz.questions");
  const format = useFormatter();
  const model = useLearningProgress();
  const [tab, setTab] = React.useState<"mistakes" | "history">("mistakes");
  const [topic, setTopic] = React.useState("all");
  const [includeCorrected, setIncludeCorrected] = React.useState(false);
  const questions = model.data?.questions ?? [];
  const totals = questions.reduce((sum, item) => ({ attempts: sum.attempts + item.attempts, correct: sum.correct + item.correctCount }), { attempts: 0, correct: 0 });
  const mistakes = questions.filter((item) => item.attempts > item.correctCount);
  const unresolved = mistakes.filter((item) => item.latest && !item.latest.correct);
  const visible = mistakes.filter((item) => (topic === "all" || item.topic === topic) && (includeCorrected || !item.latest?.correct));
  const topics = [...new Set(questions.map((item) => item.topic))];
  const recent = (model.data?.recent ?? []).filter((item) => topic === "all" || questions.find((question) => question.id === item.questionId)?.topic === topic);
  const practiceHref = `/learn/quiz?practice=mistakes${topic === "all" ? "" : `&topic=${encodeURIComponent(topic)}`}`;

  return (
    <LessonShell title={t("title")} subtitle={t("description")}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ProgressStatus model={model} />
          <Button asChild size="sm" variant="outline"><Link href="/learn/quiz">{t("newQuiz")}<ArrowRight className="size-3.5" /></Link></Button>
        </div>
        {model.data ? <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Readout label={t("totalAnswers")} value={totals.attempts} />
            <Readout label={t("accuracy")} value={totals.attempts ? `${Math.round(totals.correct / totals.attempts * 100)}%` : "—"} />
            <Readout label={t("unresolved")} value={unresolved.length} />
            <Readout label={t("corrected")} value={mistakes.length - unresolved.length} />
          </div>
          <p className="text-[11px] leading-5 text-muted-foreground">{t("scope")}</p>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div role="group" aria-label={t("viewLabel")} className="flex gap-1">
              <Button size="sm" variant={tab === "mistakes" ? "secondary" : "ghost"} aria-pressed={tab === "mistakes"} onClick={() => setTab("mistakes")}><BookOpen className="size-3.5" />{t("mistakes")}</Button>
              <Button size="sm" variant={tab === "history" ? "secondary" : "ghost"} aria-pressed={tab === "history"} onClick={() => setTab("history")}><History className="size-3.5" />{t("history")}</Button>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="progress-topic" className="text-[11px] text-muted-foreground">{t("topicLabel")}</label>
              <select id="progress-topic" value={topic} onChange={(event) => setTopic(event.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="all">{t("allTopics")}</option>
                {topics.map((item) => <option key={item} value={item}>{t(`topics.${item}`)}</option>)}
              </select>
            </div>
          </div>
          {tab === "mistakes" ? <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={includeCorrected} onChange={(event) => setIncludeCorrected(event.target.checked)} className="accent-primary" />{t("includeCorrected")}</label>
              {unresolved.some((item) => topic === "all" || item.topic === topic) ? <Button asChild size="sm"><Link href={practiceHref}><RotateCcw className="size-3.5" />{t("practiceMistakes")}</Link></Button> : null}
            </div>
            {visible.length ? <div className="space-y-3">{visible.map((question) => <MistakeCard key={question.id} question={question} />)}</div> : <EmptyState title={t(mistakes.length ? "noPending" : "emptyTitle")} description={t(mistakes.length ? "noPendingHint" : "emptyHint")} />}
          </> : <LessonPanel title={t("history")} description={t("historyHint")}>
            {recent.length ? <ol className="divide-y divide-border/50">{recent.map((attempt) => <li key={attempt.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              {attempt.correct ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />}
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-5">{q(`${attempt.questionId}.prompt`)}</p>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{t("yourAnswer", { answer: q(`${attempt.questionId}.option${attempt.selected + 1}`) })}</p>
                <time dateTime={attempt.createdAt} className="mt-1 block text-[10px] text-muted-foreground">{format.dateTime(new Date(attempt.createdAt), { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
              </div>
              <Button asChild size="xs" variant="ghost"><Link href={`/learn/quiz?question=${encodeURIComponent(attempt.questionId)}`}>{t("retryQuestion")}</Link></Button>
            </li>)}</ol> : <p className="text-xs text-muted-foreground">{t("historyEmpty")}</p>}
          </LessonPanel>}
        </> : null}
      </div>
    </LessonShell>
  );
}

function MistakeCard({ question }: { question: LearningQuestionDTO }) {
  const t = useTranslations("learningLabs.progress");
  const q = useTranslations("learningLabs.quiz.questions");
  return (
    <article className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
      <div className={`border-l-2 p-4 ${question.latest?.correct ? "border-l-emerald-500" : "border-l-amber-500"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="secondary" className="rounded-md text-[10px] font-normal">{t(`topics.${question.topic}`)}</Badge>
          <span className="text-[10px] text-muted-foreground">{t("mistakeCount", { count: question.attempts - question.correctCount })} · {t(question.latest?.correct ? "latestCorrect" : "needsPractice")}</span>
        </div>
        <h2 className="mt-3 text-sm font-medium leading-6">{q(`${question.id}.prompt`)}</h2>
        <details className="mt-3 text-xs">
          <summary className="w-fit cursor-pointer text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("showExplanation")}</summary>
          <div className="mt-2 space-y-1 rounded-lg bg-muted/30 p-3 leading-5">
            {question.latest ? <p className="text-muted-foreground">{t("yourAnswer", { answer: q(`${question.id}.option${question.latest.selected + 1}`) })}</p> : null}
            <p>{t("correctAnswer", { answer: q(`${question.id}.option${question.answer + 1}`) })}</p>
            <p className="text-muted-foreground">{q(`${question.id}.explain`)}</p>
          </div>
        </details>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="xs" variant="outline"><Link href={`/learn/quiz?question=${encodeURIComponent(question.id)}`}><RotateCcw className="size-3" />{t("retryQuestion")}</Link></Button>
          <Button asChild size="xs" variant="ghost"><Link href={question.lesson}><BookOpen className="size-3" />{t("reviewLesson")}<ArrowRight className="size-3" /></Link></Button>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center"><BookOpen className="mx-auto size-7 text-muted-foreground" strokeWidth={1.4} /><h2 className="mt-3 text-sm font-medium">{title}</h2><p className="mx-auto mt-2 max-w-sm text-xs leading-6 text-muted-foreground">{description}</p></div>;
}
