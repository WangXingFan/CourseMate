"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { ApiError } from "@/shared/api/http-client";
import { listStudentQuizzes, submitClassroomQuiz } from "@/shared/api/classrooms";
import type { StudentClassroomQuizDTO, StudentClassroomQuizListData } from "@/shared/api/classroom-types";
import { useClassroomAnswerDrafts } from "./use-classroom-answer-drafts";

export function useClassroomStudentActivities(accessToken: string, owner: string) {
  const t = useTranslations("classrooms.activities.student");
  const resolveErrorMessage = useLocalizedErrorMessage();
  const [data, setData] = React.useState<StudentClassroomQuizListData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notJoined, setNotJoined] = React.useState(false);
  const [loadError, setLoadError] = React.useState("");
  const [reloadVersion, setReloadVersion] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, number[]>>({});
  const [fieldAnswers, setFieldAnswers] = React.useState<Record<string, Record<string, Record<string, string>>>>({});
  const [submittingID, setSubmittingID] = React.useState("");
  const { draftStatus, readDraft, writeDraft, clearDraft } = useClassroomAnswerDrafts(owner, "quiz");

  React.useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setNotJoined(false);
    setLoadError("");
    setData(null);
    void (async () => {
      try {
        const next = await listStudentQuizzes(accessToken, controller.signal);
        if (cancelled) return;
        setData(next);
        const drafts = new Map(next.quizzes.map((quiz) => {
          if (quiz.submitted || quiz.status === "closed") { clearDraft(quiz.id); return [quiz.id, undefined] as const; }
          const draft = readDraft(quiz.id);
          return [quiz.id, draft?.kind === "quiz" && draft.answers.length === quiz.questions.length ? draft : undefined] as const;
        }));
        setFieldAnswers((current) => Object.fromEntries(next.quizzes.map((quiz) => [quiz.id, quiz.submitted ? quiz.fieldAnswers ?? {} : current[quiz.id] ?? drafts.get(quiz.id)?.fields ?? {}])));
        setAnswers((current) => {
          const merged: Record<string, number[]> = {};
          for (const quiz of next.quizzes ?? []) {
            merged[quiz.id] =
              quiz.answers && quiz.answers.length === quiz.questions.length
                ? quiz.answers
                : current[quiz.id] ?? drafts.get(quiz.id)?.answers ?? Array.from({ length: quiz.questions.length }, () => -1);
          }
          return merged;
        });
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        if (error instanceof ApiError && error.errorCode === "classroom.not_joined") {
          setNotJoined(true);
          setData(null);
          return;
        }
        setLoadError(resolveErrorMessage(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, reloadVersion, resolveErrorMessage, t, readDraft, clearDraft]);

  const refresh = React.useCallback(() => {
    setReloadVersion((current) => current + 1);
  }, []);

  const setAnswer = React.useCallback((quizID: string, questionIndex: number, optionIndex: number) => {
    const next = [...(answers[quizID] ?? [])];
    next[questionIndex] = optionIndex;
    setAnswers((current) => ({ ...current, [quizID]: next }));
    writeDraft(quizID, { kind: "quiz", answers: next, fields: fieldAnswers[quizID] ?? {} });
  }, [answers, fieldAnswers, writeDraft]);

  const submit = React.useCallback(
    async (quiz: StudentClassroomQuizDTO) => {
      if (submittingID) return;
      const selected = answers[quiz.id] ?? [];
      const fields = fieldAnswers[quiz.id] ?? {};
      if (quiz.questions.some((q, i) => q.options.length ? selected[i] === undefined || selected[i] < 0 : q.fields.some((f) => !fields[q.id]?.[f.id]?.trim()))) {
        toast.error(t("answerAll"));
        return;
      }
      setSubmittingID(quiz.id);
      try {
        await submitClassroomQuiz(accessToken, quiz.id, { answers: quiz.questions.map((q, i) => q.options.length ? selected[i] : -1), fieldAnswers: fields });
        clearDraft(quiz.id);
        toast.success(t("submittedToast"));
        refresh();
      } catch (error) {
        toast.error(t("submitFailed"), { description: resolveErrorMessage(error) });
      } finally {
        setSubmittingID("");
      }
    },
    [accessToken, answers, fieldAnswers, refresh, resolveErrorMessage, submittingID, t, clearDraft],
  );

  return {
    data,
    loading,
    notJoined,
    loadError,
    submittingID,
    answers,
    fieldAnswers,
    draftStatus,
    setFieldAnswer: (quizID: string, questionID: string, fieldID: string, value: string) => {
      const fields = { ...fieldAnswers[quizID], [questionID]: { ...fieldAnswers[quizID]?.[questionID], [fieldID]: value } };
      setFieldAnswers((current) => ({ ...current, [quizID]: fields }));
      writeDraft(quizID, { kind: "quiz", answers: answers[quizID] ?? [], fields });
    },
    refresh,
    setAnswer,
    submit,
  };
}

export type ClassroomStudentActivitiesModel = ReturnType<typeof useClassroomStudentActivities>;
