"use client";

import { useEffect, useState } from "react";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { getStudentPerformance, type PerformanceRecord } from "@/shared/api/classroom-performance";

export function useClassroomStudentPerformance(accessToken: string) {
  const resolveError = useLocalizedErrorMessage();
  const [record, setRecord] = useState<PerformanceRecord | null>();
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(""); setRecord(undefined);
    void getStudentPerformance(accessToken, controller.signal).then((data) => { if (!controller.signal.aborted) setRecord(data.record); }).catch((err: unknown) => { if (!controller.signal.aborted) setError(resolveError(err)); });
    return () => controller.abort();
  }, [accessToken, revision, resolveError]);
  return { record, error, refresh: () => setRevision((v) => v + 1) };
}
