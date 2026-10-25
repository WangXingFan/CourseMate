"use client";

import { ArrowRight, CheckCircle2, ClipboardList, LockKeyhole, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CenteredEmptyState } from "@/components/ui/empty-state";
import { Spinner, SpinnerLabel } from "@/components/ui/spinner";
import { useClassroomStudentActivities } from "@/features/classrooms/hooks/use-classroom-student-activities";
import { cn } from "@/lib/utils";
import { useAuthSession } from "@/shared/auth/auth-session-context";
import type { StudentClassroomQuizDTO } from "@/shared/api/classroom-types";
import { StreamdownRender } from "@/shared/components/markdown/streamdown-render";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export function StudentActivitiesEntry() {
  const t = useTranslations("classrooms.activities.student");
  const { accessToken, user, userStatus } = useAuthSession();

  if (userStatus === "loading") {
    return (
      <main className="flex h-full min-h-0 w-full flex-1 items-center justify-center text-muted-foreground">
        <SpinnerLabel>{t("loading")}</SpinnerLabel>
      </main>
    );
  }

  if (user?.role !== "student") {
    return (
      <main className="flex h-full min-h-0 w-full flex-1 items-center justify-center bg-background px-6">
        <div className="text-center">
          <p className="font-medium text-foreground">{t("teacherHintTitle")}</p>
          <p className="mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">{t("teacherHint")}</p>
          <div className="mt-4">
            <Button asChild size="sm" variant="outline">
              <Link href="/classrooms">
                {t("goToClassrooms")}
                <ArrowRight className="size-3.5" strokeWidth={1.8} />
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return <StudentActivities key={user.publicID} accessToken={accessToken} />;
}

function StudentActivities({ accessToken }: { accessToken: string }) {
  const t = useTranslations("classrooms.activities.student");
  const locale = useLocale();
  const model = useClassroomStudentActivities(accessToken);

  if (model.loading) {
    return (
      <main className="flex h-full min-h-0 w-full flex-1 items-center justify-center text-muted-foreground">
        <SpinnerLabel>{t("loading")}</SpinnerLabel>
      </main>
    );
  }

  if (model.loadError) {
    return <main className="flex h-full items-center justify-center bg-background px-6"><div role="alert" className="max-w-md text-center"><h1 className="font-medium">{t("loadFailed")}</h1><p className="mt-2 text-sm text-muted-foreground">{model.loadError}</p><Button className="mt-4" variant="outline" onClick={model.refresh}><RefreshCw className="size-4" />{t("refresh")}</Button></div></main>;
  }

  if (model.notJoined || !model.data) {
    return (
      <main className="h-full min-h-0 w-full flex-1 bg-background">
        <CenteredEmptyState title={t("noClassroom")} description={t("noClassroomDescription")} />
      </main>
    );
  }

  const { classroom, quizzes } = model.data;

  return (
    <main className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b border-border px-5 py-6 pb-8 md:px-8">
        <div className="mx-auto flex w-full max-w-4xl items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-normal tracking-[-0.015em] text-foreground md:text-4xl">{t("title")}</h1>
              <Badge variant="outline" className="rounded-md text-xs font-normal">
                {classroom.name}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("teacher")}: {classroom.teacherName || "-"}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-9 px-2" onClick={model.refresh}>
            <RefreshCw className="size-3.5" strokeWidth={1.6} />
            {t("refresh")}
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-8">
        <div className="mx-auto w-full max-w-4xl">
          {quizzes.length > 0 ? (
            <div className="space-y-4">
              {quizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  selected={model.answers[quiz.id] ?? []}
                  submitting={model.submittingID === quiz.id}
                  onSelect={(questionIndex, optionIndex) => model.setAnswer(quiz.id, questionIndex, optionIndex)}
                  onSubmit={() => void model.submit(quiz)}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
              <div className="flex size-11 items-center justify-center rounded-md bg-muted/60">
                <ClipboardList className="size-5 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <p className="font-display text-xl font-normal text-foreground">{t("empty")}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function QuizCard({
  quiz,
  selected,
  submitting,
  onSelect,
  onSubmit,
  locale,
}: {
  quiz: StudentClassroomQuizDTO;
  selected: number[];
  submitting: boolean;
  onSelect: (questionIndex: number, optionIndex: number) => void;
  onSubmit: () => void;
  locale: string;
}) {
  const t = useTranslations("classrooms.activities");
  const studentT = useTranslations("classrooms.activities.student");
  const total = quiz.questions.length;

  return (
    <article className="rounded-lg border border-border/60 bg-card">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border/40 px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="font-display text-xl font-normal text-foreground">{quiz.title}</h2>
            <Badge variant="outline" className="rounded-md text-xs font-normal">
              {t(`phase.${quiz.phase}`)}
            </Badge>
            <Badge variant="outline" className="rounded-md text-xs font-normal">
              {t(`status.${quiz.status}`)}
            </Badge>
            {quiz.submitted ? (
              <Badge variant="secondary" className="gap-1 rounded-md text-xs font-normal">
                <CheckCircle2 className="size-4" strokeWidth={1.8} />
                {studentT("submitted")}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("questionCount", { count: total })}
            {quiz.openedAt ? ` · ${formatDateTime(quiz.openedAt, locale)}` : ""}
          </p>
        </div>
        {quiz.submitted ? (
          <Badge variant="outline" className="rounded-md font-mono text-xs font-normal tabular-nums">
            {studentT("score", { score: quiz.score, total })}
          </Badge>
        ) : null}
      </header>

      <div className="space-y-4 px-4 py-3">
        {quiz.questions.map((question, questionIndex) => (
          <div key={question.id} className="space-y-2">
            <div className="flex items-start gap-3 text-base font-medium leading-7 text-foreground" lang="zh-CN">
              <span className="shrink-0">{questionIndex + 1}.</span>
              <div className="min-w-0"><StreamdownRender content={question.prompt} /></div>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {question.options.map((option, optionIndex) => {
                const active = selected[questionIndex] === optionIndex;
                return (
                  <button
                    key={optionIndex}
                    type="button"
                    disabled={quiz.submitted || submitting || quiz.status !== "open"}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-md border px-3 py-3 text-left text-sm transition-colors",
                      active
                        ? "border-primary/40 bg-accent text-foreground shadow-[inset_2px_0_0_var(--primary)]"
                        : "border-border/60 text-muted-foreground hover:bg-muted/40",
                      (quiz.submitted || submitting) && "cursor-default",
                    )}
                    onClick={() => onSelect(questionIndex, optionIndex)}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-md border text-xs font-medium",
                        active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {OPTION_LETTERS[optionIndex]}
                    </span>
                    <span className="min-w-0 flex-1" lang="zh-CN"><StreamdownRender content={option} /></span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 px-4 py-3">
        {quiz.submitted ? (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <LockKeyhole className="size-4" strokeWidth={1.7} />
            {studentT("locked")}
          </span>
        ) : quiz.status !== "open" ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <LockKeyhole className="size-4" strokeWidth={1.7} />
            {studentT("closedNote")}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{studentT("locked")}</span>
        )}
        {!quiz.submitted && quiz.status === "open" ? (
          <Button type="button" size="sm" className="h-9 px-3" disabled={submitting} onClick={onSubmit}>
            {submitting ? <Spinner className="size-4" /> : null}
            {submitting ? studentT("submitting") : studentT("submit")}
          </Button>
        ) : null}
      </footer>
    </article>
  );
}

function formatDateTime(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
