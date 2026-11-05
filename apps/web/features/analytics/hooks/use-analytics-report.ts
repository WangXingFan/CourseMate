"use client";

import { useEffect, useState } from "react";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { getUsageReport, type UsageReportResponse } from "@/shared/api/analytics";

export function useAnalyticsReport(accessToken: string) {
  const [days, setDays] = useState(30);
  const [classroomId, setClassroomId] = useState("");
  const [data, setData] = useState<UsageReportResponse>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const resolveError = useLocalizedErrorMessage();
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    void getUsageReport(accessToken, days, classroomId, controller.signal)
      .then((report) => { if (!controller.signal.aborted) setData(report); })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(resolveError(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, days, classroomId, revision, resolveError]);
  return { days, setDays, classroomId, setClassroomId, data, loading, error, refresh: () => setRevision((value) => value + 1) };
}
