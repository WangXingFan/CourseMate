"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { previewGrades, finalizeGrades, listGradeRecords, getGradeRecord, downloadGradeRecord, type ClassroomExportRequest, type GradePreviewResponse, type GradeRecordInfoResponse } from "@/shared/api/exports";
import { downloadBlob } from "@/shared/lib/export-download";

type View = { report: GradePreviewResponse; record?: GradeRecordInfoResponse; options: ClassroomExportRequest };

export function useExportGradeRecords(accessToken: string, classroomID: string, options: ClassroomExportRequest) {
  const t = useTranslations("classrooms.gradeRecords");
  const resolveError = useLocalizedErrorMessage();
  const [records, setRecords] = useState<GradeRecordInfoResponse[]>([]);
  const [view, setView] = useState<View | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const active = useRef<AbortController | null>(null);
  const settingsKey = JSON.stringify(options);
  useEffect(() => {
    setView(null); setTitle(""); setMessage(""); setBusy(false);
    active.current?.abort(); active.current = null;
    return () => { active.current?.abort(); active.current = null; };
  }, [classroomID, accessToken, settingsKey]);
  useEffect(() => {
    const controller = new AbortController();
    setRecords([]); setError("");
    if (!classroomID) { setLoading(false); return () => controller.abort(); }
    setLoading(true);
    void listGradeRecords(accessToken, classroomID, controller.signal).then((data) => {
      if (!controller.signal.aborted) setRecords(data.records);
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(resolveError(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, classroomID, revision, resolveError]);

  async function run(action: (signal: AbortSignal) => Promise<void>) {
    if (!classroomID || active.current) return;
    const controller = new AbortController(); active.current = controller;
    setBusy(true); setError(""); setMessage("");
    try { await action(controller.signal); }
    catch (cause) { if (!controller.signal.aborted) setError(resolveError(cause)); }
    finally { if (active.current === controller) { active.current = null; setBusy(false); } }
  }
  const preview = () => run(async (signal) => {
    const report = await previewGrades(accessToken, classroomID, options, signal);
    if (!signal.aborted) { setView({ report, options }); setTitle(""); }
  });
  const read = (record: GradeRecordInfoResponse) => run(async (signal) => {
    const result = await getGradeRecord(accessToken, classroomID, record.id, signal);
    if (!signal.aborted) setView({ report: result.report, record: result, options });
  });
  const finalize = () => run(async (signal) => {
    if (!view || view.record || !title.trim()) return;
    const record = await finalizeGrades(accessToken, classroomID, title.trim(), view.report.fingerprint, view.options, signal);
    if (!signal.aborted) { setView(null); setRecords((items) => [record, ...items]); setMessage(t("saved")); }
  });
  const download = (record: GradeRecordInfoResponse) => run(async (signal) => {
    const blob = await downloadGradeRecord(accessToken, classroomID, record.id, signal);
    if (!signal.aborted) downloadBlob(blob, `${record.title.replace(/[<>:"/\\|?*]/g, "_")}.xlsx`);
  });
  return { records, view, title, setTitle, error, message, loading, busy, preview, read, finalize, download, close: () => { if (!busy) setView(null); }, refresh: () => setRevision((value) => value + 1) };
}
