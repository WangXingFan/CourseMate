"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import type { QuizDraft, QuizDraftQuestion } from "@/features/classrooms/types/classrooms";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import {
  closeClassroomQuiz,
  createClassroomQuiz,
  getClassroomQuizReport,
  listClassroomQuizzes,
  openClassroomQuiz,
} from "@/shared/api/classrooms";
import type {
  ClassroomQuizDTO,
  ClassroomQuizReportDTO,
  ClassroomStudentDTO,
} from "@/shared/api/classroom-types";

const QUIZ_TITLE_MAX_LENGTH = 120;
const QUIZ_MAX_QUESTIONS = 10;
const QUIZ_DEFAULT_OPTIONS = 4;

function emptyQuestion(): QuizDraftQuestion {
  return { prompt: "", options: Array.from({ length: QUIZ_DEFAULT_OPTIONS }, () => ""), answer: 0 };
}

function emptyDraft(): QuizDraft {
  return {
    title: "",
    phase: "pre_class",
    questions: [emptyQuestion(), emptyQuestion()],
  };
}

export function useClassroomActivities(accessToken: string, classroomID: string) {
  const t = useTranslations("classrooms.activities");
  const resolveErrorMessage = useLocalizedErrorMessage();
  const [quizzes, setQuizzes] = React.useState<ClassroomQuizDTO[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [reloadVersion, setReloadVersion] = React.useState(0);
  const [draft, setDraft] = React.useState<QuizDraft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [busyQuizID, setBusyQuizID] = React.useState("");
  const [report, setReport] = React.useState<ClassroomQuizReportDTO | null>(null);
  const [reportLoading, setReportLoading] = React.useState(false);
  const [picked, setPicked] = React.useState<ClassroomStudentDTO | null>(null);

  React.useEffect(() => {
    if (!classroomID) {
      setQuizzes([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const data = await listClassroomQuizzes(accessToken, classroomID, controller.signal);
        if (!cancelled) setQuizzes(data.quizzes ?? []);
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        toast.error(t("loadFailed"), { description: resolveErrorMessage(error) });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, classroomID, reloadVersion, resolveErrorMessage, t]);

  const refresh = React.useCallback(() => {
    setReloadVersion((current) => current + 1);
  }, []);

  const openCreate = React.useCallback(() => {
    setDraft(emptyDraft());
  }, []);

  const closeCreate = React.useCallback(() => {
    if (!saving) setDraft(null);
  }, [saving]);

  const updateQuestion = React.useCallback((index: number, question: QuizDraftQuestion) => {
    setDraft((current) => {
      if (!current) return current;
      const questions = [...current.questions];
      questions[index] = question;
      return { ...current, questions };
    });
  }, []);

  const addQuestion = React.useCallback(() => {
    setDraft((current) =>
      current && current.questions.length < QUIZ_MAX_QUESTIONS
        ? { ...current, questions: [...current.questions, emptyQuestion()] }
        : current,
    );
  }, []);

  const removeQuestion = React.useCallback((index: number) => {
    setDraft((current) =>
      current && current.questions.length > 1
        ? { ...current, questions: current.questions.filter((_, position) => position !== index) }
        : current,
    );
  }, []);

  const saveDraft = React.useCallback(async () => {
    if (!draft || saving) return;
    const title = draft.title.trim();
    const questions = draft.questions.map((question) => ({
      prompt: question.prompt.trim(),
      options: question.options.map((option) => option.trim()),
      answer: question.answer,
    }));
    const valid =
      title.length > 0 &&
      title.length <= QUIZ_TITLE_MAX_LENGTH &&
      questions.length > 0 &&
      questions.length <= QUIZ_MAX_QUESTIONS &&
      questions.every(
        (question) =>
          question.prompt.length > 0 &&
          question.options.length >= 2 &&
          question.options.every((option) => option.length > 0) &&
          question.answer >= 0 &&
          question.answer < question.options.length,
      );
    if (!valid) {
      toast.error(t("createDialog.invalid"));
      return;
    }
    setSaving(true);
    try {
      await createClassroomQuiz(accessToken, classroomID, { title, phase: draft.phase, questions });
      toast.success(t("toast.created"));
      setDraft(null);
      refresh();
    } catch (error) {
      toast.error(t("toast.createFailed"), { description: resolveErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }, [accessToken, classroomID, draft, refresh, resolveErrorMessage, saving, t]);

  const setQuizStatus = React.useCallback(
    async (quiz: ClassroomQuizDTO, status: "open" | "closed") => {
      if (busyQuizID) return;
      setBusyQuizID(quiz.id);
      try {
        if (status === "open") {
          await openClassroomQuiz(accessToken, quiz.id);
          toast.success(t("toast.opened"));
        } else {
          await closeClassroomQuiz(accessToken, quiz.id);
          toast.success(t("toast.closed"));
        }
        refresh();
      } catch (error) {
        toast.error(status === "open" ? t("toast.openFailed") : t("toast.closeFailed"), {
          description: resolveErrorMessage(error),
        });
      } finally {
        setBusyQuizID("");
      }
    },
    [accessToken, busyQuizID, refresh, resolveErrorMessage, t],
  );

  const openReport = React.useCallback(
    async (quiz: ClassroomQuizDTO) => {
      setReportLoading(true);
      setReport(null);
      setPicked(null);
      try {
        const data = await getClassroomQuizReport(accessToken, quiz.id);
        setReport(data);
      } catch (error) {
        toast.error(t("reportLoadFailed"), { description: resolveErrorMessage(error) });
      } finally {
        setReportLoading(false);
      }
    },
    [accessToken, resolveErrorMessage, t],
  );

  const closeReport = React.useCallback(() => {
    if (!reportLoading) {
      setReport(null);
      setPicked(null);
    }
  }, [reportLoading]);

  const pickStudent = React.useCallback(() => {
    if (!report) return;
    const pool = report.missing.length > 0 ? report.missing : report.students;
    if (pool.length === 0) {
      setPicked(null);
      return;
    }
    setPicked(pool[Math.floor(Math.random() * pool.length)] ?? null);
  }, [report]);

  return {
    list: { quizzes, loading, refresh },
    createDialog: {
      draft,
      saving,
      open: openCreate,
      close: closeCreate,
      change: setDraft,
      updateQuestion,
      addQuestion,
      removeQuestion,
      save: saveDraft,
      maxQuestions: QUIZ_MAX_QUESTIONS,
    },
    actions: {
      busyQuizID,
      publish: (quiz: ClassroomQuizDTO) => setQuizStatus(quiz, "open"),
      close: (quiz: ClassroomQuizDTO) => setQuizStatus(quiz, "closed"),
      openReport,
    },
    reportDialog: {
      report,
      loading: reportLoading,
      picked,
      close: closeReport,
      pick: pickStudent,
    },
  };
}

export type ClassroomActivitiesModel = ReturnType<typeof useClassroomActivities>;
