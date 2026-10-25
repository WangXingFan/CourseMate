"use client";

import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCw,
  Shuffle,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeightTransition,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner, SpinnerLabel } from "@/components/ui/spinner";
import {
  type ClassroomActivitiesModel,
  useClassroomActivities,
} from "@/features/classrooms/hooks/use-classroom-activities";
import { QuizComparisonPanel } from "@/features/classrooms/components/sections/quiz-comparison-panel";
import { cn } from "@/lib/utils";
import { StreamdownRender } from "@/shared/components/markdown/streamdown-render";
import type { ClassroomQuizDTO, ClassroomStudentDTO } from "@/shared/api/classroom-types";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export function ClassroomActivitiesSection({
  accessToken,
  classroomID,
}: {
  accessToken: string;
  classroomID: string;
}) {
  const model = useClassroomActivities(accessToken, classroomID);
  return <ClassroomActivities model={model} />;
}

export function ClassroomActivities({ model }: { model: ClassroomActivitiesModel }) {
  const t = useTranslations("classrooms.activities");
  const locale = useLocale();
  const { list, createDialog, actions } = model;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border/35 px-3 md:px-5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <BarChart3 className="size-3.5" strokeWidth={1.6} />
          {t("title")}
        </span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" className="h-9 px-2" onClick={list.refresh}>
            <RefreshCw className="size-3.5" strokeWidth={1.6} />
            <span className="hidden sm:inline">{t("refresh")}</span>
          </Button>
          <Button type="button" size="sm" className="h-9 px-2" onClick={createDialog.open}>
            <Plus className="size-3.5" strokeWidth={1.8} />
            {t("create")}
          </Button>
        </div>
      </div>

      <div className="shrink-0 border-b border-border/40 bg-muted/20 px-3 py-3 md:px-5">
        <p className="text-sm font-medium">{t("workflow.title")}</p>
      </div>
      {list.loading && list.quizzes.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
          <Spinner className="size-4" />
        </div>
      ) : list.quizzes.length > 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-5">
          <div className="space-y-2">
            {list.quizzes.map((quiz) => (
              <QuizRow
                key={quiz.id}
                quiz={quiz}
                busy={!!actions.busyQuizID}
                followup={list.quizzes.find((item) => item.sourceQuizId === quiz.id)}
                onFollowup={() => { const next = list.quizzes.find((item) => item.sourceQuizId === quiz.id); if (next) void actions.openReport(next); else void actions.createFollowup(quiz); }}
                onPublish={() => actions.publish(quiz)}
                onClose={() => actions.close(quiz)}
                onReport={() => void actions.openReport(quiz)}
                locale={locale}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <div className="flex size-10 items-center justify-center rounded-md bg-muted/60">
            <BarChart3 className="size-5 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-foreground">{t("empty")}</p>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">{t("emptyDescription")}</p>
          <Button type="button" size="sm" className="mt-1" onClick={createDialog.open}>
            <Plus className="size-3.5" strokeWidth={1.8} />
            {t("create")}
          </Button>
        </div>
      )}

      <QuizEditorDialog model={model} />
      <QuizReportDialog model={model} />
    </div>
  );
}

function QuizRow({
  quiz,
  busy,
  onPublish,
  onClose,
  onReport,
  onFollowup,
  followup,
  locale,
}: {
  quiz: ClassroomQuizDTO;
  busy: boolean;
  onPublish: () => void;
  onClose: () => void;
  onReport: () => void;
  onFollowup: () => void;
  followup?: ClassroomQuizDTO;
  locale: string;
}) {
  const t = useTranslations("classrooms.activities");

  return (
    <div className="rounded-lg border border-border/50 bg-card px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-medium text-foreground">{quiz.title}</p>
            <Badge variant="outline" className="h-5 rounded-md px-1.5 text-xs font-normal">
              {t(`phase.${quiz.phase}`)}
            </Badge>
            <Badge
              variant={quiz.status === "open" ? "default" : "secondary"}
              className="h-5 rounded-md px-1.5 text-xs font-normal"
            >
              {t(`status.${quiz.status}`)}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{t("questionCount", { count: quiz.questions.length })}</span>
            <span className="flex items-center gap-1">
              <Users className="size-4" strokeWidth={1.6} />
              {t("submissionCount", { count: quiz.submissionCount })}
            </span>
            <span className="flex items-center gap-1">
              <Clock3 className="size-4" strokeWidth={1.6} />
              {t("createdAt", { date: formatDate(quiz.createdAt, locale) })}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {(quiz.status === "draft" || quiz.status === "closed") && !followup ? (
            <Button type="button" size="sm" className="h-9 px-2" disabled={busy} onClick={onPublish}>
              {busy ? <Spinner className="size-4" /> : null}
              {t("open")}
            </Button>
          ) : quiz.status === "open" ? (
            <Button type="button" size="sm" variant="outline" className="h-9 px-2" disabled={busy} onClick={onClose}>
              {busy ? <Spinner className="size-4" /> : null}
              {t("close")}
            </Button>
          ) : null}
          {quiz.phase === "pre_class" && quiz.status === "closed" && <Button type="button" variant="outline" size="sm" className="h-9 px-2" disabled={busy} onClick={onFollowup}>{t(followup ? "viewFollowup" : "createFollowup")}</Button>}
          <Button type="button" variant="ghost" size="sm" className="h-9 px-2" aria-label={t("report")} onClick={onReport}>
            <BarChart3 className="size-3.5" strokeWidth={1.6} />
            <span className="hidden sm:inline">{t("report")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuizEditorDialog({ model }: { model: ClassroomActivitiesModel }) {
  const t = useTranslations("classrooms.activities");
  const {
    draft, saving, close, change, save, maxQuestions, lessons, lessonsLoading,
    lessonsError, lessonSearch, searchLessons, reloadLessons, toggleLesson,
  } = model.createDialog;
  const selectedCount = draft?.lessonIds.length ?? 0;

  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && !saving && close()}>
      <DialogContent aria-describedby={undefined} className="w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[640px]">
        <DialogHeightTransition contentClassName="max-h-[min(88vh,760px)]">
          <DialogHeader className="shrink-0 px-4 py-4">
            <DialogTitle>{t("createDialog.title")}</DialogTitle>
          </DialogHeader>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); void save(); }}>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-2">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground" htmlFor="quiz-title">{t("createDialog.quizTitle")}</label>
                <Input id="quiz-title" maxLength={120} value={draft?.title ?? ""} placeholder={t("createDialog.quizTitlePlaceholder")} disabled={saving} onChange={(event) => draft && change({ ...draft, title: event.target.value })} />
              </div>
              <fieldset className="space-y-3" disabled={saving}>
                <legend className="text-xs font-medium">{t("createDialog.lessons")}</legend>
                <div className="flex items-center justify-between gap-3">
                  <label className="sr-only" htmlFor="quiz-lesson-search">{t("createDialog.search")}</label>
                  <Input id="quiz-lesson-search" value={lessonSearch} placeholder={t("createDialog.search")} onChange={(event) => searchLessons(event.target.value)} />
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground" role="status">{t("createDialog.selected", { count: selectedCount, max: maxQuestions })}</span>
                </div>
                {lessonsLoading ? <div role="status" className="py-8 text-center text-xs text-muted-foreground"><SpinnerLabel>{t("createDialog.loading")}</SpinnerLabel></div> : lessonsError ? (
                  <div role="alert" className="rounded-lg border border-destructive/25 p-3 text-xs">
                    <p>{t("createDialog.loadFailed")}</p><p className="mt-1 text-muted-foreground">{lessonsError}</p>
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={reloadLessons}>{t("refresh")}</Button>
                  </div>
                ) : lessons.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{t("createDialog.noLessons")}</p> : (
                  <div className="space-y-2">
                    {lessons.map((lesson) => {
                      const selected = draft?.lessonIds.includes(lesson.id) ?? false;
                      const inputID = `quiz-lesson-${lesson.id}`;
                      return (
                        <div key={lesson.id} className={cn("rounded-lg border p-3 transition-colors", selected ? "border-primary/45 bg-primary/5" : "border-border/60")}>
                          <label htmlFor={inputID} className="flex cursor-pointer items-start gap-2.5 text-sm">
                            <input id={inputID} type="checkbox" checked={selected} disabled={saving || (!selected && selectedCount >= maxQuestions)} onChange={() => toggleLesson(lesson.id)} className="mt-0.5 accent-primary" />
                            <span className="min-w-0"><span className="block font-medium">{lesson.number} {lesson.title}</span><span className="mt-1 block text-xs text-muted-foreground">{lesson.chapter}</span></span>
                          </label>
                          {selected && <div className="mt-3 space-y-3 border-t border-primary/15 pt-3 text-xs" lang="zh-CN"><StreamdownRender content={lesson.prompt} /><ol className="space-y-1 text-muted-foreground">{lesson.options.map((option, index) => <li key={index} className="flex gap-2"><span className="shrink-0 font-mono">{OPTION_LETTERS[index]}.</span><div className="min-w-0"><StreamdownRender content={option} /></div></li>)}</ol><p className="text-sm font-medium text-primary">{t("answerKey", { answer: OPTION_LETTERS[lesson.answer] })}</p><StreamdownRender content={lesson.explanation} />{lesson.followup && <details className="rounded-md bg-muted/50 p-3"><summary className="cursor-pointer font-medium">{t("pairedPreview")}</summary><div className="mt-3 space-y-2"><StreamdownRender content={lesson.followup.prompt} /><ol className="space-y-1 text-muted-foreground">{lesson.followup.options.map((option, index) => <li key={index} className="flex gap-2"><span className="font-mono">{OPTION_LETTERS[index]}.</span><StreamdownRender content={option} /></li>)}</ol><p className="text-primary">{t("answerKey", { answer: OPTION_LETTERS[lesson.followup.answer] })}</p><StreamdownRender content={lesson.followup.explanation} /></div></details>}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </fieldset>
            </div>
            <DialogFooter className="shrink-0 px-4 py-3">
              <Button type="button" variant="ghost" disabled={saving} onClick={close}>{t("createDialog.cancel")}</Button>
              <Button type="submit" disabled={!draft?.title.trim() || selectedCount === 0 || lessonsLoading || !!lessonsError || saving}>{saving ? <SpinnerLabel>{t("createDialog.saving")}</SpinnerLabel> : t("createDialog.save")}</Button>
            </DialogFooter>
          </form>
        </DialogHeightTransition>
      </DialogContent>
    </Dialog>
  );
}

function QuizReportDialog({ model }: { model: ClassroomActivitiesModel }) {
  const t = useTranslations("classrooms.activities");
  const locale = useLocale();
  const { report, loading, picked, close, pick } = model.reportDialog;
  const total = report?.quiz.questions.length ?? 0;

  return (
    <Dialog open={report !== null || loading} onOpenChange={(open) => !open && close()}>
      <DialogContent aria-describedby={undefined} className="w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[760px]">
        <DialogHeightTransition contentClassName="max-h-[min(88vh,780px)]">
          <DialogHeader className="shrink-0 px-4 py-4">
            <DialogTitle>{t("reportDialog.title")}</DialogTitle>
          </DialogHeader>
          {loading || !report ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Spinner className="size-4" />
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-2">
              <p className="text-sm font-semibold">{report.quiz.title}</p>
              <div className="grid grid-cols-3 gap-2">
                <ReportStat label={t("reportDialog.submitted")} value={`${report.statistics.submissionCount}/${report.statistics.studentCount}`} />
                <ReportStat label={t("reportDialog.missing")} value={String(report.missing.length)} />
                <ReportStat
                  label={t("reportDialog.average")}
                  value={t("reportDialog.scoreUnit", { score: report.statistics.averageScore.toFixed(1), total })}
                />
              </div>

              {report.comparison && <QuizComparisonPanel comparison={report.comparison} />}
              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-sm font-medium text-foreground">{t("reportDialog.distribution")}</p>
                <div className="mt-2 space-y-3">
                  {report.statistics.questions.map((question, questionIndex) => (
                    <div key={question.id} className="space-y-1.5">
                      <p className="text-sm text-muted-foreground">{t("createDialog.question", { index: questionIndex + 1 })}{question.conceptTitle ? ` · ${question.conceptTitle}` : ""}</p>
                      <div className="text-xs" lang="zh-CN"><StreamdownRender content={question.prompt} /></div>
                      <p className="text-sm font-medium text-primary">{t("answerKey", { answer: OPTION_LETTERS[question.answer] })} · {t("accuracy", { correct: question.correctCount, total: report.statistics.submissionCount })}</p>
                      <div className="space-y-1">
                        {question.options.map((option, optionIndex) => {
                          const count = question.optionCounts[optionIndex] ?? 0;
                          const max = Math.max(1, ...question.optionCounts);
                          const percent = Math.round((count / max) * 100);
                          const correct = optionIndex === question.answer;
                          return (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <span className="w-4 shrink-0 text-xs font-medium text-muted-foreground">
                                {OPTION_LETTERS[optionIndex]}
                              </span>
                              <div className="min-w-0 flex-[2] text-xs" lang="zh-CN"><StreamdownRender content={option} /></div>
                              <div className="h-4 min-w-10 flex-1 overflow-hidden rounded-sm bg-muted/60">
                                <div
                                  className={cn("h-full rounded-sm transition-[width]", correct ? "bg-primary" : "bg-muted-foreground/35")}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                                {count}
                              </span>
                              {correct ? (
                                <CheckCircle2 className="size-4 shrink-0 text-primary" strokeWidth={1.8} />
                              ) : (
                                <span className="size-4 shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {question.explanation && <div className="rounded-md bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground" lang="zh-CN"><StreamdownRender content={question.explanation} /></div>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{t("reportDialog.random")}</p>
                  <Button type="button" size="sm" variant="outline" className="h-9" onClick={pick}>
                    <Shuffle className="size-3.5" strokeWidth={1.7} />
                    {picked ? t("reportDialog.pickAgain") : t("reportDialog.random")}
                  </Button>
                </div>
                {picked ? (
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {t("reportDialog.picked", { name: studentName(picked, t("reportDialog.anonymous")) })}
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-sm font-medium text-foreground">{t("reportDialog.missingTitle")}</p>
                {report.missing.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {report.missing.map((student) => (
                      <Badge key={student.id} variant="outline" className="rounded-md text-xs font-normal">
                        {studentName(student, t("reportDialog.anonymous"))}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{t("reportDialog.missingEmpty")}</p>
                )}
              </div>

              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-sm font-medium text-foreground">{t("reportDialog.submissionsTitle")}</p>
                {report.submissions.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {report.submissions.map((submission) => (
                      <div key={submission.studentId} className="flex items-center gap-2 rounded-md px-1 py-1 text-xs">
                        <span className="min-w-0 flex-1 truncate text-foreground">{submission.studentName || submission.username}</span>
                        <Badge variant="secondary" className="rounded-md font-mono text-xs font-normal tabular-nums">
                          {t("reportDialog.scoreUnit", { score: submission.score, total })}
                        </Badge>
                        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                          {formatDateTime(submission.submittedAt, locale)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">{t("reportDialog.noSubmissions")}</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="shrink-0 flex-wrap px-4 py-3">
            {report && <Button type="button" variant="outline" disabled={loading} onClick={() => void model.actions.openReport(report.quiz)}>{t("refresh")}</Button>}
            {report?.quiz.status === "draft" && <Button type="button" disabled={!!model.actions.busyQuizID} onClick={() => { void model.actions.publish(report.quiz); close(); }}>{t("open")}</Button>}
            {report?.quiz.phase === "pre_class" && report.quiz.status === "closed" && !report.comparison && <Button type="button" disabled={!!model.actions.busyQuizID} onClick={() => void model.actions.createFollowup(report.quiz)}>{t("createFollowup")}</Button>}
            <Button type="button" variant="ghost" onClick={close}>
              {t("reportDialog.close")}
            </Button>
          </DialogFooter>
        </DialogHeightTransition>
      </DialogContent>
    </Dialog>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-2 border-border px-3 py-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-sm font-medium tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function studentName(student: ClassroomStudentDTO, fallback: string): string {
  return student.displayName.trim() || student.username.trim() || fallback;
}

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale, { month: "2-digit", day: "2-digit" }).format(date);
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
