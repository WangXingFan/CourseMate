"use client";

import { useEffect, useRef, useState } from "react";
import type { LearningCorrectionResponse, LearningCorrectionResultResponse } from "@deeix/api-contract";
import { getLearningCorrections, submitLearningCorrection } from "@/shared/api/learning-corrections";
import { useAuthSession } from "@/shared/auth/auth-session-context";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { createSecureUUID } from "@/shared/lib/secure-id";
import { ApiError } from "@/shared/api/http-client";

export function useLearningCorrections() {
  const { accessToken, user } = useAuthSession();
  const resolveError = useLocalizedErrorMessage();
  const [items, setItems] = useState<LearningCorrectionResponse[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(""); setItems([]);
    void getLearningCorrections(accessToken, controller.signal).then((data) => { if (!controller.signal.aborted) setItems(data.items); }).catch((cause) => { if (!controller.signal.aborted) setError(resolveError(cause)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, revision, resolveError]);
  return { items, error, loading, owner: user?.publicID ?? "", refresh: () => setRevision((v) => v + 1) };
}

export function useLearningCorrectionAnswer(id: string, onSaved: () => void) {
  const { accessToken } = useAuthSession();
  const resolveError = useLocalizedErrorMessage();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<LearningCorrectionResultResponse>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const request = useRef<{ id: string; answers: Record<string, string> } | null>(null);
  async function submit() {
    if (busy.current) return;
    const input = request.current ?? { id: createSecureUUID(), answers: { ...answers } };
    request.current = input; busy.current = true; setPending(true); setError("");
    try { setResult(await submitLearningCorrection(accessToken, { ...input, correctionId: id })); onSaved(); }
    catch (cause) {
      if (cause instanceof ApiError && cause.status === 400) request.current = null;
      setError(resolveError(cause));
    }
    finally { busy.current = false; setPending(false); }
  }
  return { answers, setAnswers, result, pending, error, locked: !!request.current, submit };
}
