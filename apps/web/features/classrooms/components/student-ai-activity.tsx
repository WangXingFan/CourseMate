"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AIActivityWeeks } from "@/features/classrooms/components/shared/ai-activity-weeks";
import { useClassroomAIActivity } from "@/features/classrooms/hooks/use-classroom-ai-activity";

export function StudentAIActivity({ accessToken }: { accessToken: string }) {
  const t = useTranslations("classrooms.aiActivity");
  const m = useClassroomAIActivity(accessToken);
  if (m.loading) return <div className="mb-6 py-3"><Spinner className="size-4" /></div>;
  if (m.error) return <div className="mb-6 flex flex-wrap items-center gap-3"><p role="alert" className="text-sm text-destructive">{m.error}</p><Button variant="outline" onClick={m.refresh}>{t("refresh")}</Button></div>;
  const student = m.report?.students[0];
  if (!student || !m.report) return null;
  return <section className="mb-6 border-b border-border pb-5">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-display text-xl font-normal">{t("title")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("studentScope", { weeks: student.expectedWeeks })}</p></div><div className="flex flex-wrap items-center gap-4"><span className="font-mono text-2xl">{student.final == null ? t("noData") : student.final.toFixed(2)}</span><AIActivityWeeks student={student} /></div></div>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("description")}</p>
  </section>;
}
