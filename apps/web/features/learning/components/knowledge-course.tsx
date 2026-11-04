"use client";

import { ArrowLeft, ArrowRight, BookOpen, Check, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLearningCourse, useLearningCourseLesson, useLearningLessonAnswer } from "@/features/learning/hooks/use-learning-course";
import type { LearningCourseLessonData, LearningCourseQuestionDTO, LearningLessonAnswerData } from "@/shared/api/learning-types";
import { StreamdownRender } from "@/shared/components/markdown/streamdown-render";
import { MathFormula } from "./shared/math-formula";

export function KnowledgeCourse() {
  const t = useTranslations("learning.knowledge");
  const params = useSearchParams();
  const catalog = useLearningCourse();
  const [search, setSearch] = React.useState("");
  const [chapter, setChapter] = React.useState("");
  const practiceLessons = catalog.data?.lessons ?? [];
  const selected = params.get("lesson")?.trim() || practiceLessons[0]?.id || "";
  const detail = useLearningCourseLesson(selected);
  const chapters = [...new Set(practiceLessons.map((lesson) => lesson.chapter))];
  const filtered = practiceLessons.filter((lesson) => (!chapter || lesson.chapter === chapter) && `${lesson.number} ${lesson.title} ${lesson.chapter}`.toLowerCase().includes(search.toLowerCase()));
  const index = practiceLessons.findIndex((lesson) => lesson.id === selected);
  const previous = practiceLessons[index - 1];
  const next = practiceLessons[index + 1];
  const completed = practiceLessons.reduce((sum, lesson) => sum + lesson.completedStages, 0);
  const mastered = practiceLessons.reduce((sum, lesson) => sum + lesson.masteredStages, 0);

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-background [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto w-full max-w-5xl px-5 pt-6 pb-16 md:px-10 md:pt-10">
        <Link href="/learn" prefetch={false} className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"><ArrowLeft className="size-4" strokeWidth={1.6} aria-hidden />{t("back")}</Link>
        <header className="mt-6 mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-8">
          <h1 className="font-display text-3xl leading-[1.12] font-normal tracking-[-0.015em] text-foreground md:text-4xl">{t("title")}</h1>
          {catalog.data?.canPractice && <div className="border-l-2 border-border py-1 pl-3 text-sm text-muted-foreground">
            <p><span className="mr-2 font-mono text-lg font-medium tabular-nums text-foreground">{completed}</span>/ {t("total", { count: practiceLessons.length * 3 })}</p>
            <p className="mt-1 text-xs">{t("mastered", { count: mastered })}</p>
          </div>}
        </header>

        {catalog.error && <ErrorNotice error={catalog.error} reload={catalog.reload} />}
        <div className="grid items-start gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="min-w-0 lg:sticky lg:top-4">
            <label htmlFor="knowledge-search" className="mb-2 flex items-center gap-2 text-sm font-medium"><Search className="size-4" strokeWidth={1.6} aria-hidden />{t("catalog")}</label>
            <Input id="knowledge-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("search")} />
            <label htmlFor="knowledge-chapter" className="sr-only">{t("chapter")}</label>
            <select id="knowledge-chapter" value={chapter} onChange={(event) => setChapter(event.target.value)} className="mt-2 h-9 w-full rounded-md border border-input/70 bg-background px-2 text-sm">
              <option value="">{t("chooseChapter")}</option>
              {chapters.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <nav aria-label={t("catalog")} className="mt-4 max-h-60 overflow-y-auto border-t border-border lg:max-h-[65vh]">
              {filtered.map((lesson) => <Link key={lesson.id} href={`/learn/knowledge?lesson=${lesson.id}`} prefetch={false} aria-current={selected === lesson.id ? "page" : undefined} className={`flex items-center gap-2 border-b border-border px-2 py-2.5 text-sm leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 ${selected === lesson.id ? "bg-accent text-foreground shadow-[inset_2px_0_0_var(--primary)]" : "text-muted-foreground hover:text-foreground"}`}>
                <span className="w-8 shrink-0 font-mono text-xs tabular-nums">{lesson.number}</span><span className="flex-1">{lesson.title}</span>
                {catalog.data?.canPractice && <span className="shrink-0 font-mono text-xs tabular-nums"><span aria-hidden="true">{lesson.completedStages}/3</span><span className="sr-only">{t("stageProgress", { completed: lesson.completedStages })}</span></span>}
              </Link>)}
              {catalog.data && filtered.length === 0 && <p className="py-4 text-sm text-muted-foreground">{t("empty")}</p>}
            </nav>
          </aside>

          <main className="min-w-0">
            {/* With an empty catalog there is no lesson to load; the sidebar already shows the empty state. */}
            {catalog.data && !selected ? null : detail.error ? <ErrorNotice error={detail.error} reload={detail.reload} /> : !detail.data ? <p role="status" className="py-12 text-sm text-muted-foreground">{t("loading")}</p> : <LessonContent key={`${detail.ownerKey}|${detail.data.version}`} data={detail.data} onSaved={catalog.reload} />}
            {detail.data && <nav aria-label={t("lessonNavigation")} className="mt-8 flex flex-wrap justify-between gap-3 border-t border-border pt-5">
              {previous ? <Link href={`/learn/knowledge?lesson=${previous.id}`} prefetch={false} className="flex max-w-full items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4 shrink-0" strokeWidth={1.6} aria-hidden /><span className="font-mono text-xs">{previous.number}</span>{previous.title}</Link> : <span />}
              {next && <Link href={`/learn/knowledge?lesson=${next.id}`} prefetch={false} className="flex max-w-full items-center gap-2 text-sm text-muted-foreground hover:text-primary"><span className="font-mono text-xs">{next.number}</span>{next.title}<ArrowRight className="size-4 shrink-0" strokeWidth={1.6} aria-hidden /></Link>}
            </nav>}
          </main>
        </div>
      </div>
    </div>
  );
}

function LessonContent({ data, onSaved }: { data: LearningCourseLessonData; onSaved: () => void }) {
  const t = useTranslations("learning.knowledge");
  const [reading, setReading] = React.useState(true);
  const question = (stage: string) => data.questions.find((item) => item.stage === stage);
  function card(stage: string, number: string) {
    if (!data.canPractice) return null;
    const item = question(stage);
    return item ? <StageQuestion key={item.id} question={item} number={number} lessonId={data.lesson.id} version={data.version} initial={data.attempts.find((attempt) => attempt.questionId === item.id)} onSaved={onSaved} /> : null;
  }
  return <>
    <p className="text-xs text-muted-foreground">{data.lesson.chapter}</p>
    <h2 className="mt-2 mb-6 font-display text-2xl font-normal text-foreground"><span className="mr-3 font-mono text-lg text-muted-foreground">{data.lesson.number}</span>{data.lesson.title}</h2>
    <div className="space-y-5">
      {!data.canPractice && <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-accent p-4 shadow-[inset_2px_0_0_var(--primary)] md:p-5"><h3 className="text-sm font-medium">{t("assignedTitle")}</h3><Button asChild size="sm" variant="outline"><Link href="/activities" prefetch={false}>{t("goToActivities")}<ArrowRight className="size-4" strokeWidth={1.6} aria-hidden /></Link></Button></section>}
      {card("preview", "01")}
      <section className="min-w-0 rounded-lg border border-border bg-card p-5 md:p-6">
        <button type="button" aria-expanded={reading} aria-controls="lesson-reading" onClick={() => setReading((value) => !value)} className="flex w-full items-center justify-between gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"><span className="flex items-center gap-2 font-display text-xl text-foreground"><BookOpen className="size-4 text-primary" strokeWidth={1.6} aria-hidden />{t("notes")}</span><span className="text-sm text-muted-foreground">{reading ? t("collapse") : t("expand")}</span></button>
        {reading && <div id="lesson-reading" lang="zh-CN" className="mt-5 min-w-0 overflow-x-auto text-sm leading-7"><StreamdownRender content={data.markdown} /></div>}
      </section>
      {card("in_class", "02")}
      {card("after_class", "03")}
    </div>
  </>;
}

function StageQuestion({ question, number, lessonId, version, initial, onSaved }: { question: LearningCourseQuestionDTO; number: string; lessonId: string; version: string; initial?: LearningLessonAnswerData; onSaved: () => void }) {
  const t = useTranslations("learning.knowledge");
  const answer = useLearningLessonAnswer(lessonId, question.id, version, initial, onSaved);
  const isChoice = question.options.length > 0;
  const ready = isChoice ? answer.answers.choice !== undefined : question.fields.every((field) => isNumericInput(answer.answers[field.id] ?? ""));
  return <section aria-label={t(`stages.${question.stage}`)} className="min-w-0 rounded-lg border border-border bg-card p-5 md:p-6">
    <header className="mb-4 flex items-baseline gap-3"><span className="font-mono text-sm text-muted-foreground tabular-nums">{number}</span><h3 className="font-display text-xl font-normal text-foreground">{t(`stages.${question.stage}`)}</h3>{answer.result && <Check className="ml-auto size-4 self-center text-primary" strokeWidth={1.6} aria-label={t("correct")} />}</header>
    <div lang="zh-CN" className="text-base leading-7"><StreamdownRender content={question.prompt} /></div>
    {question.formula && <div className="mt-4 min-w-0 overflow-x-auto border-l-2 border-seal py-1 pl-4"><MathFormula display>{question.formula}</MathFormula></div>}
    {isChoice ? <fieldset disabled={answer.locked || !!answer.result} className="mt-5 space-y-2"><legend className="sr-only">{t("choose")}</legend>{question.options.map((option, index) => <label key={`${question.id}-${index}`} className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 text-sm transition-colors ${answer.answers.choice === String(index) ? "border-primary bg-accent" : "border-border hover:border-foreground/25"}`}><input type="radio" name={question.id} value={index} aria-label={`${String.fromCharCode(65 + index)}. ${option}`} checked={answer.answers.choice === String(index)} onChange={() => answer.setAnswers({ choice: String(index) })} className="mt-1 accent-primary" /><span className="font-mono text-sm text-muted-foreground">{String.fromCharCode(65 + index)}</span><span className="min-w-0" lang="zh-CN"><StreamdownRender content={option} /></span></label>)}</fieldset> : <>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("inputHelp")}</p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">{question.fields.map((field) => {
        const inputId = `${question.id}-${field.id}`;
        const feedback = answer.result?.results.find((item) => item.id === field.id);
        return <div key={field.id}><label htmlFor={inputId} className="mb-1.5 block text-sm">{field.label}{field.unit && <span className="ml-1 font-mono text-muted-foreground">({field.unit})</span>}</label><Input id={inputId} type="text" autoComplete="off" spellCheck={false} maxLength={64} value={answer.answers[field.id] ?? ""} disabled={answer.locked || !!answer.result} onChange={(event) => answer.setAnswers((value) => ({ ...value, [field.id]: event.target.value }))} aria-invalid={!!feedback && !feedback.correct} aria-describedby={feedback ? `${inputId}-feedback` : undefined} />
          {isNumericInput(answer.answers[field.id] ?? "") && <p className="mt-1.5 text-sm text-muted-foreground">{t("preview")}<MathFormula>{numericLatex(answer.answers[field.id])}</MathFormula></p>}
          {feedback && <p id={`${inputId}-feedback`} className={`mt-1.5 text-sm ${feedback.correct ? "text-primary" : "text-destructive"}`}>{feedback.correct ? t("correct") : t("expected", { value: feedback.expected })}</p>}
        </div>;
      })}</div>
    </>}
    {answer.error && <p role="alert" className="mt-3 text-sm text-destructive">{answer.error}</p>}
    {answer.result ? <div aria-live="polite" className="mt-5 border-t border-border pt-4"><p className="text-base font-medium tabular-nums text-foreground">{t("score",{ score: answer.result.score, total: answer.result.total })}</p>{isChoice && <div className="mt-2 text-sm"><StreamdownRender content={`${t("answer")} ${answer.result.results[0]?.expected ?? ""}`} /></div>}<div lang="zh-CN" className="mt-2 text-sm leading-7"><StreamdownRender content={answer.result.explanation} /></div><Button type="button" variant="outline" size="sm" onClick={answer.retryQuestion} className="mt-3">{t("practiceAgain")}</Button></div> : <div className="mt-5 flex flex-wrap items-center gap-3"><Button type="button" size="sm" onClick={() => void answer.submit()} disabled={answer.saving || !ready}>{answer.saving ? t("saving") : answer.locked ? t("retrySubmission") : t("submit")}</Button>{answer.locked && <p role="status" className="text-sm text-muted-foreground">{t("retryHelp")}</p>}</div>}
  </section>;
}

// Same deliberately limited grammar as the server: numbers, or one fraction.
function isNumericInput(input: string) {
  const parts = input.trim().replaceAll("−", "-").split("/");
  if (!input.trim() || input.length > 64 || parts.length > 2) return false;
  const pattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
  if (!parts.every((part) => pattern.test(part.trim()) && Number.isFinite(Number(part)) && Math.abs(Number(part)) <= 1e12)) return false;
  return parts.length === 1 || (Number(parts[1]) !== 0 && Number.isFinite(Number(parts[0]) / Number(parts[1])) && Math.abs(Number(parts[0]) / Number(parts[1])) <= 1e12);
}

function numericLatex(input: string) {
  const parts = input.trim().replaceAll("−", "-").split("/").map((part) => part.trim().replace(/[eE]([+-]?\d+)$/, "\\times10^{$1}"));
  return parts.length === 2 ? `\\frac{${parts[0]}}{${parts[1]}}` : parts[0];
}

function ErrorNotice({ error, reload }: { error: string; reload: () => void }) {
  const t = useTranslations("learning.knowledge");
  return <div role="alert" className="mb-4 rounded-lg border border-destructive/25 p-4 text-sm"><p className="text-destructive">{error}</p><Button type="button" size="sm" variant="outline" className="mt-3" onClick={reload}>{t("reload")}</Button></div>;
}
