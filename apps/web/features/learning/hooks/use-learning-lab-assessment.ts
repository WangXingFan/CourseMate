"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { listLabAssessments, readLabAssessment, mutateLabAssessment, type LabAssessmentResponse } from "@/shared/api/lab-assessments";
import { ApiError, pathParam } from "@/shared/api/http-client";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";

export function useLearningLabAssessment(accessToken: string, course: string) {
  const t = useTranslations("learning.assessment");
  const resolveError = useLocalizedErrorMessage();
  const [data, setData] = useState<LabAssessmentResponse>();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    generation.current++; setData(undefined); setLoading(true); setPending(false); setError("");
    if (accessToken) void listLabAssessments(accessToken, undefined, controller.signal).then(async ({ items }) => {
      const item = items.find((item) => item.courseId === course);
      const next = item ? await readLabAssessment(accessToken, item.id, controller.signal) : undefined;
      if (!controller.signal.aborted) { setData(next); setLoading(false); }
    }).catch((cause: unknown) => { if (!controller.signal.aborted) { setError(resolveError(cause)); setLoading(false); } });
    return () => { generation.current++; controller.abort(); };
  }, [accessToken, course, revision, resolveError]);
  const run = async (task: string, action: string, answers?: Record<string, string>, requestID = "", confirmBlank = false) => {
    if (!data || pending) return;
    const stamp = generation.current;
    setPending(true); setError("");
    try {
      const next = await mutateLabAssessment(accessToken, data.assignment.id, task, action, answers ? { answers, requestId: requestID, confirmBlank } : undefined);
      if (stamp === generation.current) setData(next);
    } catch (cause) {
      if (stamp === generation.current) setError(cause instanceof ApiError && cause.errorCode?.startsWith("lab.") ? t(`errors.${cause.errorCode.slice(4)}`) : resolveError(cause));
    } finally { if (stamp === generation.current) setPending(false); }
  };
  return { data, loading, pending, error, refresh: () => setRevision((v) => v + 1),
    start: (task: string) => run(task, "attempts"),
    checkpoint: (task: string, key: string, answers: Record<string, string>) => run(task, `checkpoints/${pathParam(key)}`, answers),
    submit: (task: string, id: string, answers: Record<string, string>, requestID: string, confirmBlank: boolean) => run(task, `attempts/${pathParam(id)}/submit`, answers, requestID, confirmBlank),
    explain: (task: string) => run(task, "explanations") };
}
