"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import type { ClassroomDTO } from "@/shared/api/classroom-types";
import { listClassrooms } from "@/shared/api/classrooms";
import { exportClassroom, type ClassroomExportRequest } from "@/shared/api/exports";
import { downloadBlob } from "@/shared/lib/export-download";

export const EXPORT_ITEMS = ["homeworks", "labs", "attendance"] as const;
export const REPORT_COURSES = [{ id: "L1", fileLabel: "实验一" }, { id: "L2", fileLabel: "实验二" }, { id: "L3", fileLabel: "实验三" }] as const;
type ScoreItem = typeof EXPORT_ITEMS[number];
export type ExportKind = ScoreItem | "summary" | "reports";

export function useExportCenter(accessToken: string) {
  const t = useTranslations("classrooms.exports");
  const resolveError = useLocalizedErrorMessage();
  const [classrooms, setClassrooms] = useState<ClassroomDTO[]>([]);
  const [classroomID, setClassroomID] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<ExportKind | null>(null);
  const [done, setDone] = useState("");
  const [revision, setRevision] = useState(0);
  const [includeOngoing, setIncludeOngoing] = useState(false);
  const [weights, setWeights] = useState<Record<ScoreItem, string>>({ homeworks: "40", labs: "40", attendance: "20" });
  const [selected, setSelected] = useState<Record<ScoreItem, boolean>>({ homeworks: true, labs: true, attendance: true });
  const [template, setTemplate] = useState("{班级}_{学号}_{姓名}_{实验}");
  const [courseID, setCourseID] = useState("L1");
  const course = REPORT_COURSES.find((item) => item.id === courseID) ?? REPORT_COURSES[0];
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
  const preview = `${template.replaceAll("{班级}", classroom?.name ?? t("sampleClass")).replaceAll("{学号}", "20260001").replaceAll("{姓名}", t("sampleName")).replaceAll("{实验}", course.fileLabel).replaceAll("{日期}", new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date())).replace(/[<>:"/\\|?*]/g, "_").replace(/\.pdf$/, "")}.pdf`;

  const download = async (kind: ExportKind) => {
    if (!classroom || active.current || kind === "summary" && !validWeights || kind === "reports" && !validTemplate) return;
    const controller = new AbortController(); active.current = controller;
    setPending(kind); setError(""); setDone("");
    const options: ClassroomExportRequest = { kind, includeOngoing, filenameTemplate: template, courseID: course.id, weights: Object.fromEntries(EXPORT_ITEMS.filter((key) => selected[key]).map((key) => [key, Number(weights[key])])) };
    try {
      const blob = await exportClassroom(accessToken, classroom.id, options, controller.signal);
      if (controller.signal.aborted) return;
      const name = `${classroom.name}_${kind === "reports" ? `${course.fileLabel}_` : ""}${t(`items.${kind}`)}`.replace(/[<>:"/\\|?*]/g, "_");
      downloadBlob(blob, `${name}.${kind === "reports" ? "zip" : "xlsx"}`);
      setDone(t("downloaded", { name: t(`items.${kind}`) }));
    } catch (error) { if (!controller.signal.aborted) setError(resolveError(error)); }
    finally { if (!controller.signal.aborted) setPending(null); active.current = null; }
  };
  return { classrooms, classroom, classroomID, setClassroomID, loading, error, pending, done, includeOngoing, setIncludeOngoing, weights, setWeights, selected, setSelected, template, setTemplate, courseID, setCourseID, total, validWeights, validTemplate, preview, download, refresh: () => setRevision((value) => value + 1) };
}
