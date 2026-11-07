"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PerformanceEvidenceView } from "@/features/classrooms/components/shared/performance-evidence";
import { useClassroomStudentPerformance } from "@/features/classrooms/hooks/use-classroom-student-performance";

export function StudentPerformance({ accessToken }: { accessToken: string }) {
  const t = useTranslations("classrooms.performance");
  const { record, error, refresh } = useClassroomStudentPerformance(accessToken);
  if (error) return <div className="mb-5 text-sm"><p role="alert" className="text-destructive">{error}</p><Button variant="outline" onClick={refresh}>{t("refresh")}</Button></div>;
  const student = record?.report.students[0];
  if (!record || !student) return null;
  return <section className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5"><div><h2 className="font-display text-xl font-normal">{t("title")}</h2><p className="mt-2 text-sm">{record.title}</p></div><div className="flex items-center gap-4"><span className="font-mono text-2xl">{student.final == null ? "—" : student.final.toFixed(1)}</span><Dialog><DialogTrigger asChild><Button variant="outline">{t("evidence")}</Button></DialogTrigger><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{t("evidence")}</DialogTitle><DialogDescription>{record.title}</DialogDescription></DialogHeader><PerformanceEvidenceView student={student} /></DialogContent></Dialog></div></section>;
}
