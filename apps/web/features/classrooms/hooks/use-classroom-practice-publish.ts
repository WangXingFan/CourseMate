"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AssignedPracticeQuestion } from "@deeix/api-contract";
import { toast } from "sonner";
import { getPracticeCandidates, publishAssignedPractice } from "@/shared/api/practice-assignments";
import { normalizeAppLocale } from "@/i18n/config";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";

export function useClassroomPracticePublish(accessToken: string, classroomID: string, conceptID: string) {
  const locale = normalizeAppLocale(useLocale());
  const t = useTranslations("classrooms.practice");
  const resolveError = useLocalizedErrorMessage();
  const [questions, setQuestions] = useState<AssignedPracticeQuestion[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    void getPracticeCandidates(accessToken, classroomID, conceptID, locale, controller.signal).then((data) => {
      if (!controller.signal.aborted) { setQuestions(data.questions); setSelected(data.questions.slice(0, 3).map((q) => q.id)); }
    }).catch((cause) => { if (!controller.signal.aborted) setError(resolveError(cause)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, classroomID, conceptID, locale, resolveError, revision]);
  async function publish(title: string, deadline: string, studentIds: string[]) {
    if (busy.current) return false;
    const end = new Date(deadline);
    if (!title.trim() || !Number.isFinite(end.getTime()) || end.getTime() <= Date.now() || selected.length < 3 || selected.length > 5 || !studentIds.length) { setError(t("invalid")); return false; }
    busy.current = true; setPending(true); setError("");
    try {
      await publishAssignedPractice(accessToken, classroomID, { conceptId: conceptID, title: title.trim(), locale, questionIds: selected, studentIds, deadline: end.toISOString() });
      toast.success(t("published")); return true;
    } catch (cause) { setError(resolveError(cause)); return false; }
    finally { busy.current = false; setPending(false); }
  }
  return { questions, selected, setSelected, loading, pending, error, publish, retry: () => setRevision((v) => v + 1) };
}
