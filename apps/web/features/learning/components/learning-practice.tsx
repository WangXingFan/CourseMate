"use client";

import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { LessonShell, Readout } from "@/features/learning/components/shared/lesson-shell";
import { LearningHelp } from "@/features/learning/components/shared/learning-help";
import { useLearningMastery } from "@/features/learning/hooks/use-learning-mastery";
import { useLearningPractice } from "@/features/learning/hooks/use-learning-practice";
import { cn } from "@/lib/utils";
import { useAuthSession } from "@/shared/auth/auth-session-context";
import { QuestionContent } from "@/shared/components/question-content";

const selectClass = "h-9 max-w-full rounded-md border border-input bg-background px-3 text-sm";

export function LearningPractice() {
  return <Suspense><PracticeEntry /></Suspense>;
}

function PracticeEntry() {
  const params = useSearchParams();
  const { user } = useAuthSession();
  const locale = useLocale();
  const concept = params.get("concept") ?? "";
  return concept ? <PracticeBank key={`${user?.publicID}:${locale}:${concept}`} concept={concept} /> : <PracticeCatalog />;
}

function PracticeCatalog() {
  const t = useTranslations("learning.practiceBank");
  const m = useTranslations("learning.mastery");
  const topics = useTranslations("learningLabs.progress.topics");
  const model = useLearningMastery();
  const [filter, setFilter] = useState("weak");
  const [query, setQuery] = useState("");
  const concepts = (model.data?.concepts ?? []).filter((item) => (filter === "all" || item.status === "weak" || item.status === "developing") && (item.title || topics(item.topic)).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const order: Record<string, number> = { weak: 0, developing: 1, unassessed: 2, secure: 3 };
  concepts.sort((a, b) => order[a.status] - order[b.status]);
  return <LessonShell title={t("title")}>
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Button asChild variant="outline"><Link href="/learn/mastery">{m("title")}</Link></Button>
      <select aria-label={t("filter")} value={filter} onChange={(event) => setFilter(event.target.value)} className={selectClass}><option value="weak">{t("weak")}</option><option value="all">{t("allTopics")}</option></select>
      <Input aria-label={t("search")} placeholder={t("search")} value={query} onChange={(event) => setQuery(event.target.value)} className="w-full sm:ml-auto sm:w-60" />
    </div>
    {model.error ? <ErrorNotice error={model.error} retry={model.refresh} /> : !model.data ? <Loading /> : <>
      <p className="mb-4 font-mono text-sm">{t("topicCount", { count: concepts.length })}</p>
      <div className="divide-y divide-border border-y border-border">
        {concepts.map((item) => <Link key={item.id} href={item.practiceHref} className="group flex items-center justify-between gap-5 py-5 outline-none hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring" data-practice-concept={item.id}>
          <div className="min-w-0"><h2 className="font-display text-xl font-normal">{item.title || topics(item.topic)}</h2><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm"><span>{m(`kind.${item.kind}`)}</span><span className={item.status === "weak" ? "text-destructive" : "text-muted-foreground"}>{m(`status.${item.status}`)}</span></div></div>
          <ArrowRight className="size-5 shrink-0 text-muted-foreground group-hover:text-primary" strokeWidth={1.6} aria-hidden />
        </Link>)}
      </div>
      {!concepts.length && <div className="space-y-4 py-10"><p>{t("noTopics")}</p><Button variant="outline" onClick={() => { setFilter("all"); setQuery(""); }}>{t("allTopics")}</Button></div>}
    </>}
  </LessonShell>;
}

function PracticeBank({ concept }: { concept: string }) {
  const c = useTranslations("learning.continuity");
  const t = useTranslations("learning.practiceBank");
  const m = useTranslations("learning.mastery");
  const topics = useTranslations("learningLabs.progress.topics");
  const model = useLearningPractice(concept);
  const { data, question, result } = model;
  const title = data ? data.title || topics(data.topic) : t("title");
  const roundCorrect = model.results.filter((item) => item.score === item.total).length;
  const canSubmit = question && (question.options?.length ? model.answers.choice !== undefined : question.fields.every((field) => model.answers[field.id]?.trim()));
  return <LessonShell title={title}>
    <div className="mb-8 flex flex-wrap items-center gap-3">
      <Button asChild variant="ghost"><Link href="/learn/practice"><ArrowLeft className="size-4" aria-hidden />{t("title")}</Link></Button>
      <Button asChild variant="outline"><Link href="/learn/mastery">{m("title")}</Link></Button>
      {question && result && <LearningHelp title={title} context={`${question.prompt}\n${question.formula}\n${question.options?.join("\n") ?? ""}\n${JSON.stringify(model.answers)}\n${result.explanation}`} returnHref={`/learn/practice?concept=${encodeURIComponent(concept)}`} />}
      {result && <Button asChild variant="ghost"><Link href="/learn/progress?source=practice">{c("corrections")}</Link></Button>}
      {data && <Button asChild variant="ghost"><Link href={data.reviewHref}>{m("review")}</Link></Button>}
    </div>
    {model.loadError ? <ErrorNotice error={model.loadError} retry={model.reload} /> : model.loading ? <Loading /> : data && <>
      {!model.round.length ? <section aria-label={t("settings")} className="space-y-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4"><Readout label={t("questions")} value={data.questions.length} /><Readout label={t("answered")} value={model.answered} /><Readout label={t("correct")} value={model.correct} /><Readout label={t("mistakes")} value={model.answered-model.correct} /></div>
        <div className="flex flex-wrap items-end gap-5 border-t border-border pt-6">
          <div className="grid gap-2 text-sm"><label htmlFor="practice-mode">{t("mode")}</label><select id="practice-mode" value={model.mode} onChange={(event) => { const value = event.target.value; if (value === "all" || value === "unanswered" || value === "mistakes") model.setMode(value); }} className={selectClass}>{["all", "unanswered", "mistakes"].map((mode) => <option key={mode} value={mode}>{t(mode)}</option>)}</select></div>
          <div className="grid gap-2 text-sm"><label htmlFor="practice-round-size">{t("roundSize")}</label><select id="practice-round-size" value={model.size} onChange={(event) => model.setSize(event.target.value)} className={selectClass}><option value="10">{t("questionCount", { count: 10 })}</option>{data.questions.length >= 20 && <option value="20">{t("questionCount", { count: 20 })}</option>}<option value="all">{t("all")}</option></select></div>
          <Button disabled={!model.pool.length} onClick={() => model.start()}>{t("start")}<ArrowRight className="size-4" aria-hidden /></Button>
        </div>
        <p role="status" className="text-sm">{model.pool.length ? t("available", { count: model.pool.length }) : t("emptyMode")}</p>
      </section> : model.done ? <section aria-label={t("finished")} className="space-y-7">
        <h2 className="font-display text-2xl font-normal">{t("finished")}</h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3"><Readout label={t("answered")} value={model.results.length} /><Readout label={t("correct")} value={roundCorrect} /><Readout label={t("accuracy")} value={`${Math.round(100*roundCorrect/model.results.length)}%`} /></div>
        <div className="flex flex-wrap gap-3">
          {roundCorrect < model.results.length && <Button onClick={() => model.start(true)}><RotateCcw className="size-4" aria-hidden />{t("retryMistakes")}</Button>}
          <Button variant="outline" onClick={model.back}>{t("continue")}</Button>
          <Button asChild variant="outline"><Link href="/learn/mastery">{t("viewMastery")}</Link></Button>
        </div>
        <ol className="divide-y divide-border border-y border-border">{model.round.map((q, index) => {
          const saved = model.results[index];
          const correct = saved.score === saved.total;
          return <li key={q.id} className="py-5"><div className="mb-2 flex items-center gap-2 text-sm">{correct ? <Check className="size-4" aria-hidden /> : <X className="size-4 text-destructive" aria-hidden />}<span>{t(correct ? "answerCorrect" : "answerIncorrect")}</span></div><QuestionContent content={q.prompt} /><details className="mt-3 text-sm"><summary className="cursor-pointer">{t("explanation")}</summary><QuestionContent className="mt-3 leading-7" content={saved.explanation} /></details></li>;
        })}</ol>
      </section> : question && <section aria-label={t("answering")} data-practice-question={question.id}>
        <div className="mb-6 flex items-center justify-between border-b border-border pb-4 text-sm"><span className="font-mono">{t("position", { current: model.index+1, total: model.round.length })}</span><span>{t("untimed")}</span></div>
        <QuestionContent className="font-display text-xl leading-8" content={question.prompt} />
        <form className="mt-6 space-y-5" onSubmit={(event) => { event.preventDefault(); void model.submit(); }}>
          {question.options?.length ? <fieldset disabled={model.locked} className="grid gap-3"><legend className="sr-only">{t("choose")}</legend>{question.options.map((option, index) => <label key={`${question.id}:${index}`} className={cn("flex min-h-12 cursor-pointer items-start gap-3 rounded-md border p-4 text-sm", model.answers.choice === String(index) ? "border-primary bg-accent shadow-[inset_2px_0_0_var(--primary)]" : "border-border")}>
            <input type="radio" name="practice-answer" value={index} checked={model.answers.choice === String(index)} onChange={() => model.setAnswers({ choice: String(index) })} className="mt-1 size-4 shrink-0 accent-primary" />
            <span className="font-mono">{String.fromCharCode(65+index)}</span><QuestionContent className="min-w-0 flex-1 leading-6" content={option} />
          </label>)}</fieldset> : <div className="grid gap-4 sm:grid-cols-2">{question.fields.map((field) => <label key={field.id} className="grid gap-2 text-sm"><span>{field.label}{field.unit && ` (${field.unit})`}</span><Input disabled={model.locked} value={model.answers[field.id] ?? ""} maxLength={64} required onChange={(event) => model.setAnswers((previous) => ({ ...previous, [field.id]: event.target.value }))} /></label>)}</div>}
          {model.saveError && <p role="alert" className="text-sm text-destructive">{model.saveError}</p>}
          {!result && <Button type="submit" disabled={!canSubmit || model.saving}>{model.saving && <Spinner />}{t(model.saving ? "saving" : model.saveError ? "retrySave" : "submit")}</Button>}
        </form>
        {result && <div role="status" className="mt-7 space-y-4 border-l-2 border-primary pl-5">
          <p className="font-medium">{t(result.score === result.total ? "answerCorrect" : "answerIncorrect")}</p>
          {result.results.map((field) => <div key={field.id} className="text-sm"><span>{t("expected")} </span><QuestionContent content={field.expected} /></div>)}
          <QuestionContent className="text-base leading-7" content={result.explanation} />
          <Button onClick={model.next}>{t(model.index+1 === model.round.length ? "finish" : "next")}<ArrowRight className="size-4" aria-hidden /></Button>
        </div>}
      </section>}
    </>}
  </LessonShell>;
}

function Loading() {
  const t = useTranslations("learning.practiceBank");
  return <div role="status" className="flex items-center gap-2 py-10 text-sm"><Spinner />{t("loading")}</div>;
}

function ErrorNotice({ error, retry }: { error: string; retry: () => void }) {
  const t = useTranslations("learning.mastery");
  return <div role="alert" className="space-y-4 py-6"><p className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={retry}>{t("retry")}</Button></div>;
}
