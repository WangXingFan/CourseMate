"use client";

import * as React from "react";

import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { resolveApiBaseURL } from "@/shared/api/http-client";
import { getLearningCourse, getLearningCourseLesson, saveLearningLessonAnswer } from "@/shared/api/learning";
import type { LearningCourseData, LearningCourseLessonData, LearningLessonAnswerData, LearningLessonAnswerPayload } from "@/shared/api/learning-types";
import { useAuthSession } from "@/shared/auth/auth-session-context";
import { createSecureUUID } from "@/shared/lib/secure-id";

export function useLearningCourse() {
  const { accessToken } = useAuthSession();
  const ownerKey = `${resolveApiBaseURL()}|${accessToken}`;
  const [snapshot, setSnapshot] = React.useState<{ key: string; value: LearningCourseData } | null>(null);
  const [error, setError] = React.useState("");
  const [revision, setRevision] = React.useState(0);
  const resolveError = useLocalizedErrorMessage();
  React.useEffect(() => {
    const controller = new AbortController();
    setError("");
    void getLearningCourse(accessToken, controller.signal).then((value) => {
      if (!controller.signal.aborted) setSnapshot({ key: ownerKey, value });
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(resolveError(cause)); });
    return () => controller.abort();
  }, [accessToken, ownerKey, revision, resolveError]);
  return { data: snapshot?.key === ownerKey ? snapshot.value : null, error, ownerKey, reload: () => setRevision((value) => value + 1) };
}

export function useLearningCourseLesson(lessonId: string) {
  const { accessToken } = useAuthSession();
  const ownerKey = `${resolveApiBaseURL()}|${accessToken}|${lessonId}`;
  const [snapshot, setSnapshot] = React.useState<{ key: string; value: LearningCourseLessonData } | null>(null);
  const [error, setError] = React.useState("");
  const [revision, setRevision] = React.useState(0);
  const resolveError = useLocalizedErrorMessage();
  React.useEffect(() => {
    if (!lessonId) return;
    const controller = new AbortController();
    setError("");
    void getLearningCourseLesson(accessToken, lessonId, controller.signal).then((value) => {
      if (!controller.signal.aborted) setSnapshot({ key: ownerKey, value });
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(resolveError(cause)); });
    return () => controller.abort();
  }, [accessToken, ownerKey, lessonId, revision, resolveError]);
  return { data: snapshot?.key === ownerKey ? snapshot.value : null, error, ownerKey, reload: () => setRevision((value) => value + 1) };
}

export function useLearningLessonAnswer(lessonId: string, questionId: string, version: string, initial: LearningLessonAnswerData | undefined, onSaved: () => void) {
  const { accessToken } = useAuthSession();
  const identity = `${resolveApiBaseURL()}|${accessToken}|${lessonId}|${questionId}|${version}`;
  const owner = React.useRef(identity);
  owner.current = identity;
  const resolveError = useLocalizedErrorMessage();
  const [answers, setAnswers] = React.useState<Record<string, string>>(initial?.answers ?? {});
  const [result, setResult] = React.useState(initial ?? null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const payload = React.useRef<LearningLessonAnswerPayload | null>(null);
  const controller = React.useRef<AbortController | null>(null);
  const inFlight = React.useRef(false);
  const [locked, setLocked] = React.useState(false);

  React.useEffect(() => {
    owner.current = identity;
    return () => { owner.current = ""; controller.current?.abort(); };
  }, [identity]);

  async function submit() {
    if (inFlight.current || result) return;
    const input = payload.current ?? { id: createSecureUUID(), version, lessonId, questionId, answers: { ...answers } };
    payload.current = input;
    const key = identity;
    inFlight.current = true; setSaving(true); setError(""); setLocked(true);
    controller.current = new AbortController();
    try {
      const saved = await saveLearningLessonAnswer(accessToken, input, controller.current.signal);
      if (owner.current === key) { setResult(saved); onSaved(); }
    } catch (cause: unknown) {
      if (owner.current === key) setError(resolveError(cause));
    } finally {
      if (owner.current === key) { inFlight.current = false; setSaving(false); }
    }
  }

  function retryQuestion() {
    if (inFlight.current) return;
    payload.current = null; setResult(null); setAnswers({}); setError(""); setLocked(false);
  }
  return { answers, setAnswers, result, saving, error, locked, submit, retryQuestion };
}
