"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { ApiError } from "@/shared/api/http-client";
import { listStudentQuizzes, submitClassroomQuiz } from "@/shared/api/classrooms";
import type { StudentClassroomQuizDTO, StudentClassroomQuizListData } from "@/shared/api/classroom-types";

export function useClassroomStudentActivities(accessToken: string) {
  const t = useTranslations("classrooms.activities.student");
  const resolveErrorMessage = useLocalizedErrorMessage();
  const [data, setData] = React.useState<StudentClassroomQuizListData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notJoined, setNotJoined] = React.useState(false);
  const [reloadVersion, setReloadVersion] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, number[]>>({});
  const [submittingID, setSubmittingID] = React.useState("");

  React.useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setNotJoined(false);
    void (async () => {
      try {
        const next = await listStudentQuizzes(accessToken, controller.signal);
        if (cancelled) return;
        setData(next);
        setAnswers((current) => {
          const merged: Record<string, number[]> = {};
          for (const quiz of next.quizzes ?? []) {
            merged[quiz.id] =
              quiz.answers && quiz.answers.length === quiz.questions.length
                ? quiz.answers
                : current[quiz.id] ?? Array.from({ length: quiz.questions.length }, () => -1);
          }
          return merged;
        });
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 403) {
          setNotJoined(true);
          setData(null);
          return;
        }
        toast.error(t("loadFailed"), { description: resolveErrorMessage(error) });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, reloadVersion, resolveErrorMessage, t]);

  const refresh = React.useCallback(() => {
    setReloadVersion((current) => current + 1);
  }, []);

  const setAnswer = React.useCallback((quizID: string, questionIndex: number, optionIndex: number) => {
    setAnswers((current) => {
      const existing = current[quizID] ?? [];
      const next = [...existing];
      next[questionIndex] = optionIndex;
      return { ...current, [quizID]: next };
    });
  }, []);

  const submit = React.useCallback(
    async (quiz: StudentClassroomQuizDTO) => {
      if (submittingID) return;
      const selected = answers[quiz.id] ?? [];
      if (selected.length !== quiz.questions.length || selected.some((value) => value < 0)) {
        toast.error(t("answerAll"));
        return;
      }
      setSubmittingID(quiz.id);
      try {
        await submitClassroomQuiz(accessToken, quiz.id, { answers: selected });
        toast.success(t("submittedToast"));
        refresh();
      } catch (error) {
        toast.error(t("submitFailed"), { description: resolveErrorMessage(error) });
      } finally {
        setSubmittingID("");
      }
    },
    [accessToken, answers, refresh, resolveErrorMessage, submittingID, t],
  );

  return {
    data,
    loading,
    notJoined,
    submittingID,
    answers,
    refresh,
    setAnswer,
    submit,
  };
}

export type ClassroomStudentActivitiesModel = ReturnType<typeof useClassroomStudentActivities>;
