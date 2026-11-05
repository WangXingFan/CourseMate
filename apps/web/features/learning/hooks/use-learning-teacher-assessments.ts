"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { ApiError } from "@/shared/api/http-client";
import { listLabAssessments, publishLabAssessment, setLabAssessmentOpen, getLabReport, getLabPreview, correctLabGrade, type LabAssignmentResponse, type LabReportResponse, type LabPreviewResponse } from "@/shared/api/lab-assessments";

export function useLearningTeacherAssessments(accessToken: string, classroomID: string) {
  const t = useTranslations("learning.assessment");
  const resolveError = useLocalizedErrorMessage();
  const [items, setItems] = useState<LabAssignmentResponse[]>([]);
  const [selected, setSelected] = useState("");
  const [report, setReport] = useState<LabReportResponse>();
  const [preview, setPreview] = useState<LabPreviewResponse>();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    void listLabAssessments(accessToken, classroomID, controller.signal).then(({ items }) => { if (!controller.signal.aborted) { setItems(items); setLoading(false); } }).catch((cause: unknown) => { if (!controller.signal.aborted) { setError(resolveError(cause)); setLoading(false); } });
    return () => controller.abort();
  }, [accessToken, classroomID, revision, resolveError]);
  useEffect(() => {
    const controller = new AbortController(); setReport(undefined); setPreview(undefined); setReportLoading(!!selected);
    if (selected) void getLabReport(accessToken, selected, controller.signal).then((data) => { if (!controller.signal.aborted) setReport(data); }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(resolveError(cause)); }).finally(() => { if (!controller.signal.aborted) setReportLoading(false); });
    return () => controller.abort();
  }, [accessToken, selected, revision, resolveError]);
  const run = async (work: () => Promise<void>) => {
    if (pending) return; setPending(true); setError("");
    try { await work(); } catch (cause) { if (alive.current) setError(cause instanceof ApiError && cause.errorCode?.startsWith("lab.") ? t(`errors.${cause.errorCode.slice(4)}`) : resolveError(cause)); }
    finally { if (alive.current) setPending(false); }
  };
  return { items, selected, report, preview, error, pending, loading, reportLoading,
    select: (id: string) => { setSelected(id); setPreview(undefined); setError(""); },
    refresh: () => { setError(""); setRevision((v) => v + 1); },
    publish: (courseId: string, startsAt: string, deadline: string) => run(async () => { const a = await publishLabAssessment(accessToken, classroomID, { courseId, startsAt: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(), ...(deadline ? { deadline: new Date(deadline).toISOString() } : {}) }); if (alive.current) { setSelected(a.id); setRevision((v) => v + 1); } }),
    setOpen: (id: string, open: boolean) => run(async () => { await setLabAssessmentOpen(accessToken, id, open); if (alive.current) setRevision((v) => v + 1); }),
    showPreview: (id: string, task: string) => run(async () => { const sample = await getLabPreview(accessToken, id, task); if (alive.current) setPreview(sample); }),
    correct: (student: string, task: string, score: number, reason: string) => run(async () => { await correctLabGrade(accessToken, selected, student, task, score, reason); if (alive.current) setRevision((v) => v + 1); }) };
}
