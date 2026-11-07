"use client";

import { Download, Info, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EXPORT_ITEMS, REPORT_COURSES, useExportCenter, type ExportKind } from "@/features/exports/hooks/use-export-center";
import { GradeRecords } from "./sections/grade-records";
import { useAuthSession } from "@/shared/auth/auth-session-context";

export function ExportCenter() {
  const { user, userStatus, accessToken } = useAuthSession();
  const t = useTranslations("classrooms.exports");
  if (userStatus === "loading") return <div className="m-auto"><Spinner className="size-5" /></div>;
  if (user?.role !== "teacher") return <main className="m-auto p-6 text-sm" role="alert">{t("forbidden")}</main>;
  return <ExportWorkspace key={user.publicID} accessToken={accessToken} />;
}

function ExportWorkspace({ accessToken }: { accessToken: string }) {
  const t = useTranslations("classrooms.exports");
  const aiT = useTranslations("classrooms.aiActivity");
  const m = useExportCenter(accessToken);
  const disabled = m.loading || !!m.pending || !m.classroom;
  const downloadButton = (kind: ExportKind, invalid = false) => <Button variant={kind === "summary" ? "default" : "outline"} disabled={disabled || invalid || ((kind === "ai_activity" || kind === "summary" && m.selected.ai_activity) && !m.validAIDates) || ((kind === "performance" || kind === "summary" && m.selected.performance) && (m.recordsLoading || !!m.recordsError))} onClick={() => void m.download(kind)}>{m.pending === kind ? <Spinner className="size-4" /> : <Download aria-hidden className="size-4" strokeWidth={1.6} />}{m.pending === kind ? t("preparing") : t(kind === "reports" ? "downloadZip" : "downloadExcel")}</Button>;
  return <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
    <header className="shrink-0 border-b border-border px-5 py-6 pb-8 md:px-8"><div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
      <h1 className="font-display text-3xl font-normal tracking-[-0.015em] md:text-4xl">{t("title")}</h1>
      <div className="flex gap-2"><Dialog><DialogTrigger asChild><Button variant="ghost"><Info aria-hidden className="size-4" strokeWidth={1.6} />{t("rules")}</Button></DialogTrigger><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{t("rules")}</DialogTitle><DialogDescription>{t("scope")}</DialogDescription></DialogHeader><div className="space-y-4 text-sm leading-relaxed">{["homeworks", "labs", "attendance", "performance", "ai_activity", "summary", "reports"].map((key) => <p key={key}>{t(`rulesText.${key}`)}</p>)}</div></DialogContent></Dialog><Button variant="outline" disabled={m.loading || !!m.pending} onClick={m.refresh} aria-label={t("refresh")}><RefreshCw aria-hidden className="size-4" strokeWidth={1.6} /></Button></div>
    </div></header>
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8"><div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end gap-5"><label className="grid min-w-0 flex-1 gap-2 text-sm"><span>{t("classroom")}</span><select className="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3" value={m.classroomID} disabled={m.loading || !!m.pending} onChange={(event) => m.setClassroomID(event.target.value)}>{!m.classrooms.length && <option value="">{t(m.loading ? "loading" : "noClasses")}</option>}{m.classrooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{m.classroom && <div className="border-l-2 border-primary px-4 py-1"><span className="font-mono text-xl">{m.classroom.studentCount}</span><span className="ml-2 text-sm">{t("students")}</span></div>}</div>
      {m.error && <p role="alert" className="text-sm text-destructive">{m.error}</p>}
      {m.done && <p role="status" className="text-sm">{m.done}</p>}
      <label className="grid gap-2 text-sm"><span>{t("performanceSource")}</span><select className="h-9 w-full rounded-md border border-input bg-background px-3" value={m.performanceRecordID} disabled={disabled || m.recordsLoading} onChange={(event) => m.setPerformanceRecordID(event.target.value)}><option value="">{t("performanceLive")}</option>{m.records.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}</select></label>
      {m.recordsError && <p role="alert" className="text-sm text-destructive">{m.recordsError}</p>}
      <fieldset className="space-y-4 border-t border-border pt-5"><legend className="pr-3 font-display text-xl">{t("aiActivityRange")}</legend>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("aiActivityRangeHint")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid min-w-0 gap-2 text-sm"><span>{aiT("startDate")}</span><Input type="date" value={m.aiActivityStartDate} max={m.aiActivityEndDate || m.today} disabled={!!m.pending} onChange={(e) => m.setAIActivityStartDate(e.target.value)} /></label>
          <label className="grid min-w-0 gap-2 text-sm"><span>{aiT("endDate")}</span><Input type="date" value={m.aiActivityEndDate} min={m.aiActivityStartDate} max={m.today} disabled={!!m.pending} onChange={(e) => m.setAIActivityEndDate(e.target.value)} /></label>
        </div>
        {!m.validAIDates && <p role="alert" className="text-sm text-destructive">{aiT("invalidDates")}</p>}
      </fieldset>
      <section aria-labelledby="export-scores"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5"><h2 id="export-scores" className="font-display text-2xl font-normal">{t("scores")}</h2><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={m.includeOngoing} disabled={!!m.pending} onChange={(event) => m.setIncludeOngoing(event.target.checked)} />{t("includeOngoing")}</label></div>
        <div className="divide-y divide-border">{EXPORT_ITEMS.map((key, index) => <div key={key} className="flex flex-wrap items-center justify-between gap-4 py-5"><div className="flex items-center gap-4"><span className="font-mono text-sm text-muted-foreground">0{index+1}</span><h3 className="font-display text-xl font-normal">{t(`items.${key}`)}</h3></div>{downloadButton(key)}</div>)}</div>
      </section>
      <section aria-labelledby="export-summary" className="border-t border-border pt-7"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 id="export-summary" className="font-display text-2xl font-normal">{t("items.summary")}</h2><span className={`font-mono text-lg ${m.validWeights ? "text-foreground" : "text-destructive"}`}>{t("weightTotal", { value: Number.isFinite(m.total) ? m.total : 0 })}</span></div>
        <div className="divide-y divide-border">{EXPORT_ITEMS.map((key) => <div key={key} className="flex items-center justify-between gap-4 py-3"><label className="flex items-center gap-3 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={m.selected[key]} disabled={!!m.pending} onChange={(event) => m.setSelected((current) => ({ ...current, [key]: event.target.checked }))} />{t(`items.${key}`)}</label><label className="flex items-center gap-2"><span className="sr-only">{t("weight", { name: t(`items.${key}`) })}</span><Input className="w-24 font-mono" type="number" min="0.01" max="100" step="0.01" value={m.weights[key]} disabled={!m.selected[key] || !!m.pending} onChange={(event) => m.setWeights((current) => ({ ...current, [key]: event.target.value }))} /><span aria-hidden className="text-sm">%</span></label></div>)}</div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><p className="text-sm">{t("attendanceFormula")}</p>{downloadButton("summary", !m.validWeights)}</div>
        {!m.validWeights && <p role="status" className="mt-3 text-sm text-destructive">{t("invalidWeights")}</p>}
      </section>
      <GradeRecords accessToken={accessToken} classroomID={m.classroomID} options={m.summaryOptions} disabled={disabled || !m.validWeights || (m.selected.ai_activity && !m.validAIDates) || (m.selected.performance && (m.recordsLoading || !!m.recordsError))} />
      <section aria-labelledby="export-reports" className="space-y-5 border-t border-border py-7"><div className="flex flex-wrap items-center justify-between gap-4"><h2 id="export-reports" className="font-display text-2xl font-normal">{t("items.reports")}</h2>{downloadButton("reports", !m.validTemplate)}</div>
        <label className="grid gap-2 text-sm"><span>{t("course")}</span><select className="h-9 w-full rounded-md border border-input bg-background px-3" value={m.courseID} disabled={!!m.pending} onChange={(event) => m.setCourseID(event.target.value)}>{REPORT_COURSES.map((item) => <option key={item.id} value={item.id}>{t(`courses.${item.id}`)}</option>)}</select></label>
        <label className="grid gap-2 text-sm"><span>{t("filename")}</span><Input value={m.template} maxLength={120} disabled={!!m.pending} onChange={(event) => m.setTemplate(event.target.value)} /></label>
        <div role="group" className="flex flex-wrap gap-2" aria-label={t("tokens")}>{["班级", "学号", "姓名", "实验", "日期"].map((token) => <Button key={token} variant="ghost" size="sm" disabled={!!m.pending} onClick={() => m.setTemplate((value) => `${value}{${token}}`)}>{`{${token}}`}</Button>)}</div>
        <dl className="grid gap-2 text-sm"><dt>{t("preview")}</dt><dd className="break-all border-l-2 border-primary pl-4 font-mono">{m.preview}</dd></dl>
        {!m.validTemplate && <p role="status" className="text-sm text-destructive">{t("invalidTemplate")}</p>}
      </section>
    </div></div>
  </main>;
}
