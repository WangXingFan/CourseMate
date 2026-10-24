"use client";

import { useEffect, useState } from "react";
import { getLearningVirtualLabGuide } from "@/shared/api/learning-virtual-lab";
import { useAuthSession } from "@/shared/auth/auth-session-context";

export function useLearningVirtualLabGuide() {
  const { user, accessToken } = useAuthSession();
  const allowed = !!user && ["teacher", "admin", "superadmin"].includes(user.role);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ token: string; html: string; failed: boolean } | null>(null);
  useEffect(() => {
    if (!accessToken || !allowed) return;
    let active = true;
    const controller = new AbortController();
    setState(null);
    void getLearningVirtualLabGuide(accessToken, controller.signal).then((result) => {
      if (active) setState({ token: accessToken, html: result.html, failed: false });
    }).catch(() => {
      if (active && !controller.signal.aborted) setState({ token: accessToken, html: "", failed: true });
    });
    return () => { active = false; controller.abort(); };
  }, [accessToken, allowed, retry]);
  return { allowed, state: state?.token === accessToken ? state : null, retry: () => setRetry((v) => v + 1) };
}
