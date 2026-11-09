"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuestionContent } from "@/shared/components/question-content";
import { useClassroomStudentPractice } from "@/features/classrooms/hooks/use-classroom-assigned-practice";

export function StudentAssignedPractice({ accessToken, owner }: { accessToken: string; owner: string }) {
  const t = useTranslations("classrooms.practice");
  const drafts = useTranslations("classrooms.drafts");
  const locale = useLocale();
  const model = useClassroomStudentPractice(accessToken, owner);
  useEffect(() => { if (model.data) document.getElementById(window.location.hash.slice(1))?.scrollIntoView(); }, [model.data]);
  if (!model.error && !model.data?.items.length) return null;
  return <section aria-label={t("title")} className="mb-8 space-y-5 border-b border-border pb-8">
    <div className="flex items-center justify-between gap-3"><h2 className="font-display text-2xl font-normal">{t("title")}</h2><Button variant="ghost" onClick={model.refresh}>{t("refresh")}</Button></div>
    {model.error && <p role="alert" className="text-sm text-destructive">{model.error}</p>}
    {model.data?.items.map((item) => {
      const values = model.answers[item.id] ?? {};
      const complete = item.questions.every((q) => q.options.length ? values[q.id]?.choice !== undefined : q.fields.every((f) => values[q.id]?.[f.id]?.trim()));
      const locked = !!item.submission || !item.open || !!model.pending;
      return <details id={`practice-${item.id}`} key={item.id} className="rounded-lg border border-border p-5" open={!!item.open && !item.submission}>
        <summary className="cursor-pointer space-y-3"><span className="font-display text-xl">{item.title}</span><div className="flex flex-wrap gap-4 text-sm"><span>{item.submission ? t("score", { correct: item.submission.correct, total: item.questions.length }) : t(item.open ? "open" : "closed")}</span><span>{t("deadline")} · {new Date(item.deadline).toLocaleString(locale)}</span></div></summary>
        <form className="mt-6 space-y-7" onSubmit={(event) => { event.preventDefault(); void model.submit(item.id); }}>
          {item.questions.map((q, index) => {
            const result = item.submission?.results.find((r) => r.questionId === q.id);
            const answers = result?.answers ?? values[q.id] ?? {};
            return <fieldset key={q.id} disabled={locked} className="space-y-4 border-t border-border pt-5"><legend className="mb-3 flex gap-3 text-base"><span className="font-mono">{index + 1}.</span><QuestionContent content={q.prompt} /></legend>
              {q.options.length ? <div className="grid gap-3">{q.options.map((option, i) => <label key={option} className="flex min-h-11 items-start gap-3 rounded-md border border-border p-3 text-sm"><input type="radio" name={`${item.id}:${q.id}`} className="mt-1 size-4 shrink-0 accent-primary" checked={answers.choice === String(i)} onChange={() => model.answer(item.id, q.id, "choice", String(i))} /><span className="font-mono">{String.fromCharCode(65+i)}</span><QuestionContent content={option} /></label>)}</div> : <div className="grid gap-4 sm:grid-cols-2">{q.fields.map((field) => <label key={field.id} className="grid gap-2 text-sm"><span>{field.label}{field.unit && ` (${field.unit})`}</span><Input required maxLength={64} value={answers[field.id] ?? ""} onChange={(e) => model.answer(item.id, q.id, field.id, e.target.value)} /></label>)}</div>}
              {result && <div className="space-y-3 border-l-2 border-primary pl-4 text-sm"><p>{t(result.correct ? "correct" : "incorrect")}</p>{result.expected.map((expected, i) => <QuestionContent key={`${q.id}:${i}`} content={`${t("expected")} ${expected}`} />)}<QuestionContent content={result.explanation} /></div>}
            </fieldset>;
          })}
          {!item.submission && item.open && <div className="flex flex-wrap items-center justify-between gap-4"><div className="space-y-2 text-sm"><p>{t("submitEffect")}</p>{model.draftStatus && <p role="status">{drafts(model.draftStatus)}</p>}</div><Button type="submit" disabled={!complete || !!model.pending}>{t(model.pending === item.id ? "submitting" : "submit")}</Button></div>}
          {model.saveError?.id === item.id && <p role="alert" className="text-sm text-destructive">{model.saveError.message}</p>}
        </form>
      </details>;
    })}
  </section>;
}
