"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import type { ClassroomDTO } from "@/shared/api/classroom-types";
import { listClassrooms } from "@/shared/api/classrooms";
import { exportClassroom, type ClassroomExportRequest } from "@/shared/api/exports";
import { listPerformanceRecords, type PerformanceRecordItem } from "@/shared/api/classroom-performance";
import { downloadBlob } from "@/shared/lib/export-download";
import { listHomeworks, type HomeworkResponse } from "@/shared/api/homeworks";
import { useExportProfile } from "./use-export-profile";

export const EXPORT_ITEMS = ["homeworks", "labs", "attendance", "performance", "ai_activity"] as const;
export const REPORT_COURSES = [{ id: "L1", fileLabel: "实验一" }, { id: "L2", fileLabel: "实验二" }, { id: "L3", fileLabel: "实验三" }] as const;
type ScoreItem = typeof EXPORT_ITEMS[number];
export type ExportKind = ScoreItem | "summary" | "reports" | "homework_reports";

export function useExportCenter(accessToken: string) {
  const t = useTranslations("classrooms.exports");
  const resolveError = useLocalizedErrorMessage();
  const [classrooms, setClassrooms] = useState<ClassroomDTO[]>([]);
  const [classroomID, setClassroomID] = useState("");
  const profile = useExportProfile(accessToken, classroomID);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<ExportKind | null>(null);
  const [done, setDone] = useState("");
  const [revision, setRevision] = useState(0);
  const [includeOngoing, setIncludeOngoing] = useState(false);
  const [weights, setWeights] = useState<Record<ScoreItem, string>>({ homeworks: "40", labs: "40", attendance: "20", performance: "20", ai_activity: "10" });
  const [selected, setSelected] = useState<Record<ScoreItem, boolean>>({ homeworks: true, labs: true, attendance: true, performance: false, ai_activity: false });
  const [aiActivityStartDate, setAIActivityStartDate] = useState("");
  const [aiActivityEndDate, setAIActivityEndDate] = useState("");
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date());
  const validAIDates = !(aiActivityStartDate && aiActivityEndDate && aiActivityStartDate > aiActivityEndDate) && aiActivityStartDate <= today && aiActivityEndDate <= today;
  const [records, setRecords] = useState<PerformanceRecordItem[]>([]);
  const [performanceRecordID, setPerformanceRecordID] = useState("");
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setRecords([]); setPerformanceRecordID(""); setRecordsError("");
    if (!classroomID) return () => controller.abort();
    setRecordsLoading(true);
    void listPerformanceRecords(accessToken, classroomID, controller.signal).then((data) => {
      if (!controller.signal.aborted) setRecords(data.records);
    }).catch((error: unknown) => { if (!controller.signal.aborted) setRecordsError(resolveError(error)); })
      .finally(() => { if (!controller.signal.aborted) setRecordsLoading(false); });
    return () => controller.abort();
  }, [accessToken, classroomID, revision, resolveError]);
  const [template, setTemplate] = useState("{班级}_{学号}_{姓名}_{实验}");
  const [courseID, setCourseID] = useState("L1");
  const course = REPORT_COURSES.find((item) => item.id === courseID) ?? REPORT_COURSES[0];
  const [homeworkList, setHomeworkList] = useState<{ classroomID: string; items: HomeworkResponse[] }>({ classroomID: "", items: [] });
  const [homeworkID, setHomeworkID] = useState("");
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const [homeworkError, setHomeworkError] = useState("");
  const [homeworkTemplate, setHomeworkTemplate] = useState("{班级}_{学号}_{姓名}_{作业}");
  const homeworks = homeworkList.classroomID === classroomID ? homeworkList.items : [];
  const homework = homeworks.find((item) => item.id === homeworkID);
  useEffect(() => {
    const controller = new AbortController();
    setHomeworkError("");
    if (!classroomID) return () => controller.abort();
    setHomeworkLoading(true);
    void listHomeworks(accessToken, classroomID, controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      const items = data.items.filter((item) => item.status === "open" || item.status === "closed");
      setHomeworkList({ classroomID, items });
      setHomeworkID((current) => items.some((item) => item.id === current) ? current : (items[0]?.id ?? ""));
    }).catch((error: unknown) => { if (!controller.signal.aborted) setHomeworkError(resolveError(error)); })
      .finally(() => { if (!controller.signal.aborted) setHomeworkLoading(false); });
    return () => controller.abort();
  }, [accessToken, classroomID, revision, resolveError]);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    void listClassrooms(accessToken, controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      setClassrooms(data.classrooms);
      setClassroomID((current) => data.classrooms.some((item) => item.id === current) ? current : (data.classrooms[0]?.id ?? ""));
    }).catch((error) => { if (!controller.signal.aborted) setError(resolveError(error)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, revision, resolveError]);

  const classroom = classrooms.find((item) => item.id === classroomID);
  const total = EXPORT_ITEMS.reduce((sum, key) => sum + (selected[key] ? Number(weights[key]) : 0), 0);
  const validWeights = Math.abs(total - 100) < 0.000001 && EXPORT_ITEMS.every((key) => !selected[key] || Number.isFinite(Number(weights[key])) && Number(weights[key]) > 0 && Number(weights[key]) <= 100);
  const validTemplate = template.trim().length > 0 && template.length <= 120 && !/[{}]/.test(template.replace(/\{(班级|学号|姓名|日期|实验)\}/g, ""));
  const validHomeworkTemplate = homeworkTemplate.trim().length > 0 && homeworkTemplate.length <= 120 && !/[{}]/.test(homeworkTemplate.replace(/\{(班级|学号|姓名|日期|作业)\}/g, ""));
  const previewName = (value: string, field: string, label: string) => `${value.replaceAll("{班级}", classroom?.name ?? t("sampleClass")).replaceAll("{学号}", "20260001").replaceAll("{姓名}", t("sampleName")).replaceAll(`{${field}}`, label).replaceAll("{日期}", today).replace(/[<>:"/\\|?*]/g, "_").replace(/\.pdf$/, "")}.pdf`;
  const preview = previewName(template, "实验", course.fileLabel);
  const homeworkPreview = previewName(homeworkTemplate, "作业", homework?.title ?? t("sampleHomework"));

  const download = async (kind: ExportKind) => {
    if (kind !== "reports" && kind !== "homework_reports" && !profile.ready) return;
    if (!classroom || active.current || kind === "summary" && !validWeights || kind === "reports" && !validTemplate) return;
    if (kind === "homework_reports" && (!homework || homeworkLoading || homeworkError || !validHomeworkTemplate)) return;
    if ((kind === "ai_activity" || kind === "summary" && selected.ai_activity) && !validAIDates) return;
    const controller = new AbortController(); active.current = controller;
    setPending(kind); setError(""); setDone("");
    const options: ClassroomExportRequest = { kind, performanceRecordId: performanceRecordID, aiActivityStartDate, aiActivityEndDate, includeOngoing, filenameTemplate: kind === "homework_reports" ? homeworkTemplate : template, homeworkId: kind === "homework_reports" ? homework?.id : undefined, courseID: course.id, weights: Object.fromEntries(EXPORT_ITEMS.filter((key) => selected[key]).map((key) => [key, Number(weights[key])])) };
    try {
      const blob = await exportClassroom(accessToken, classroom.id, options, controller.signal);
      if (controller.signal.aborted) return;
      const assignment = kind === "homework_reports" && homework ? `${homework.title}_${new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(homework.startsAt))}_` : kind === "reports" ? `${course.fileLabel}_` : "";
      const name = `${classroom.name}_${assignment}${t(`items.${kind}`)}`.replace(/[<>:"/\\|?*]/g, "_");
      downloadBlob(blob, `${name}.${kind === "reports" || kind === "homework_reports" ? "zip" : "xlsx"}`);
      setDone(t("downloaded", { name: t(`items.${kind}`) }));
    } catch (error) { if (!controller.signal.aborted) setError(resolveError(error)); }
    finally { if (!controller.signal.aborted) setPending(null); active.current = null; }
  };
  const summaryOptions: ClassroomExportRequest = { kind: "summary", performanceRecordId: performanceRecordID, aiActivityStartDate, aiActivityEndDate, includeOngoing, filenameTemplate: "", courseID: course.id, weights: Object.fromEntries(EXPORT_ITEMS.filter((key) => selected[key]).map((key) => [key, Number(weights[key])])) };
  return { profile, homeworks, homework, homeworkID, setHomeworkID, homeworkLoading, homeworkError, homeworkTemplate, setHomeworkTemplate, validHomeworkTemplate, homeworkPreview, summaryOptions, aiActivityStartDate, setAIActivityStartDate, aiActivityEndDate, setAIActivityEndDate, validAIDates, today, records, performanceRecordID, setPerformanceRecordID, recordsLoading, recordsError, classrooms, classroom, classroomID, setClassroomID, loading, error, pending, done, includeOngoing, setIncludeOngoing, weights, setWeights, selected, setSelected, template, setTemplate, courseID, setCourseID, total, validWeights, validTemplate, preview, download, refresh: () => setRevision((value) => value + 1) };
}
