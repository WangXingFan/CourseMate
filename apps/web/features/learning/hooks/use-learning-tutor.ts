"use client";

import * as React from "react";
import { useLocale } from "next-intl";

import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { requestLearningTutor } from "@/shared/api/learning";
import type { LearningTutorData, LearningTutorPayload } from "@/shared/api/learning-types";
import { useAuthSession } from "@/shared/auth/auth-session-context";

export function useLearningTutor(seed: string, input: Omit<LearningTutorPayload, "locale">) {
  const { accessToken } = useAuthSession();
  const locale = useLocale();
  const resolveError = useLocalizedErrorMessage();
  const [snapshot, setSnapshot] = React.useState<{ token: string; data: LearningTutorData } | null>(null);
  const data = snapshot?.token === accessToken ? snapshot.data : null;
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const controller = React.useRef<AbortController | null>(null);
  const action = input.action;

  React.useEffect(() => {
    setSnapshot(null); setError(""); setLoading(false);
    return () => { controller.current?.abort(); };
  }, [seed, action, accessToken, locale]);

  async function request() {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true); setError(""); setSnapshot(null);
    try {
      const result = await requestLearningTutor(accessToken, { ...input, locale }, current.signal);
      if (!current.signal.aborted) setSnapshot({ token: accessToken, data: result });
    } catch (cause: unknown) {
      if (!current.signal.aborted) setError(resolveError(cause));
    } finally {
      if (!current.signal.aborted) setLoading(false);
    }
  }

  return { data, error, loading, request };
}
