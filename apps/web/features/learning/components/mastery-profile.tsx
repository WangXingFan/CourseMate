"use client";

import { QuestionContent } from "@/shared/components/question-content";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LearningMasteryData, MasteryConcept } from "@/shared/api/learning-mastery";

const statuses = ["weak", "developing", "secure", "unassessed"] as const;
const statusOrder: Record<string, number> = { weak: 0, developing: 1, secure: 2, unassessed: 3 };
const selectClass = "h-10 max-w-full rounded-md border border-input bg-background px-3 text-sm";

export function MasteryProfile({ profile, readOnly = false }: { profile: LearningMasteryData; readOnly?: boolean }) {
  const t = useTranslations("learning.mastery");
  const topics = useTranslations("learningLabs.progress.topics");
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("all");
  const [chapter, setChapter] = useState("all");
  const chapters = [...new Set(profile.concepts.filter((item) => kind === "all" || item.kind === kind).map((item) => item.chapter))];
  const concepts = profile.concepts.filter((item) => (status === "all" || item.status === status) && (kind === "all" || item.kind === kind) && (chapter === "all" || item.chapter === chapter));
  concepts.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  const counts = { ...profile.counts, unassessed: profile.counts.total - profile.counts.assessed };
  return <div className="space-y-8" data-mastery-profile>
    <dl className="grid grid-cols-2 gap-y-6 border-b border-border pb-8 sm:grid-cols-4">
      {statuses.map((key) => <div key={key} className="border-l-2 border-border pl-4"><dt className="text-sm">{t(`status.${key}`)}</dt><dd className="mt-2 font-display text-3xl tabular-nums">{counts[key]}</dd></div>)}
    </dl>
    {profile.counts.assessed === 0 && <div className="space-y-4 border-l-2 border-primary py-2 pl-4" data-mastery-empty><p className="text-base leading-7">{t("empty")}</p>{!readOnly && <Button asChild variant="outline"><Link href="/learn/quiz">{t("start")}</Link></Button>}</div>}
    <details className="border-b border-border pb-4 text-sm leading-7"><summary className="cursor-pointer font-medium">{t("method")}</summary><p className="mt-3 max-w-3xl">{t("methodBody")}</p></details>
    <section aria-label={t("concepts")}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-normal">{t("concepts")}</h2>
        <div className="flex flex-wrap gap-2">
          <select aria-label={t("filterStatus")} value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}><option value="all">{t("allStatuses")}</option>{statuses.map((key) => <option key={key} value={key}>{t(`status.${key}`)}</option>)}</select>
          <select aria-label={t("filterKind")} value={kind} onChange={(e) => { setKind(e.target.value); setChapter("all"); }} className={selectClass}><option value="all">{t("allKinds")}</option>{["course", "practice"].map((key) => <option key={key} value={key}>{t(`kind.${key}`)}</option>)}</select>
          <select aria-label={t("filterChapter")} value={chapter} onChange={(e) => setChapter(e.target.value)} className={selectClass}><option value="all">{t("allChapters")}</option>{chapters.map((key) => <option key={key} value={key}>{key}</option>)}</select>
        </div>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {concepts.map((item) => <ConceptRow key={item.id} item={item} title={item.title || topics(item.topic)} readOnly={readOnly} />)}
      </div>
      {!concepts.length && <p className="py-6 text-sm">{t("noMatches")}</p>}
    </section>
    <section aria-label={t("weeks")}>
      <h2 className="mb-5 font-display text-2xl font-normal">{t("weeks")}</h2>
      <div className="space-y-3">{profile.weeks.map((week) => <div key={week.start} className="grid grid-cols-[5rem_minmax(0,1fr)_6rem] items-center gap-3 text-sm"><time dateTime={week.start} className="font-mono">{week.start.slice(5)}</time><div className="h-2 bg-muted" aria-hidden><div className="h-full bg-primary" style={{ width: `${week.answers ? 100 * week.correct / week.answers : 0}%` }} /></div><span className="text-right font-mono tabular-nums">{week.answers ? `${Math.round(100 * week.correct / week.answers)}%` : "—"} · {week.answers}</span></div>)}</div>
      <p className="mt-4 text-sm leading-7">{t("weekLegend")}</p>
    </section>
  </div>;
}

function ConceptRow({ item, title, readOnly }: { item: MasteryConcept; title: string; readOnly: boolean }) {
  const t = useTranslations("learning.mastery");
  const questions = useTranslations("learningLabs.quiz.questions");
  const locale = useLocale();
  return <article className="py-5" data-mastery-concept={item.id}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 flex-1"><h3 className="font-display text-xl font-normal leading-7">{title}</h3><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm"><span className={cn("font-medium", item.status === "weak" ? "text-destructive" : "text-foreground")}>{t(`status.${item.status}`)}</span><span className="text-muted-foreground">{item.questions ? t("sample", { correct: item.correct, total: item.questions }) : t("noEvidence")}</span></div></div>
      {!readOnly && <div className="flex flex-wrap gap-2">
        <Button asChild variant="ghost" size="sm"><Link href={item.reviewHref}>{t("review")}</Link></Button>
        <Button asChild variant="outline" size="sm"><Link href={item.practiceHref}>{t("practice")}</Link></Button>
        {item.experimentHref && <Button asChild variant="ghost" size="sm"><Link href={item.experimentHref}>{t("experiment")}</Link></Button>}
      </div>}
    </div>
    {!!item.evidence.length && <details className="mt-4 text-sm leading-7"><summary className="w-fit cursor-pointer">{t("evidence")}</summary><ol className="mt-3 space-y-3 border-l border-border pl-4">{item.evidence.map((e) => {
      const questionID = e.questionId.replace(/^practice:/, "");
      const prompt = e.prompt || (questions.has(`${questionID}.prompt`) ? questions(`${questionID}.prompt`) : t("reviewItem", { id: questionID }));
      return <li key={e.questionId}><QuestionContent content={prompt} /><div className="flex flex-wrap gap-x-4 text-sm"><span>{t(e.correct ? "correct" : "incorrect")}</span><span>{t(`source.${e.source}`)}</span><time dateTime={e.at}>{new Date(e.at).toLocaleDateString(locale)}</time></div></li>;
    })}</ol></details>}
  </article>;
}
