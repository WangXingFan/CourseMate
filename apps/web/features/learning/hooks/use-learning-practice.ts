"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import type { LearningCourseQuestion, LearningLessonAttemptResponse, LearningPracticeAnswerRequest, LearningPracticeBankResponse } from "@deeix/api-contract";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { getLearningPracticeBank, saveLearningPracticeAnswer } from "@/shared/api/learning-practice";
import { ApiError } from "@/shared/api/http-client";
import { useAuthSession } from "@/shared/auth/auth-session-context";
import { createSecureUUID } from "@/shared/lib/secure-id";
import { createRandomSeed, createRng } from "@/features/learning/model/lab-random";

export type PracticeMode = "all" | "unanswered" | "mistakes";

export function useLearningPractice(conceptId: string) {
  const { accessToken } = useAuthSession();
  const locale = useLocale();
  const resolveError = useLocalizedErrorMessage();
  const [snapshot, setSnapshot] = useState<{ key: string; data?: LearningPracticeBankResponse; error?: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const [mode, setMode] = useState<PracticeMode>("all");
  const [size, setSize] = useState("10");
  const [round, setRound] = useState<LearningCourseQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<LearningLessonAttemptResponse[]>([]);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [saveError, setSaveError] = useState("");
  const pending = useRef<LearningPracticeAnswerRequest | null>(null);
  const submission = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  const key = JSON.stringify([accessToken, conceptId, locale, revision]);
  const data = snapshot?.key === key ? snapshot.data : undefined;
  const loadError = snapshot?.key === key ? snapshot.error : undefined;
  const question = round[index];
  const result = results[index];
  const progress = new Map(data?.progress.map((item) => [item.questionId, item.correct]));
  const pool = (data?.questions ?? []).filter((q) => mode === "all" || (mode === "unanswered" ? !progress.has(q.id) : progress.get(q.id) === false));

  useEffect(() => {
    const controller = new AbortController();
    void getLearningPracticeBank(accessToken, conceptId, locale, controller.signal)
      .then((value) => { if (!controller.signal.aborted) setSnapshot({ key, data: value }); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setSnapshot({ key, error: resolveError(cause) }); });
    return () => controller.abort();
  }, [accessToken, conceptId, locale, key, resolveError]);

  useEffect(() => () => submission.current?.abort(), []);

  function start(onlyMistakes = false) {
    const questions = onlyMistakes ? round.filter((_q, i) => results[i] && results[i].score < results[i].total) : [...pool];
    const rng = createRng(createRandomSeed());
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    const selected = onlyMistakes || size === "all" ? questions : questions.slice(0, Number(size));
    if (!selected.length || inFlight.current) return;
    setRound(selected); setIndex(0); setAnswers({}); setResults([]); setDone(false); setSaveError(""); setLocked(false); pending.current = null;
  }

  async function submit() {
    if (!question || result || inFlight.current) return;
    const payload: LearningPracticeAnswerRequest = pending.current ?? { id: createSecureUUID(), conceptId, questionId: question.id, locale: locale === "en-US" ? "en-US" : "zh-CN", answers: { ...answers } };
    pending.current = payload;
    submission.current = new AbortController();
    const controller = submission.current;
    inFlight.current = true; setSaving(true); setSaveError(""); setLocked(true);
    try {
      const saved = await saveLearningPracticeAnswer(accessToken, payload, controller.signal);
      if (controller.signal.aborted) return;
      setResults((previous) => [...previous, saved]);
      setSnapshot((previous) => previous?.data ? { ...previous, data: { ...previous.data, progress: [
        ...previous.data.progress.filter((item) => item.questionId !== saved.questionId),
        { questionId: saved.questionId, correct: saved.score === saved.total },
      ] } } : previous);
    } catch (cause: unknown) {
      if (!controller.signal.aborted) {
        if (cause instanceof ApiError && cause.status === 400) { pending.current = null; setLocked(false); }
        setSaveError(resolveError(cause));
      }
    } finally {
      inFlight.current = false;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  function next() {
    if (!result || saving) return;
    if (index + 1 === round.length) setDone(true);
    else { setIndex((value) => value + 1); setAnswers({}); setLocked(false); pending.current = null; }
  }

  return {
    data, loadError, loading: !data && !loadError, reload: () => setRevision((value) => value + 1),
    mode, setMode, size, setSize, pool, start, round, index, question, answers, setAnswers, result, results, done,
    saving, saveError, locked, submit, next, back: () => { setRound([]); setDone(false); },
    answered: progress.size, correct: [...progress.values()].filter(Boolean).length,
  };
}
