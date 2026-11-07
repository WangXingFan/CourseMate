"use client";

import { Download, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { AIActivityWeeks } from "@/features/classrooms/components/shared/ai-activity-weeks";
import { useClassroomAIActivity } from "@/features/classrooms/hooks/use-classroom-ai-activity";

export function ClassroomAIActivity({ accessToken, classroomID }: { accessToken: string; classroomID: string }) {
  const t = useTranslations("classrooms.aiActivity");
  const m = useClassroomAIActivity(accessToken, classroomID);
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date());
  const invalid = !!(m.startDate && m.endDate && m.startDate > m.endDate) || m.startDate > today || m.endDate > today;
  return <section className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="font-display text-2xl font-normal">{t("title")}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("description")}</p></div>
      <div className="flex gap-2"><Button variant="outline" disabled={!m.report || m.pending || m.loading} onClick={() => void m.download(t("title"))}>{m.pending ? <Spinner className="size-4" /> : <Download aria-hidden className="size-4" />}{t("export")}</Button><Button variant="ghost" aria-label={t("refresh")} disabled={m.loading || m.pending} onClick={m.refresh}><RefreshCw aria-hidden className="size-4" /></Button></div>
    </div>
    <p className="border-l-2 border-primary pl-4 text-sm leading-relaxed">{t("formula")}</p>
    <form className="my-6 flex flex-wrap items-end gap-4" onSubmit={(event) => { event.preventDefault(); if (!invalid) m.apply(); }}>
      <label className="grid min-w-0 flex-1 gap-2 text-sm"><span>{t("startDate")}</span><Input type="date" value={m.startDate} max={m.endDate || today} disabled={m.pending} onChange={(e) => m.setStartDate(e.target.value)} /></label>
      <label className="grid min-w-0 flex-1 gap-2 text-sm"><span>{t("endDate")}</span><Input type="date" value={m.endDate} min={m.startDate} max={today} disabled={m.pending} onChange={(e) => m.setEndDate(e.target.value)} /></label>
      <Button type="submit" disabled={invalid || m.loading || m.pending}>{t("apply")}</Button>
    </form>
    {invalid && <p role="alert" className="mb-4 text-sm text-destructive">{t("invalidDates")}</p>}
    {m.error && <p role="alert" className="mb-4 text-sm text-destructive">{m.error}</p>}
    {m.loading ? <div className="flex justify-center py-12"><Spinner className="size-5" /></div> : m.report && <>
      <p className="mb-2 text-sm">{t("range", { start: m.report.startDate, end: m.report.endDate })}</p>
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{t("weekHint")}</p>
      {m.report.students.length ? <div className="overflow-x-auto rounded-md border border-border" role="region" aria-label={t("title")}>
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="border-b border-border bg-muted/40"><tr>{["student", "score", "activeWeeks", "days", "rounds", "details"].map((key) => <th className="px-4 py-3 font-medium" key={key} scope="col">{t(key)}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">{m.report.students.map((student) => <tr key={student.studentId}>
            <th scope="row" className="px-4 py-4 font-normal"><span className="block font-display text-lg">{student.name}</span><span className="font-mono text-muted-foreground">{student.username}</span></th>
            <td className="px-4 py-4">{student.final == null ? <span className="text-muted-foreground">{t("noData")}</span> : <span className="font-mono text-xl tabular-nums">{student.final.toFixed(2)}</span>}</td>
            <td className="px-4 py-4 font-mono">{student.activeWeeks} / {student.expectedWeeks}</td>
            <td className="px-4 py-4 font-mono">{student.activeDays}</td><td className="px-4 py-4 font-mono">{student.validRounds}</td>
            <td className="px-4 py-4"><AIActivityWeeks student={student} /></td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="py-8 text-center text-sm text-muted-foreground">{t("noStudents")}</p>}
      <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{t("validHint")}</p>
    </>}
  </section>;
}
