"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { getHomeworkBank, getHomeworkReport, listHomeworks, publishHomework, type HomeworkPaperResponse, type HomeworkResponse, type HomeworkReportResponse } from "@/shared/api/homeworks";

export function useClassroomHomeworks(accessToken: string, classroomID: string) {
  const t = useTranslations("classrooms.homework");
  const resolveError = useLocalizedErrorMessage();
  const [papers, setPapers] = useState<HomeworkPaperResponse[]>([]);
  const [items, setItems] = useState<HomeworkResponse[]>([]);
  const [report, setReport] = useState<HomeworkReportResponse>();
  const [reportID, setReportID] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setError(""); setLoading(true);
    void Promise.all([getHomeworkBank(accessToken, classroomID, controller.signal), listHomeworks(accessToken, classroomID, controller.signal)])
      .then(([bank, list]) => { if (!controller.signal.aborted) { setPapers(bank.papers); setItems(list.items); } })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(resolveError(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, classroomID, revision, resolveError]);
  useEffect(() => {
    const controller = new AbortController(); setReport(undefined);
    if (reportID) {
      setReportLoading(true);
      void getHomeworkReport(accessToken, reportID, controller.signal)
        .then((data) => { if (!controller.signal.aborted) setReport(data); })
        .catch((cause: unknown) => { if (!controller.signal.aborted) setError(resolveError(cause)); })
        .finally(() => { if (!controller.signal.aborted) setReportLoading(false); });
    }
    return () => controller.abort();
  }, [accessToken, reportID, revision, resolveError]);
  async function publish(bankId: string, startsAt: string, deadline: string) {
    if (busy.current) return false;
    const start = new Date(startsAt), end = new Date(deadline);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end.getTime() <= Date.now()) { toast.error(t("invalidSchedule")); return false; }
    busy.current = true; setPending(true); setError("");
    try {
      await publishHomework(accessToken, classroomID, { bankId, startsAt: start.toISOString(), deadline: end.toISOString() });
      toast.success(t("published")); setRevision((v) => v + 1); return true;
    } catch (cause) { toast.error(resolveError(cause)); return false; }
    finally { busy.current = false; setPending(false); }
  }
  return { papers, items, error, loading, pending, publish, report, reportID, reportLoading,
    selectReport: setReportID, refresh: () => setRevision((v) => v + 1) };
}
