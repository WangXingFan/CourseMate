"use client";

import { useRef, useState } from "react";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { correctHomework, manageHomework } from "@/shared/api/homeworks";

export function useClassroomHomeworkManagement(accessToken: string, id: string, onSaved: () => void) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const resolveError = useLocalizedErrorMessage();
  async function save(action: "extend" | "withdraw" | "release" | "correct", reason: string, deadline: string, studentID: string, score: number) {
    if (busy.current) return false;
    busy.current = true; setPending(true); setError("");
    try {
      if (action === "correct") await correctHomework(accessToken, id, studentID, { score, reason });
      else await manageHomework(accessToken, id, { action, reason, deadline: action === "extend" ? new Date(deadline).toISOString() : undefined });
      onSaved(); return true;
    } catch (cause) { setError(resolveError(cause)); return false; }
    finally { busy.current = false; setPending(false); }
  }
  return { save, pending, error };
}
