"use client";

import { useEffect, useRef, useState } from "react";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { getClassroomAIActivity, getStudentAIActivity, type AIActivityReport } from "@/shared/api/classroom-ai-activity";
import { exportClassroom } from "@/shared/api/exports";
import { downloadBlob } from "@/shared/lib/export-download";

export function useClassroomAIActivity(accessToken: string, classroomID?: string) {
  const resolveError = useLocalizedErrorMessage();
  const [report, setReport] = useState<AIActivityReport | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [scope, setScope] = useState({ startDate: "", endDate: "" });
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const downloadRequest = useRef<AbortController | null>(null);
  useEffect(() => () => downloadRequest.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setReport(null); setError("");
    const request = classroomID
      ? getClassroomAIActivity(accessToken, classroomID, scope.startDate, scope.endDate, controller.signal)
      : getStudentAIActivity(accessToken, controller.signal);
    void request.then((data) => { if (!controller.signal.aborted) setReport(data.report ?? null); })
      .catch((err: unknown) => { if (!controller.signal.aborted) setError(resolveError(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, classroomID, scope, revision, resolveError]);

  const download = async (filename: string) => {
    if (!classroomID || !report || downloadRequest.current) return;
    const controller = new AbortController(); downloadRequest.current = controller;
    setPending(true); setError("");
    try {
      const blob = await exportClassroom(accessToken, classroomID, {
        kind: "ai_activity", aiActivityStartDate: report.startDate, aiActivityEndDate: report.endDate,
        performanceRecordId: "", includeOngoing: false, weights: {}, filenameTemplate: "", courseID: "L1",
      }, controller.signal);
      if (!controller.signal.aborted) downloadBlob(blob, `${filename.replace(/[<>:"/\\|?*]/g, "_")}.xlsx`);
    } catch (err: unknown) { if (!controller.signal.aborted) setError(resolveError(err)); }
    finally { if (!controller.signal.aborted) setPending(false); downloadRequest.current = null; }
  };

  return {
    report, startDate, setStartDate, endDate, setEndDate, loading, pending, error, download,
    apply: () => setScope({ startDate, endDate }), refresh: () => setRevision((v) => v + 1),
  };
}
