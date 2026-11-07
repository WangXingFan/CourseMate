"use client";

import { useEffect, useRef, useState } from "react";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { finalizePerformance, getPerformanceRecord, listPerformanceRecords, previewPerformance, type PerformanceActivity, type PerformanceCorrection, type PerformanceOptions, type PerformanceRecordItem, type PerformanceReport } from "@/shared/api/classroom-performance";
import { exportClassroom } from "@/shared/api/exports";
import { downloadBlob } from "@/shared/lib/export-download";

export function useClassroomPerformance(accessToken: string, classroomID: string) {
  const resolveError = useLocalizedErrorMessage();
  const [report, setReport] = useState<PerformanceReport>();
  const [records, setRecords] = useState<PerformanceRecordItem[]>([]);
  const [recordID, setRecordID] = useState("");
  const [options, setOptions] = useState<PerformanceOptions>({ quizIds: [] });
  const [activities, setActivities] = useState<PerformanceActivity[]>([]);
  const [corrections, setCorrections] = useState<Record<string, PerformanceCorrection>>({});
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const action = useRef<AbortController | null>(null);
  useEffect(() => () => action.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    setReport(undefined); setError(""); setCorrections({});
    void Promise.all([
      listPerformanceRecords(accessToken, classroomID, controller.signal),
      recordID ? getPerformanceRecord(accessToken, classroomID, recordID, controller.signal).then((data) => data.record?.report) : previewPerformance(accessToken, classroomID, options, controller.signal).then((data) => data.report),
    ]).then(([list, next]) => {
      if (controller.signal.aborted) return;
      setRecords(list.records); setReport(next);
      if (next && !recordID && options.quizIds.length === 0) setActivities(next.activities);
    }).catch((err: unknown) => { if (!controller.signal.aborted) setError(resolveError(err)); });
    return () => controller.abort();
  }, [accessToken, classroomID, recordID, options, revision, resolveError]);

  const save = async (title: string) => {
    if (!report || action.current || recordID) return false;
    const controller = new AbortController(); action.current = controller;
    setPending(true); setError("");
    try {
      const data = await finalizePerformance(accessToken, classroomID, { title, options: report.options, fingerprint: report.fingerprint, corrections: Object.values(corrections) }, controller.signal);
      if (controller.signal.aborted || !data.record) return false;
      setRecordID(data.record.id);
      return true;
    } catch (err: unknown) { if (!controller.signal.aborted) setError(resolveError(err)); return false; }
    finally { if (!controller.signal.aborted) setPending(false); action.current = null; }
  };
  const download = async (filename: string) => {
    if (!recordID || action.current) return;
    const controller = new AbortController(); action.current = controller; setPending(true); setError("");
    try {
      const blob = await exportClassroom(accessToken, classroomID, { kind: "performance", performanceRecordId: recordID, includeOngoing: false, weights: {}, filenameTemplate: "", courseID: "L1" }, controller.signal);
      if (!controller.signal.aborted) downloadBlob(blob, `${filename.replace(/[<>:"/\\|?*]/g, "_")}.xlsx`);
    } catch (err: unknown) { if (!controller.signal.aborted) setError(resolveError(err)); }
    finally { if (!controller.signal.aborted) setPending(false); action.current = null; }
  };
  return { report, records, recordID, setRecordID, options, setOptions, activities, corrections, setCorrections, error, pending, save, download, refresh: () => setRevision((v) => v + 1) };
}
