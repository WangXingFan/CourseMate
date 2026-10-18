"use client";

import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Plus,
  RefreshCw,
  Shuffle,
  Trash2,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeightTransition,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner, SpinnerLabel } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  type ClassroomActivitiesModel,
  useClassroomActivities,
} from "@/features/classrooms/hooks/use-classroom-activities";
import type { QuizDraftQuestion } from "@/features/classrooms/types/classrooms";
import { cn } from "@/lib/utils";
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
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <BarChart3 className="size-3.5" strokeWidth={1.6} />
          {t("title")}
        </span>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={list.refresh}>
            <RefreshCw className="size-3.5" strokeWidth={1.6} />
            <span className="hidden sm:inline">{t("refresh")}</span>
          </Button>
          <Button type="button" size="sm" className="h-7 px-2" onClick={createDialog.open}>
            <Plus className="size-3.5" strokeWidth={1.8} />
            {t("create")}
          </Button>
        </div>
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
                busy={actions.busyQuizID === quiz.id}
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
          <div className="flex size-10 items-center justify-center rounded-full bg-muted/60">
            <BarChart3 className="size-5 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-foreground">{t("empty")}</p>
          <p className="max-w-sm text-xs leading-5 text-muted-foreground">{t("emptyDescription")}</p>
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
  locale,
}: {
  quiz: ClassroomQuizDTO;
  busy: boolean;
  onPublish: () => void;
  onClose: () => void;
  onReport: () => void;
  locale: string;
}) {
  const t = useTranslations("classrooms.activities");

  return (
    <div className="rounded-lg border border-border/50 bg-card px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-xs font-medium text-foreground">{quiz.title}</p>
            <Badge variant="outline" className="h-4 rounded-md px-1.5 text-[9px] font-normal">
              {t(`phase.${quiz.phase}`)}
            </Badge>
            <Badge
              variant={quiz.status === "open" ? "default" : "secondary"}
              className="h-4 rounded-md px-1.5 text-[9px] font-normal"
            >
              {t(`status.${quiz.status}`)}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <span>{t("questionCount", { count: quiz.questions.length })}</span>
            <span className="flex items-center gap-1">
              <Users className="size-3" strokeWidth={1.6} />
              {t("submissionCount", { count: quiz.submissionCount })}
            </span>
            <span className="flex items-center gap-1">
              <Clock3 className="size-3" strokeWidth={1.6} />
              {t("createdAt", { date: formatDate(quiz.createdAt, locale) })}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {quiz.status === "draft" || quiz.status === "closed" ? (
            <Button type="button" size="sm" className="h-7 px-2" disabled={busy} onClick={onPublish}>
              {busy ? <Spinner className="size-3" /> : null}
              {t("open")}
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" className="h-7 px-2" disabled={busy} onClick={onClose}>
              {busy ? <Spinner className="size-3" /> : null}
              {t("close")}
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={onReport}>
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
  const { draft, saving, close, change, updateQuestion, addQuestion, removeQuestion, save, maxQuestions } =
    model.createDialog;

  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && !saving && close()}>
      <DialogContent className="w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[640px]">
        <DialogHeightTransition contentClassName="max-h-[min(88vh,760px)]">
          <DialogHeader className="shrink-0 px-4 py-4">
            <DialogTitle>{t("createDialog.title")}</DialogTitle>
            <DialogDescription>{t("createDialog.description")}</DialogDescription>
          </DialogHeader>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-2">
              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <div className="space-y-1">
                  <label className="text-xs font-normal text-muted-foreground" htmlFor="quiz-title">
                    {t("createDialog.quizTitle")}
                  </label>
                  <Input
                    id="quiz-title"
                    autoFocus
                    maxLength={120}
                    value={draft?.title ?? ""}
                    placeholder={t("createDialog.quizTitlePlaceholder")}
                    disabled={saving}
                    onChange={(event) => draft && change({ ...draft, title: event.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-normal text-muted-foreground">{t("createDialog.phase")}</span>
                  <Select
                    value={draft?.phase ?? "pre_class"}
                    disabled={saving}
                    onValueChange={(value) =>
                      draft && change({ ...draft, phase: value === "in_class" ? "in_class" : "pre_class" })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre_class">{t("phase.pre_class")}</SelectItem>
                      <SelectItem value="in_class">{t("phase.in_class")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                {draft?.questions.map((question, index) => (
                  <QuestionEditor
                    key={index}
                    index={index}
                    question={question}
                    disabled={saving}
                    canRemove={draft.questions.length > 1}
                    onChange={(next) => updateQuestion(index, next)}
                    onRemove={() => removeQuestion(index)}
                  />
                ))}
              </div>
              {draft && draft.questions.length < maxQuestions ? (
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={addQuestion}>
                  <Plus className="size-3.5" strokeWidth={1.8} />
                  {t("createDialog.addQuestion")}
                </Button>
              ) : null}
            </div>
            <DialogFooter className="shrink-0 px-4 py-3">
              <Button type="button" variant="ghost" disabled={saving} onClick={close}>
                {t("createDialog.cancel")}
              </Button>
              <Button type="submit" disabled={!draft?.title.trim() || saving}>
                {saving ? <SpinnerLabel>{t("createDialog.saving")}</SpinnerLabel> : t("createDialog.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogHeightTransition>
      </DialogContent>
    </Dialog>
  );
}

function QuestionEditor({
  index,
  question,
  disabled,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  question: QuizDraftQuestion;
  disabled: boolean;
  canRemove: boolean;
  onChange: (question: QuizDraftQuestion) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("classrooms.activities");

  return (
    <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-foreground">{t("createDialog.question", { index: index + 1 })}</p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {t("createDialog.correct")}
            <Select
              value={String(question.answer)}
              disabled={disabled}
              onValueChange={(value) => onChange({ ...question, answer: Number(value) })}
            >
              <SelectTrigger className="h-6 w-16 px-2 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {question.options.map((_, optionIndex) => (
                  <SelectItem key={optionIndex} value={String(optionIndex)}>
                    {OPTION_LETTERS[optionIndex]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-6 text-muted-foreground hover:text-destructive"
            disabled={disabled || !canRemove}
            aria-label={t("createDialog.removeQuestion")}
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" strokeWidth={1.6} />
          </Button>
        </div>
      </div>
      <Textarea
        className="mt-2 min-h-16 resize-none"
        maxLength={500}
        value={question.prompt}
        placeholder={t("createDialog.promptPlaceholder")}
        disabled={disabled}
        onChange={(event) => onChange({ ...question, prompt: event.target.value })}
      />
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {question.options.map((option, optionIndex) => (
          <Input
            key={optionIndex}
            className={cn(optionIndex === question.answer && "border-primary/50")}
            maxLength={200}
            value={option}
            placeholder={t("createDialog.option", { letter: OPTION_LETTERS[optionIndex] })}
            disabled={disabled}
            onChange={(event) => {
              const options = [...question.options];
              options[optionIndex] = event.target.value;
              onChange({ ...question, options });
            }}
          />
        ))}
      </div>
    </div>
  );
}

function QuizReportDialog({ model }: { model: ClassroomActivitiesModel }) {
  const t = useTranslations("classrooms.activities");
  const locale = useLocale();
  const { report, loading, picked, close, pick } = model.reportDialog;
  const total = report?.quiz.questions.length ?? 0;

  return (
    <Dialog open={report !== null || loading} onOpenChange={(open) => !open && close()}>
      <DialogContent className="w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[760px]">
        <DialogHeightTransition contentClassName="max-h-[min(88vh,780px)]">
          <DialogHeader className="shrink-0 px-4 py-4">
            <DialogTitle>{t("reportDialog.title")}</DialogTitle>
            <DialogDescription>{t("reportDialog.description")}</DialogDescription>
          </DialogHeader>
          {loading || !report ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Spinner className="size-4" />
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-2">
              <div className="grid grid-cols-3 gap-2">
                <ReportStat label={t("reportDialog.submitted")} value={`${report.statistics.submissionCount}/${report.statistics.studentCount}`} />
                <ReportStat label={t("reportDialog.missing")} value={String(report.missing.length)} />
                <ReportStat
                  label={t("reportDialog.average")}
                  value={t("reportDialog.scoreUnit", { score: report.statistics.averageScore.toFixed(1), total })}
                />
              </div>

              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[11px] font-medium text-foreground">{t("reportDialog.distribution")}</p>
                <div className="mt-2 space-y-3">
                  {report.statistics.questions.map((question, questionIndex) => (
                    <div key={question.id} className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground">
                        {t("createDialog.question", { index: questionIndex + 1 })} · {question.prompt}
                      </p>
                      <div className="space-y-1">
                        {question.options.map((_option, optionIndex) => {
                          const count = question.optionCounts[optionIndex] ?? 0;
                          const max = Math.max(1, ...question.optionCounts);
                          const percent = Math.round((count / max) * 100);
                          const correct = optionIndex === question.answer;
                          return (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <span className="w-4 shrink-0 text-[10px] font-medium text-muted-foreground">
                                {OPTION_LETTERS[optionIndex]}
                              </span>
                              <div className="h-4 min-w-0 flex-1 overflow-hidden rounded-sm bg-muted/60">
                                <div
                                  className={cn("h-full rounded-sm transition-[width]", correct ? "bg-primary" : "bg-muted-foreground/35")}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="w-6 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
                                {count}
                              </span>
                              {correct ? (
                                <CheckCircle2 className="size-3 shrink-0 text-primary" strokeWidth={1.8} />
                              ) : (
                                <span className="size-3 shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-foreground">{t("reportDialog.random")}</p>
                  <Button type="button" size="sm" variant="outline" className="h-7" onClick={pick}>
                    <Shuffle className="size-3.5" strokeWidth={1.7} />
                    {picked ? t("reportDialog.pickAgain") : t("reportDialog.random")}
                  </Button>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{t("reportDialog.randomHint")}</p>
                {picked ? (
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {t("reportDialog.picked", { name: studentName(picked, t("reportDialog.anonymous")) })}
                  </p>
                ) : null}
              </div>

              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[11px] font-medium text-foreground">{t("reportDialog.missingTitle")}</p>
                {report.missing.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {report.missing.map((student) => (
                      <Badge key={student.id} variant="outline" className="rounded-md text-[10px] font-normal">
                        {studentName(student, t("reportDialog.anonymous"))}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[10px] text-muted-foreground">{t("reportDialog.missingEmpty")}</p>
                )}
              </div>

              <div className="rounded-lg border border-border/50 p-3">
                <p className="text-[11px] font-medium text-foreground">{t("reportDialog.submissionsTitle")}</p>
                {report.submissions.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {report.submissions.map((submission) => (
                      <div key={submission.studentId} className="flex items-center gap-2 rounded-md px-1 py-1 text-[11px]">
                        <span className="min-w-0 flex-1 truncate text-foreground">{submission.studentName || submission.username}</span>
                        <Badge variant="secondary" className="rounded-md font-mono text-[10px] font-normal tabular-nums">
                          {t("reportDialog.scoreUnit", { score: submission.score, total })}
                        </Badge>
                        <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">
                          {formatDateTime(submission.submittedAt, locale)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[10px] text-muted-foreground">{t("reportDialog.noSubmissions")}</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="shrink-0 px-4 py-3">
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
    <div className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
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
