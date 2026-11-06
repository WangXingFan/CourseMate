"use client";

import { useEffect, useState } from "react";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { getLearningMastery, type LearningMasteryData, type MasteryPeriod } from "@/shared/api/learning-mastery";
import { useAuthSession } from "@/shared/auth/auth-session-context";

export function useLearningMastery() {
  const { accessToken } = useAuthSession();
  const resolveError = useLocalizedErrorMessage();
  const [revision, setRevision] = useState(0);
  const [period, setPeriod] = useState<MasteryPeriod>({});
  const [state, setState] = useState<{ token: string; data?: LearningMasteryData; error?: string }>({ token: "" });
  useEffect(() => {
    const controller = new AbortController();
    setState({ token: accessToken });
    if (accessToken) void getLearningMastery(accessToken, period, controller.signal).then((data) => {
      if (!controller.signal.aborted) setState({ token: accessToken, data });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ token: accessToken, error: resolveError(error) });
    });
    return () => controller.abort();
  }, [accessToken, period, revision, resolveError]);
  return { period, setPeriod, data: state.token === accessToken ? state.data : undefined, error: state.token === accessToken ? state.error : undefined, refresh: () => setRevision((value) => value + 1) };
}
