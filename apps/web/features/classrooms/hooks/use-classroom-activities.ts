"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import type { QuizDraft } from "@/features/classrooms/types/classrooms";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import {
  closeClassroomQuiz,
  createClassroomQuiz,
  getClassroomQuizReport,
  listClassroomQuizzes,
  listClassroomQuizLessons,
  openClassroomQuiz,
} from "@/shared/api/classrooms";
import type {
  ClassroomQuizDTO,
  ClassroomQuizLessonDTO,
  ClassroomQuizReportDTO,
  ClassroomStudentDTO,
} from "@/shared/api/classroom-types";

const QUIZ_TITLE_MAX_LENGTH = 120;
const QUIZ_MAX_QUESTIONS = 10;

function emptyDraft(): QuizDraft {
  return {
    title: "",
    lessonIds: [],
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
  const [lessons, setLessons] = React.useState<ClassroomQuizLessonDTO[]>([]);
  const [lessonsLoading, setLessonsLoading] = React.useState(false);
  const [lessonsError, setLessonsError] = React.useState("");
  const [lessonSearch, setLessonSearch] = React.useState("");
  const [lessonReload, setLessonReload] = React.useState(0);
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
    setLessonSearch("");
  }, []);

  const closeCreate = React.useCallback(() => {
    if (!saving) setDraft(null);
  }, [saving]);

  const editorOpen = draft !== null;
  React.useEffect(() => {
    if (!editorOpen) return;
    const controller = new AbortController();
    setLessons([]);
    setLessonsLoading(true);
    setLessonsError("");
    void (async () => {
      try {
        const data = await listClassroomQuizLessons(accessToken, classroomID, controller.signal);
        if (!controller.signal.aborted) setLessons(data.lessons);
      } catch (error) {
        if (!controller.signal.aborted) setLessonsError(resolveErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) setLessonsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [accessToken, classroomID, editorOpen, lessonReload, resolveErrorMessage]);

  const toggleLesson = React.useCallback((lessonID: string) => {
    setDraft((current) => {
      if (!current) return current;
      if (current.lessonIds.includes(lessonID)) {
        return { ...current, lessonIds: current.lessonIds.filter((id) => id !== lessonID) };
      }
      if (current.lessonIds.length >= QUIZ_MAX_QUESTIONS) return current;
      return { ...current, lessonIds: [...current.lessonIds, lessonID] };
    });
  }, []);

  const saveDraft = React.useCallback(async () => {
    if (!draft || saving || lessonsLoading || lessonsError) return;
    const title = draft.title.trim();
    const valid =
      title.length > 0 &&
      title.length <= QUIZ_TITLE_MAX_LENGTH &&
      draft.lessonIds.length > 0 &&
      draft.lessonIds.length <= QUIZ_MAX_QUESTIONS &&
      draft.lessonIds.every((id) => lessons.some((lesson) => lesson.id === id));
    if (!valid) {
      toast.error(t("createDialog.invalid"));
      return;
    }
    setSaving(true);
    try {
      await createClassroomQuiz(accessToken, classroomID, { title, lessonIds: draft.lessonIds });
      toast.success(t("toast.created"));
      setDraft(null);
      refresh();
    } catch (error) {
      toast.error(t("toast.createFailed"), { description: resolveErrorMessage(error) });
    } finally {
      setSaving(false);
    }
  }, [accessToken, classroomID, draft, lessons, lessonsError, lessonsLoading, refresh, resolveErrorMessage, saving, t]);

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
      lessons: lessons.filter((lesson) => `${lesson.number} ${lesson.title} ${lesson.chapter}`.toLowerCase().includes(lessonSearch.toLowerCase())),
      lessonsLoading,
      lessonsError,
      lessonSearch,
      searchLessons: setLessonSearch,
      reloadLessons: () => setLessonReload((value) => value + 1),
      toggleLesson,
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
