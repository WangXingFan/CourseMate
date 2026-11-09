"use client";

import { CorrectionList } from "@/features/learning/components/sections/correction-list";
import { QuestionContent } from "@/shared/components/question-content";

import { ArrowRight, BookOpen, CheckCircle2, History, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LessonPanel, LessonShell, Readout } from "@/features/learning/components/shared/lesson-shell";
import { ProgressStatus } from "@/features/learning/components/shared/progress-status";
import { VariantReview } from "@/features/learning/components/quiz/variant-review";
import { useLearningProgress } from "@/features/learning/hooks/use-learning-progress";
import { useLearningTimeZone } from "@/features/learning/hooks/use-learning-time-zone";
import type { LearningQuestionDTO } from "@/shared/api/learning-types";

export function LearningProgress() {
  const masteryT = useTranslations("learning.mastery");
  const continuityT = useTranslations("learning.continuity");
  const t = useTranslations("learningLabs.progress");
  const q = useTranslations("learningLabs.quiz.questions");
  const format = useFormatter();
  const timeZone = useLearningTimeZone();
  const model = useLearningProgress();
  const [tab, setTab] = React.useState<"mistakes" | "history">("mistakes");
  const [topic, setTopic] = React.useState("all");
  const [reviewFilter, setReviewFilter] = React.useState("all");
  const [reviewTarget, setReviewTarget] = React.useState<string | null>(null);
  const questions = model.data?.questions ?? [];
  const totals = questions.reduce((sum, item) => ({ attempts: sum.attempts + item.attempts, correct: sum.correct + item.correctCount }), { attempts: 0, correct: 0 });
  const mistakes = questions.filter((item) => item.latestWrong !== null);
  const unresolved = mistakes.filter((item) => item.reviewStage < 5);
  const visible = mistakes.filter((item) => (topic === "all" || item.topic === topic) && (reviewFilter === "all" || (reviewFilter === "due" && item.reviewDue) || (reviewFilter === "active" && item.reviewStage < 5) || (reviewFilter === "done" && item.reviewStage === 5)));
  const topics = [...new Set(questions.map((item) => item.topic))];
  const recent = (model.data?.recent ?? []).filter((item) => topic === "all" || questions.find((question) => question.id === item.questionId)?.topic === topic);
  const practiceHref = `/learn/quiz?practice=mistakes${topic === "all" ? "" : `&topic=${encodeURIComponent(topic)}`}`;

  return (
    <LessonShell title={t("title")}>
      <CorrectionList />
      <div className="space-y-4">
        <h2 className="mt-8 font-display text-2xl font-normal">{continuityT("quickReview")}</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ProgressStatus model={model} />
          <Button asChild size="sm" variant="outline"><Link href="/learn/mastery">{masteryT("title")}</Link></Button>
          <Button asChild size="sm" variant="outline"><Link href="/learn/quiz">{t("newQuiz")}<ArrowRight className="size-3.5" /></Link></Button>
        </div>
        {model.data ? <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Readout label={t("totalAnswers")} value={totals.attempts} />
            <Readout label={t("accuracy")} value={totals.attempts ? `${Math.round(totals.correct / totals.attempts * 100)}%` : "—"} />
            <Readout label={t("unresolved")} value={unresolved.length} />
            <Readout label={t("corrected")} value={mistakes.length - unresolved.length} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <div role="group" aria-label={t("viewLabel")} className="flex gap-1">
              <Button size="sm" variant={tab === "mistakes" ? "secondary" : "ghost"} aria-pressed={tab === "mistakes"} onClick={() => setTab("mistakes")}><BookOpen className="size-3.5" />{t("mistakes")}</Button>
              <Button size="sm" variant={tab === "history" ? "secondary" : "ghost"} aria-pressed={tab === "history"} onClick={() => setTab("history")}><History className="size-3.5" />{t("history")}</Button>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="progress-topic" className="text-sm text-muted-foreground">{t("topicLabel")}</label>
              <select id="progress-topic" value={topic} onChange={(event) => setTopic(event.target.value)} className="h-9 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="all">{t("allTopics")}</option>
                {topics.map((item) => <option key={item} value={item}>{t(`topics.${item}`)}</option>)}
              </select>
            </div>
          </div>
          {tab === "mistakes" ? <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label htmlFor="review-filter" className="flex items-center gap-2 text-sm text-muted-foreground">{t("reviewFilter")}<select id="review-filter" value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5">{["all", "due", "active", "done"].map((filter) => <option key={filter} value={filter}>{t(`filters.${filter}`)}</option>)}</select></label>
              {unresolved.some((item) => topic === "all" || item.topic === topic) ? <Button asChild size="sm"><Link href={practiceHref}><RotateCcw className="size-3.5" />{t("practiceMistakes")}</Link></Button> : null}
            </div>
            {visible.length ? <div className="space-y-3">{visible.map((question) => <MistakeCard key={question.id} question={question} onReview={setReviewTarget} />)}</div> : <EmptyState title={t(mistakes.length ? "noPending" : "emptyTitle")} />}
          </> : <LessonPanel title={t("history")}>
            {recent.length ? <ol className="divide-y divide-border/50">{recent.map((attempt) => <li key={attempt.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              {attempt.correct ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />}
              <div className="min-w-0 flex-1">
                <div className="space-y-2 text-sm leading-6"><Badge variant="outline" className="text-xs">{t(attempt.mode === "review" ? "reviewMode" : "quizMode")}</Badge><QuestionContent content={attempt.mode === "review" ? t("reviewBaseQuestion", { question: q(`${attempt.questionId}.prompt`) }) : q(`${attempt.questionId}.prompt`)} /></div>
                {attempt.mode === "review" ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("variantHistory", { variant: attempt.variantId, choice: String.fromCharCode(65 + attempt.selected) })}</p> : <QuestionContent className="mt-1 text-sm leading-6 text-muted-foreground" content={t("yourAnswer", { answer: q(`${attempt.questionId}.option${attempt.selected + 1}`) })} />}
                <time dateTime={attempt.createdAt} className="mt-1 block text-xs text-muted-foreground">{format.dateTime(new Date(attempt.createdAt), { timeZone, year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
              </div>
              {attempt.mode === "review" ? <Button size="xs" variant="ghost" onClick={() => setReviewTarget(attempt.variantId)}>{t("variantReview")}</Button> : <Button asChild size="xs" variant="ghost"><Link href={`/learn/quiz?question=${encodeURIComponent(attempt.questionId)}`}>{t("retryQuestion")}</Link></Button>}
            </li>)}</ol> : <p className="text-sm text-muted-foreground">{t("historyEmpty")}</p>}
          </LessonPanel>}
        </> : null}
      </div>
      {reviewTarget ? <VariantReview key={reviewTarget} variantId={reviewTarget} onSaved={model.refresh} onClose={() => setReviewTarget(null)} /> : null}
    </LessonShell>
  );
}

function MistakeCard({ question, onReview }: { question: LearningQuestionDTO; onReview: (variantId: string) => void }) {
  const t = useTranslations("learningLabs.progress");
  const q = useTranslations("learningLabs.quiz.questions");
  const format = useFormatter();
  const timeZone = useLearningTimeZone();
  return (
    <article className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm">
      <div className={`border-l-2 p-4 ${question.reviewStage === 5 ? "border-l-primary" : "border-l-primary"}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="secondary" className="rounded-md text-xs font-normal">{t(`topics.${question.topic}`)}</Badge>
          <span className="text-xs text-muted-foreground">{t("mistakeCount", { count: question.attempts - question.correctCount })} · {t(question.reviewStage === 5 ? "reviewCompleted" : "needsPractice")}</span>
        </div>
        <div role="heading" aria-level={2} className="mt-3 font-display text-xl font-normal leading-7"><QuestionContent content={q(`${question.id}.prompt`)} /></div>
        {question.misconception ? <div className="mt-3 space-y-2 rounded-lg bg-accent/5 p-3 text-xs leading-6">
          <p className="font-medium">{t("diagnosis")}</p>
          <QuestionContent content={t(`diagnoses.${question.misconception}.thought`)} />
          <QuestionContent className="text-muted-foreground" content={t(`diagnoses.${question.misconception}.correction`)} />
          <QuestionContent className="text-muted-foreground" content={q(`${question.id}.explain`)} />
        </div> : null}
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant={question.reviewDue ? "default" : "secondary"}>{t("reviewStage", { stage: question.reviewStage })}</Badge>
          <span>{question.reviewStage === 5 ? t("reviewCompleted") : question.reviewDue ? t("dueNow") : question.nextReviewAt ? t("nextReview", { date: format.dateTime(new Date(question.nextReviewAt), { timeZone, month: "short", day: "numeric" }) }) : "—"}</span>
        </div>
        <details className="mt-3 text-sm">
          <summary className="w-fit cursor-pointer text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{t("showExplanation")}</summary>
          <div className="mt-2 space-y-1 rounded-lg bg-muted/30 p-3 leading-5">
            {question.latestWrong ? <QuestionContent className="text-muted-foreground" content={t("lastMistake", { answer: q(`${question.id}.option${question.latestWrong.selected + 1}`) })} /> : null}
            {question.latest?.mode === "review" ? <p className="text-muted-foreground">{t(question.latest.correct ? "lastReviewCorrect" : "lastReviewIncorrect")}</p> : null}
            <QuestionContent content={t("correctAnswer", { answer: q(`${question.id}.option${question.answer + 1}`) })} />
            <QuestionContent className="text-muted-foreground" content={q(`${question.id}.explain`)} />
          </div>
        </details>
        <div className="mt-3 flex flex-wrap gap-2">
          {question.suggestedVariantId ? <Button size="xs" onClick={() => onReview(question.suggestedVariantId)}>{t("variantReview")}</Button> : null}
          <Button asChild size="xs" variant="outline"><Link href={`/learn/quiz?question=${encodeURIComponent(question.id)}`}><RotateCcw className="size-4" />{t("retryQuestion")}</Link></Button>
          <Button asChild size="xs" variant="ghost"><Link href={question.lesson}><BookOpen className="size-4" />{t("reviewLesson")}<ArrowRight className="size-4" /></Link></Button>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ title }: { title: string }) {
  return <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center"><BookOpen className="mx-auto size-7 text-muted-foreground" strokeWidth={1.6} /><h2 className="mt-3 text-sm font-medium">{title}</h2></div>;
}
