"use client";

import type { LearningVirtualLabAccessResponse } from "@deeix/api-contract";
import { useCallback, useEffect, useState } from "react";
import { getLearningVirtualLabAccess } from "@/shared/api/learning-virtual-lab";
import { useAuthSession } from "@/shared/auth/auth-session-context";

export function useLearningLabAccess() {
  const { user, accessToken } = useAuthSession();
  const key = `${user?.id}:${accessToken}`;
  const [state, setState] = useState<{ key: string; data: LearningVirtualLabAccessResponse | null; error: boolean } | null>(null);
  const [generation, setGeneration] = useState(0);
  const refresh = useCallback(() => setGeneration((value) => value + 1), []);
  useEffect(() => {
    if (!user || !accessToken) return;
    const controller = new AbortController();
    let loading = false;
    const check = async () => {
      if (loading) return;
      loading = true;
      try {
        const data = await getLearningVirtualLabAccess(accessToken, controller.signal);
        if (!controller.signal.aborted) setState({ key, data, error: false });
      } catch {
        if (!controller.signal.aborted) setState({ key, data: null, error: true });
      } finally { loading = false; }
    };
    void check();
    const timer = setInterval(() => { void check(); }, 5000);
    window.addEventListener("focus", check);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener("focus", check); };
  }, [key, accessToken, user, generation]);
  const current = state?.key === key ? state : null;
  return { courses: current?.data?.courses ?? null, error: current?.error ?? false, refresh };
}
