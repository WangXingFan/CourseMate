"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { QuizChapter, QuizRanking, QuizRound, LearningQuizRoundResponse } from "@deeix/api-contract";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { getLearningQuizCatalog, getLearningQuizLeaderboard, startLearningQuiz, answerLearningQuiz, finishLearningQuiz } from "@/shared/api/learning-quiz";
import { resolveApiBaseURL } from "@/shared/api/http-client";
import { useAuthSession } from "@/shared/auth/auth-session-context";
import { createSecureUUID } from "@/shared/lib/secure-id";

export function useLearningQuiz(chapter: string) {
  const { user, accessToken } = useAuthSession();
  const resolveError = useLocalizedErrorMessage();
  const [chapters, setChapters] = useState<QuizChapter[]>([]);
  const [rankings, setRankings] = useState<QuizRanking[]>([]);
  const [round, setRound] = useState<QuizRound | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [rankingError, setRankingError] = useState("");
  const [rankingLoading, setRankingLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const alive = useRef(true);
  const locked = useRef(false);
  const retryOperation = useRef<(() => Promise<LearningQuizRoundResponse>) | null>(null);
  const deadline = useRef(0);
  const key = `coursemate.quiz:${resolveApiBaseURL()}:${user?.id}:${chapter}`;

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setCatalogError("");
    void getLearningQuizCatalog(accessToken, controller.signal).then((data) => {
      if (!controller.signal.aborted) setChapters(data.chapters);
    }).catch((e: unknown) => { if (!controller.signal.aborted) setCatalogError(resolveError(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, revision, resolveError]);

  useEffect(() => {
    const controller = new AbortController();
    setRankings([]); setRankingError(""); setRankingLoading(true);
    void getLearningQuizLeaderboard(accessToken, chapter, controller.signal).then((data) => {
      if (!controller.signal.aborted) setRankings(data.rankings);
    }).catch((e: unknown) => { if (!controller.signal.aborted) setRankingError(resolveError(e)); })
      .finally(() => { if (!controller.signal.aborted) setRankingLoading(false); });
    return () => controller.abort();
  }, [accessToken, chapter, revision, resolveError]);

  const run = useCallback(async (operation: () => Promise<LearningQuizRoundResponse>) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(""); retryOperation.current = operation;
    try {
      const data = await operation();
      if (!alive.current) return;
      setRound(data.round);
      deadline.current = performance.now() + Math.max(0, Date.parse(data.round.deadlineAt) - Date.parse(data.serverTime));
      setTimeLeft(Math.max(0, Math.ceil((deadline.current - performance.now()) / 1000)));
      retryOperation.current = null;
      if (data.round.finishedAt) {
        try { window.sessionStorage.removeItem(key); } catch { /* Storage is optional. */ }
        setRevision((v) => v + 1);
      }
    } catch (e: unknown) { if (alive.current) setError(resolveError(e)); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  }, [key, resolveError]);

  const start = useCallback(() => {
    let id = createSecureUUID();
    try {
      const saved = window.sessionStorage.getItem(key);
      if (saved && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(saved)) id = saved;
      window.sessionStorage.setItem(key, id);
    } catch { /* The visible retry action still retains the same ID. */ }
    return run(() => startLearningQuiz(accessToken, { id, chapterId: chapter }));
  }, [accessToken, chapter, key, run]);
  const answer = useCallback((questionId: string, selected: number) => {
    if (!round || error) return;
    return run(() => answerLearningQuiz(accessToken, round.id, { questionId, selected }));
  }, [accessToken, round, error, run]);
  const finish = useCallback(() => {
    if (!round || round.finishedAt || error) return;
    return run(() => finishLearningQuiz(accessToken, round.id));
  }, [accessToken, round, error, run]);
  useEffect(() => {
    if (!round || round.finishedAt) return;
    const tick = () => setTimeLeft(Math.max(0, Math.ceil((deadline.current - performance.now()) / 1000)));
    tick(); const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [round]);
  useEffect(() => { if (round && !round.finishedAt && timeLeft === 0 && !busy && !error) void finish(); }, [round, timeLeft, busy, error, finish]);
  const retry = () => { const operation = retryOperation.current; if (operation) void run(operation); };
  return { chapters, rankings, round, loading, busy, error, catalogError, rankingError, rankingLoading, timeLeft, start, answer, retry, refreshRanking: () => setRevision((v) => v + 1) };
}
