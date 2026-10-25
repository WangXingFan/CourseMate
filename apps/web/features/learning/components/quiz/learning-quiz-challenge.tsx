"use client";

import { ArrowRight, CheckCircle2, ClipboardList, RefreshCw, Timer, ClipboardCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LessonPanel, LessonShell } from "@/features/learning/components/shared/lesson-shell";
import { useLearningQuiz } from "@/features/learning/hooks/use-learning-quiz";

export function LearningQuizChallenge() {
  const t = useTranslations("learningLabs.quiz");
  const [chapter, setChapter] = useState("1");
  const [generation, setGeneration] = useState(0);
  return <LessonShell title={t("title")}>
    <QuizChapter key={`${chapter}:${generation}`} chapter={chapter} onChapterChange={setChapter} onReset={() => setGeneration((v) => v + 1)} />
  </LessonShell>;
}

function QuizChapter({ chapter, onChapterChange, onReset }: { chapter: string; onChapterChange: (chapter: string) => void; onReset: () => void }) {
  const t = useTranslations("learningLabs.quiz");
  const model = useLearningQuiz(chapter);
  const [index, setIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [started, setStarted] = useState(false);
  const round = model.round;
  const expired = !!round?.finishedAt && round.answers.length < round.questionIds.length;
  const done = !!round && (showResult || expired);
  const playing = !!round && !done;
  const currentID = round?.questionIds[index];
  const answer = round?.answers.find((a) => a.questionId === currentID);
  const chapterInfo = model.chapters.find((c) => c.id === chapter);
  async function start() {
    setStarted(true); setShowResult(false); setIndex(0);
    await model.start();
  }
  return <div className="space-y-5" data-quiz-chapter={chapter}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="min-w-0 space-y-2 text-sm font-medium" htmlFor="quiz-chapter">{t("chooseChapter")}
        <select id="quiz-chapter" value={chapter} disabled={(started && !done) || model.busy} onChange={(e) => { setStarted(false); onChapterChange(e.target.value); }} className="block h-10 w-full max-w-full rounded-lg border border-input bg-background px-3 text-sm sm:w-80">
          {model.chapters.map((c) => <option key={c.id} value={c.id}>{t(`chapters.${c.id}`)}</option>)}
        </select>
      </label>
      <Button asChild size="sm" variant="ghost"><Link href="/learn/progress">{t("progressLink")}<ArrowRight className="size-3.5" /></Link></Button>
    </div>
    {model.catalogError && <div role="alert" className="text-sm text-destructive"><p>{model.catalogError}</p><Button variant="outline" size="sm" className="mt-2" onClick={model.refreshRanking}>{t("refresh")}</Button></div>}
    {model.error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"><p>{model.error}</p><p className="mt-1 text-sm text-muted-foreground">{t("retryHint")}</p><Button className="mt-3" variant="outline" size="sm" disabled={model.busy} onClick={model.retry}>{model.busy ? t("saving") : t("retry")}</Button></div>}
    {!round && <LessonPanel title={t("intro.title")}>
      <div className="grid grid-cols-2 gap-3"><Metric label={t("intro.questions")} value={String(chapterInfo?.roundSize ?? Math.min(10, chapterInfo?.questionIds.length ?? 0))} /><Metric label={t("intro.duration")} value="90s" /></div>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground"><li>{t("intro.ruleOne")}</li><li>{t("intro.ruleThree")}</li></ul>
      <Button className="mt-5" disabled={model.loading || model.busy || !!model.error || !chapterInfo} onClick={() => void start()}>{model.busy ? t("starting") : t("intro.start")}<ArrowRight className="size-4" /></Button>
    </LessonPanel>}
    {playing && currentID && <>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3">
        <Badge variant="secondary" className="gap-1.5 font-mono tabular-nums"><Timer className="size-3.5" />{Math.floor(model.timeLeft / 60)}:{String(model.timeLeft % 60).padStart(2, "0")}</Badge>
        <span className="text-xs text-muted-foreground">{t("hud.progress", { current: index + 1, total: round.questionIds.length })}</span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-sm"><ClipboardCheck className="size-4 text-primary" />{round.score}</span>
      </div>
      <LessonPanel title={t("question.eyebrow")}>
        <p className="font-display text-xl font-normal leading-8">{t(`questions.${currentID}.prompt`)}</p>
        <div className="mt-4 grid gap-2">{[0, 1, 2, 3].map((selected) => <button key={selected} type="button" disabled={!!answer || model.busy || !!model.error || model.timeLeft === 0} onClick={() => void model.answer(currentID, selected)} className={`flex min-h-12 items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default ${answer?.selected === selected ? answer.correct ? "border-primary/50 bg-accent/10" : "border-destructive/50 bg-destructive/5" : "border-border/60 enabled:hover:border-primary/40 enabled:hover:bg-primary/5"}`}><span className="font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + selected)}</span><span className="flex-1">{t(`questions.${currentID}.option${selected + 1}`)}</span>{answer?.selected === selected && (answer.correct ? <CheckCircle2 className="size-4 text-primary" /> : <XCircle className="size-4 text-destructive" />)}</button>)}</div>
        {model.busy && <p role="status" className="mt-3 text-sm text-muted-foreground">{t("saving")}</p>}
        {answer && <div className="mt-4 rounded-lg bg-muted/40 p-4"><p className="text-sm leading-6 text-muted-foreground">{t(`questions.${currentID}.explain`)}</p><Button className="mt-3" size="sm" onClick={() => { if (round.finishedAt) setShowResult(true); else setIndex((i) => i + 1); }}>{round.finishedAt ? t("question.finish") : t("question.next")}<ArrowRight className="size-3.5" /></Button></div>}
      </LessonPanel>
    </>}
    {done && <LessonPanel title={t("result.title")}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label={t("result.score")} value={String(round.score)} /><Metric label={t("result.correct")} value={`${round.correctCount}/${round.questionIds.length}`} /><Metric label={t("elapsed")} value={elapsed(round.elapsedMs)} /><Metric label={t("result.streak")} value={`×${round.bestStreak}`} /></div>
      <p className="mt-4 text-sm text-muted-foreground">{t("resultRankingHint")}</p>
      <Button className="mt-4" variant="outline" onClick={onReset}>{t("result.back")}</Button>
    </LessonPanel>}
    {!playing && <section aria-label={t("leaderboard")} className="overflow-hidden rounded-lg border border-border/60 bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4"><div><h2 className="flex items-center gap-2 font-display text-xl font-normal"><ClipboardList className="size-4 text-primary" />{t("leaderboard")}</h2><p className="mt-1.5 text-sm text-muted-foreground">{t("rankingRule")}</p></div><Button variant="ghost" size="sm" disabled={model.rankingLoading} onClick={model.refreshRanking}><RefreshCw className="size-3.5" />{t("refresh")}</Button></header>
      {model.rankingError ? <p role="alert" className="p-5 text-sm text-destructive">{model.rankingError}</p> : model.rankingLoading ? <p role="status" className="p-5 text-sm text-muted-foreground">{t("rankingLoading")}</p> : !model.rankings.length ? <p className="p-6 text-center text-sm text-muted-foreground">{t("rankingEmpty")}</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border/50 text-xs text-muted-foreground"><tr><th className="px-5 py-3">{t("rank")}</th><th className="px-3 py-3">{t("student")}</th><th className="px-3 py-3 text-right">{t("result.score")}</th><th className="px-5 py-3 text-right">{t("elapsed")}</th></tr></thead><tbody>{model.rankings.map((row) => <tr key={row.rank} className={`border-b border-border/40 last:border-0 ${row.isCurrentUser ? "bg-accent shadow-[inset_2px_0_0_var(--primary)]" : ""}`}><td className="px-5 py-3 font-mono text-muted-foreground">{String(row.rank).padStart(2, "0")}</td><td className="max-w-48 break-words px-3 py-3 font-medium">{row.name}{row.isCurrentUser && <Badge className="ml-2" variant="secondary">{t("you")}</Badge>}</td><td className="px-3 py-3 text-right font-mono font-semibold tabular-nums">{row.score}</td><td className="px-5 py-3 text-right font-mono tabular-nums text-muted-foreground">{elapsed(row.elapsedMs)}</td></tr>)}</tbody></table></div>}
    </section>}
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="border-l-2 border-border px-4 py-2"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 font-mono text-lg font-medium tabular-nums">{value}</p></div>; }
function elapsed(ms: number) { return `${(ms / 1000).toFixed(2)}s`; }
