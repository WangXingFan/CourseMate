"use client";

import { Download, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useExportGradeRecords } from "@/features/exports/hooks/use-export-grade-records";
import type { ClassroomExportRequest } from "@/shared/api/exports";

export function GradeRecords({ accessToken, classroomID, options, disabled }: { accessToken: string; classroomID: string; options: ClassroomExportRequest; disabled: boolean }) {
  const t = useTranslations("classrooms.gradeRecords");
  const exportsT = useTranslations("classrooms.exports");
  const locale = useLocale();
  const m = useExportGradeRecords(accessToken, classroomID, options);
  const keys = m.view ? Object.keys(m.view.report.weights) : [];
  return <section aria-labelledby="grade-records" className="space-y-5 border-t border-border pt-7">
    <div className="flex flex-wrap items-center justify-between gap-4"><h2 id="grade-records" className="font-display text-2xl font-normal">{t("title")}</h2><Button disabled={disabled || m.busy || !classroomID || options.includeOngoing} onClick={() => void m.preview()}>{t("preview")}</Button></div>
    {options.includeOngoing && <p role="status" className="text-sm">{t("ongoing")}</p>}
    {m.error && !m.view && <p role="alert" className="text-sm text-destructive">{m.error}</p>}
    {m.message && <p role="status" className="text-sm">{m.message}</p>}
    <div className="flex items-center justify-between gap-4"><h3 className="font-display text-xl font-normal">{t("history")}</h3><Button variant="ghost" disabled={m.loading || m.busy || !classroomID} onClick={m.refresh}><RefreshCw className="size-4" strokeWidth={1.6} aria-hidden />{t("refresh")}</Button></div>
    {m.loading ? <p role="status" className="text-sm">{t("loading")}</p> : !m.records.length && <p className="text-sm">{t("empty")}</p>}
    <div className="divide-y divide-border">{m.records.map((record) => <div key={record.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div className="min-w-0"><button type="button" disabled={m.busy} onClick={() => void m.read(record)} className="break-words text-left font-display text-xl font-normal underline-offset-4 hover:underline">{record.title}</button><p className="mt-2 text-xs">{new Date(record.createdAt).toLocaleString(locale)}</p></div><Button variant="outline" disabled={m.busy} onClick={() => void m.download(record)}><Download className="size-4" strokeWidth={1.6} aria-hidden />{t("download")}</Button></div>)}</div>
    <Dialog open={!!m.view} onOpenChange={(open) => { if (!open) m.close(); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>{m.view?.record?.title ?? t("preview")}</DialogTitle><DialogDescription>{m.view?.record ? m.view.report.classroomName : t("confirmation")}</DialogDescription></DialogHeader>
      {m.view && <>
        <p className="text-sm">{m.view.report.classroomName} · {new Date(m.view.report.generatedAt).toLocaleString(locale)}</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border"><th className="px-3 py-3 font-medium">{t("student")}</th>{keys.map((key) => <th key={key} className="whitespace-nowrap px-3 py-3 font-medium">{exportsT(`items.${key}`)} {m.view?.report.weights[key]}%</th>)}<th className="px-3 py-3 font-medium">{t("final")}</th></tr></thead><tbody>{m.view.report.students.map((student) => <tr key={student.studentId} className="border-b border-border"><td className="px-3 py-3"><span>{student.name}</span><span className="mt-1 block font-mono text-xs">{student.username}</span></td>{keys.map((key) => <td key={key} className="px-3 py-3 font-mono">{student.components.find((item) => item.kind === key)?.score ?? "—"}</td>)}<td className="px-3 py-3 font-mono">{student.final ?? t("noData")}</td></tr>)}</tbody></table></div>
        {!m.view.record && <label className="grid gap-2 text-sm"><span>{t("recordTitle")}</span><Input value={m.title} maxLength={120} disabled={m.busy} onChange={(event) => m.setTitle(event.target.value)} /></label>}
        {m.error && <p role="alert" className="text-sm text-destructive">{m.error}</p>}
        <DialogFooter><Button variant="outline" disabled={m.busy} onClick={m.close}>{t("close")}</Button>{m.view.record ? <Button disabled={m.busy} onClick={() => { if (m.view?.record) void m.download(m.view.record); }}>{t("download")}</Button> : <><Button variant="outline" disabled={m.busy} onClick={() => void m.preview()}>{t("refreshPreview")}</Button><Button disabled={m.busy || !m.title.trim() || !m.view.report.students.some((student) => student.final != null)} onClick={() => void m.finalize()}>{t("finalize")}</Button></>}</DialogFooter>
      </>}
    </DialogContent></Dialog>
  </section>;
}
