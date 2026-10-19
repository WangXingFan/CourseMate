"use client";

import { ArrowRight, CheckCircle2, Flame, RotateCcw, Timer, Trophy, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LessonPanel, LessonShell } from "@/features/learning/components/shared/lesson-shell";
import { ProgressStatus } from "@/features/learning/components/shared/progress-status";
import { useLearningProgress } from "@/features/learning/hooks/use-learning-progress";
import { createRandomSeed, createRng } from "@/features/learning/model/lab-random";
import {
  QUIZ_DURATION_SECONDS,
  QUIZ_SECONDS_PER_QUESTION,
} from "@/features/learning/model/quiz-bank";
import { cn } from "@/lib/utils";
import { useAuthSession } from "@/shared/auth/auth-session-context";

type Phase = "idle" | "playing" | "done";

type AnswerRecord = {
  id: string;
  selected: number;
  correct: boolean;
};

export function LearningQuiz() {
  return <React.Suspense><QuizEntry /></React.Suspense>;
}

function QuizEntry() {
  const { user } = useAuthSession();
  const params = useSearchParams();
  const practice = params.get("practice") === "mistakes";
  const questionID = params.get("question") ?? "";
  const topic = params.get("topic") ?? "";
  return <Quiz key={`${user?.publicID}:${practice}:${questionID}:${topic}`} practice={practice} questionID={questionID} topic={topic} />;
}

function Quiz({ practice, questionID, topic }: { practice: boolean; questionID: string; topic: string }) {
  const t = useTranslations("learningLabs.quiz");
  const p = useTranslations("learningLabs.progress");
  const model = useLearningProgress();
  const questions = model.data?.questions ?? [];
  const pool = questions.filter((item) => {
    if (questionID) return item.id === questionID;
    return (!topic || item.topic === topic) && (!practice || (item.latestWrong !== null && item.reviewStage < 5));
  });
  const targeted = practice || Boolean(questionID);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [order, setOrder] = React.useState<readonly string[]>([]);
  const [index, setIndex] = React.useState(0);
  const [selected, setSelected] = React.useState<number | null>(null);
  const [score, setScore] = React.useState(0);
  const [correctCount, setCorrectCount] = React.useState(0);
  const [streak, setStreak] = React.useState(0);
  const [bestStreak, setBestStreak] = React.useState(0);
  const [timeLeft, setTimeLeft] = React.useState(QUIZ_DURATION_SECONDS);
  const [answers, setAnswers] = React.useState<readonly AnswerRecord[]>([]);

  React.useEffect(() => {
    if (phase !== "playing" || targeted || model.pendingCount > 0) return;
    if (timeLeft <= 0) {
      setPhase("done");
      return;
    }
    const timer = window.setTimeout(() => setTimeLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [phase, timeLeft, targeted, model.pendingCount]);

  const currentId = order[index];
  const question = questions.find((item) => item.id === currentId);

  function start() {
    const rng = createRng(createRandomSeed());
    if (pool.length === 0 || model.pendingCount > 0) return;
    const nextOrder = pool.map((item) => item.id);
    for (let position = nextOrder.length - 1; position > 0; position -= 1) {
      const swap = Math.floor(rng() * (position + 1));
      [nextOrder[position], nextOrder[swap]] = [nextOrder[swap], nextOrder[position]];
    }
    setOrder(nextOrder);
    setIndex(0);
    setSelected(null);
    setScore(0);
    setCorrectCount(0);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(QUIZ_DURATION_SECONDS);
    setAnswers([]);
    setPhase("playing");
  }

  function answer(optionIndex: number) {
    if (phase !== "playing" || selected !== null || !question || model.pendingCount > 0) return;
    const correct = optionIndex === question.answer;
    model.record(question.id, optionIndex);
    setSelected(optionIndex);
    setAnswers((current) => [...current, { id: question.id, selected: optionIndex, correct }]);
    if (correct) {
      setCorrectCount((value) => value + 1);
      setScore((value) => value + 10 + Math.min(streak, 5) * 2);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setBestStreak((best) => Math.max(best, nextStreak));
    } else {
      setStreak(0);
    }
  }

  function next() {
    if (index + 1 >= order.length) {
      setPhase("done");
      return;
    }
    setIndex((value) => value + 1);
    setSelected(null);
  }

  return (
    <LessonShell title={targeted ? p("practiceTitle") : t("title")} subtitle={targeted ? p("practiceDescription") : t("subtitle")} formula={targeted ? undefined : t("formula")}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ProgressStatus model={model} />
        <Button asChild size="sm" variant="ghost"><Link href="/learn/progress">{p("title")}<ArrowRight className="size-3.5" /></Link></Button>
      </div>
      {phase === "idle" ? (
        <div className="space-y-3">
          <LessonPanel title={targeted ? p("practiceTitle") : t("intro.title")} description={targeted ? p("practiceDescription") : t("intro.description")}>
            <div className="grid grid-cols-3 gap-2">
              <Stat label={t("intro.questions")} value={String(pool.length)} />
              <Stat label={t("intro.duration")} value={targeted ? p("untimed") : `${QUIZ_DURATION_SECONDS}s`} />
              <Stat label={targeted ? p("topicLabel") : t("intro.perQuestion")} value={targeted ? String(new Set(pool.map((item) => item.topic)).size) : `~${QUIZ_SECONDS_PER_QUESTION}s`} />
            </div>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
              {targeted ? <li>{p("practiceRule")}</li> : <><li>{t("intro.ruleOne")}</li><li>{t("intro.ruleTwo")}</li><li>{t("intro.ruleThree")}</li></>}
            </ul>
            {model.data && !pool.length ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{p("noPracticeQuestions")}</p> : null}
            <Button type="button" size="sm" className="mt-4" disabled={model.loading || !pool.length || model.pendingCount > 0} onClick={start}>
              {t("intro.start")}
              <ArrowRight className="size-3.5" strokeWidth={1.8} />
            </Button>
          </LessonPanel>
        </div>
      ) : null}

      {phase === "playing" && question ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2">
            <Badge variant="secondary" className="gap-1 rounded-md font-mono text-[10px] font-normal tabular-nums">
              <Timer className="size-3" strokeWidth={1.8} />
              {targeted ? p("untimed") : formatTime(timeLeft)}
            </Badge>
            <Badge variant="outline" className="gap-1 rounded-md text-[10px] font-normal">
              {t("hud.progress", { current: index + 1, total: order.length })}
            </Badge>
            <Badge variant="outline" className="gap-1 rounded-md text-[10px] font-normal">
              <Trophy className="size-3" strokeWidth={1.8} />
              {score}
            </Badge>
            <Badge variant="outline" className="gap-1 rounded-md text-[10px] font-normal">
              <Flame className="size-3" strokeWidth={1.8} />
              x{streak}
            </Badge>
            {!targeted ? <div className="ml-auto h-1 w-24 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${(timeLeft / QUIZ_DURATION_SECONDS) * 100}%` }}
              />
            </div> : null}
          </div>

          <LessonPanel title={t("question.eyebrow")} description={t("question.description")}>
            <p className="text-sm font-medium leading-6 text-foreground">{t(`questions.${question.id}.prompt`)}</p>
            <div className="mt-3 grid gap-2">
              {[0, 1, 2, 3].map((optionIndex) => {
                const isSelected = selected === optionIndex;
                const isCorrect = selected !== null && optionIndex === question.answer;
                const isWrong = isSelected && optionIndex !== question.answer;
                return (
                  <button
                    key={`${question.id}-${optionIndex}`}
                    type="button"
                    disabled={selected !== null || model.pendingCount > 0}
                    onClick={() => answer(optionIndex)}
                    className={cn(
                      "flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs leading-5 transition-colors",
                      "disabled:cursor-default",
                      isCorrect
                        ? "border-emerald-500/50 bg-emerald-500/8 text-foreground"
                        : isWrong
                          ? "border-destructive/50 bg-destructive/5 text-foreground"
                          : "border-border/60 bg-muted/15 text-muted-foreground enabled:hover:border-border enabled:hover:bg-muted/30",
                    )}
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[9px]">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <span className="flex-1">{t(`questions.${question.id}.option${optionIndex + 1}`)}</span>
                    {isCorrect ? <CheckCircle2 className="size-3.5 text-emerald-600" strokeWidth={1.8} /> : null}
                    {isWrong ? <XCircle className="size-3.5 text-destructive" strokeWidth={1.8} /> : null}
                  </button>
                );
              })}
            </div>
            {selected !== null ? (
              <div className="mt-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <p className="text-[11px] leading-5 text-muted-foreground">{t(`questions.${question.id}.explain`)}</p>
                <Button type="button" size="sm" className="mt-2" disabled={model.pendingCount > 0} onClick={next}>
                  {index + 1 >= order.length ? t("question.finish") : t("question.next")}
                  <ArrowRight className="size-3.5" strokeWidth={1.8} />
                </Button>
              </div>
            ) : null}
          </LessonPanel>
        </div>
      ) : null}

      {phase === "done" ? (
        <div className="space-y-3">
          <LessonPanel title={t("result.title")} description={t("result.description")}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label={t("result.score")} value={String(score)} />
              <Stat label={t("result.correct")} value={`${correctCount}/${answers.length}`} />
              <Stat label={t("result.accuracy")} value={answers.length > 0 ? `${Math.round((correctCount / answers.length) * 100)}%` : "—"} />
              <Stat label={t("result.streak")} value={`x${bestStreak}`} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={!pool.length || model.pendingCount > 0} onClick={start}>
                <RotateCcw className="size-3.5" strokeWidth={1.8} />
                {t("result.restart")}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setPhase("idle")}>
                {t("result.back")}
              </Button>
            </div>
          </LessonPanel>

          <LessonPanel title={t("review.title")} description={t("review.description")}>
            {answers.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("review.empty")}</p>
            ) : (
              <ol className="space-y-2">
                {answers.map((record) => (
                  <li key={record.id} className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
                    <div className="flex items-start gap-2">
                      {record.correct ? (
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" strokeWidth={1.8} />
                      ) : (
                        <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" strokeWidth={1.8} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-5 text-foreground">{t(`questions.${record.id}.prompt`)}</p>
                        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                          {t("review.answer", {
                            answer: t(`questions.${record.id}.option${(questions.find((item) => item.id === record.id)?.answer ?? 0) + 1}`),
                          })}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </LessonPanel>
        </div>
      ) : null}
    </LessonShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-medium tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
