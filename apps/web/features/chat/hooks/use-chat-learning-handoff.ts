"use client";

import { useEffect, useState } from "react";
import { takeLearningHandoff, type LearningHandoff } from "@/shared/lib/learning-handoff";

export function useChatLearningHandoff(owner: string, id: string, setDraft: (value: string | ((previous: string) => string)) => void) {
  const [context, setContext] = useState<{ owner: string; id: string; value: LearningHandoff } | null>(null);
  useEffect(() => {
    if (!owner || !id) return;
    try {
      const value = takeLearningHandoff(owner, id);
      if (!value) return;
      setDraft((previous) => previous.trim() ? `${previous}\n\n${value.prompt}` : value.prompt);
      setContext({ owner, id, value });
    } catch { setContext(null); }
  }, [owner, id, setDraft]);
  return context?.owner === owner && context.id === id ? context.value : null;
}
