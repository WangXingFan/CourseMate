"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthSession } from "@/shared/auth/auth-session-context";
import { saveLearningHandoff } from "@/shared/lib/learning-handoff";
import { createSecureUUID } from "@/shared/lib/secure-id";

export function useLearningHelp(title: string, context: string, returnHref: string) {
  const { user } = useAuthSession();
  const router = useRouter();
  const t = useTranslations("learning.continuity");
  const [error, setError] = useState("");
  function open(question: string) {
    if (!user || !question.trim()) return;
    try {
      const id = createSecureUUID();
      saveLearningHandoff(user.publicID, id, { title, returnHref, prompt: t("helpPrompt", { title, question, context: context.slice(0, 16000) }) });
      router.push(`/chat?learning=${id}`);
    } catch { setError(t("storageFailed")); }
  }
  return { open, error };
}
