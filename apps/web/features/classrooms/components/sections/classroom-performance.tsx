"use client";

import { useState } from "react";
import { Download, Info, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useClassroomPerformance } from "@/features/classrooms/hooks/use-classroom-performance";
import { PerformanceEvidenceView } from "@/features/classrooms/components/shared/performance-evidence";
import type { PerformanceStudent } from "@/shared/api/classroom-performance";

const score = (value?: number | null) => value == null ? "—" : value.toFixed(1);

export function ClassroomPerformance({ accessToken, classroomID }: { accessToken: string; classroomID: string }) {
  const t = useTranslations("classrooms.performance");
  const phases = useTranslations("classrooms.activities.phase");
  const m = useClassroomPerformance(accessToken, classroomID);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [student, setStudent] = useState<PerformanceStudent>();
  const [override, setOverride] = useState("");
  const [reason, setReason] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [title, setTitle] = useState("");
  const invalidDates = !!start && !!end && start > end;
  const apply = () => {
    if (invalidDates) return;
    setSelected([]);
    m.setOptions({ quizIds: [], startAt: start ? new Date(`${start}T00:00:00+08:00`).toISOString() : null, endAt: end ? new Date(new Date(`${end}T00:00:00+08:00`).getTime() + 86400000).toISOString() : null });
  };
  const openStudent = (row: PerformanceStudent) => { setStudent(row); setOverride(m.corrections[row.studentId]?.score.toString() ?? ""); setReason(m.corrections[row.studentId]?.reason ?? ""); };
  const invalidCorrection = override !== "" && (!Number.isFinite(Number(override)) || Number(override) < 0 || Number(override) > 100 || !reason.trim());
  const saveCorrection = () => {
    if (!student || invalidCorrection) return;
    m.setCorrections((current) => {
      const next = { ...current };
      if (override === "") delete next[student.studentId];
      else next[student.studentId] = { studentId: student.studentId, score: Number(override), reason: reason.trim() };
      return next;
    });
    setStudent(undefined);
  };
  const bins = [0, 60, 70, 80, 90].map((min, i, bounds) => ({ min, max: bounds[i+1] ?? 101, count: (m.report?.students ?? []).filter((row) => { const v = m.corrections[row.studentId]?.score ?? row.final; return v != null && v >= min && v < (bounds[i+1] ?? 101); }).length }));
  return <section className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
      <h2 className="font-display text-2xl font-normal">{t("title")}</h2>
      <div className="flex flex-wrap gap-2">
        <Dialog><DialogTrigger asChild><Button variant="ghost"><Info aria-hidden className="size-4" />{t("rules")}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{t("rules")}</DialogTitle><DialogDescription>{t("formula")}</DialogDescription></DialogHeader><div className="space-y-4 text-sm leading-relaxed">{["stages", "growth", "conversion", "missing"].map((key) => <p key={key}>{t(`rulesText.${key}`)}</p>)}</div></DialogContent></Dialog>
        <Button variant="outline" disabled={m.pending} onClick={m.refresh} aria-label={t("refresh")}><RefreshCw aria-hidden className="size-4" /></Button>
      </div>
    </div>
    <div className="my-5 flex flex-wrap items-end gap-3">
      <label className="grid min-w-0 flex-1 gap-2 text-sm"><span>{t("record")}</span><select className="h-9 min-w-0 rounded-md border border-input bg-background px-3" value={m.recordID} disabled={m.pending} onChange={(e) => { setStudent(undefined); m.setRecordID(e.target.value); }}><option value="">{t("live")}</option>{m.records.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
      {m.recordID ? <Button variant="outline" disabled={m.pending || !m.report} onClick={() => void m.download(t("title"))}><Download aria-hidden className="size-4" />{t("export")}</Button> : <Button disabled={!m.report?.activities.length || m.pending} onClick={() => setSaveOpen(true)}>{t("finalize")}</Button>}
    </div>
    {!m.recordID && <div className="mb-5 flex flex-wrap items-end gap-3">
      <label className="grid gap-2 text-sm"><span>{t("start")}</span><Input type="date" value={start} disabled={m.pending} onChange={(e) => setStart(e.target.value)} /></label>
      <label className="grid gap-2 text-sm"><span>{t("end")}</span><Input type="date" value={end} disabled={m.pending} onChange={(e) => setEnd(e.target.value)} /></label>
      <Button variant="outline" disabled={m.pending || invalidDates} onClick={apply}>{t("apply")}</Button>
      {invalidDates && <p role="alert" className="text-sm text-destructive">{t("invalidDates")}</p>}
    </div>}
    {!m.recordID && m.activities.length > 0 && <details className="mb-5 border-b border-border pb-4"><summary className="cursor-pointer text-sm">{t("activities")}</summary><div className="my-4 grid gap-3">{m.activities.map((a) => <label key={a.id} className="flex items-center gap-3 text-sm"><input type="checkbox" className="size-4 accent-primary" disabled={m.pending} checked={selected.includes(a.id)} onChange={(e) => setSelected((ids) => e.target.checked ? [...ids, a.id] : ids.filter((id) => id !== a.id))} />{a.title} · {phases(a.phase)}{a.sourceQuizId ? ` · ${t("retest")}` : ""}</label>)}</div><Button variant="outline" disabled={m.pending} onClick={() => m.setOptions((current) => ({ ...current, quizIds: selected }))}>{selected.length ? t("applySelected", { count: selected.length }) : t("allActivities")}</Button></details>}
    {m.error && <p role="alert" className="my-4 text-sm text-destructive">{m.error}</p>}
    {!m.report && !m.error && <Spinner className="size-5" />}
    {m.report && <>
      {m.recordID && <details className="mb-5 border-b border-border pb-4"><summary className="cursor-pointer text-sm">{t("includedActivities", { count: m.report.activities.length })}</summary><ul className="mt-4 space-y-3 text-sm">{m.report.activities.map((a) => <li key={a.id}>{a.title} · {phases(a.phase)} · {new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai" }).format(new Date(a.closedAt))}{a.sourceQuizId ? ` · ${t("retest")}` : ""}</li>)}</ul></details>}
      <p role="status" className="mb-5 text-sm">{t(`conversion.${m.report.conversion}`, { count: m.report.eligible })}</p>
      <figure className="mb-6"><figcaption className="mb-3 font-display text-xl">{t("distribution")}</figcaption><div className="grid grid-cols-5 gap-2">{bins.map((b) => <div key={b.min} className="min-w-0 text-center"><div className="flex h-20 items-end justify-center border-b border-border"><div className="w-3/4 bg-primary/75" style={{ height: `${b.count / Math.max(1, ...bins.map((x) => x.count))*100}%` }} /></div><p className="mt-2 font-mono text-xs">{b.min}–{b.max === 101 ? "100" : `<${b.max}`}</p><p className="text-sm">{t("people", { count: b.count })}</p></div>)}</div></figure>
      <div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-left text-sm"><thead className="border-b border-border text-xs"><tr>{["student", "pre_class", "in_class", "after_class", "growth", "weeks", "raw", "rank", "converted", "final", "status"].map((key) => <th key={key} className="px-3 py-3 font-medium">{t(`columns.${key}`)}</th>)}</tr></thead><tbody>{m.report.students.map((row) => <tr key={row.studentId} className="border-b border-border"><td className="px-3 py-3"><Button variant="link" className="px-0" onClick={() => openStudent(row)}>{row.name}</Button><div className="font-mono text-xs">{row.username}</div></td>{row.stages.map((s) => <td key={s.phase} className="px-3 py-3 font-mono">{s.expected ? `${score(s.quality)} · ${s.completed}/${s.expected}` : "—"}</td>)}<td className="px-3 py-3 font-mono">{score(row.growth)}</td><td className="px-3 py-3 font-mono">{row.activeWeeks}/{row.expectedWeeks}</td><td className="px-3 py-3 font-mono">{score(row.raw)}</td><td className="px-3 py-3 font-mono">{score(row.rank)}</td><td className="px-3 py-3 font-mono">{score(row.converted)}</td><td className="px-3 py-3 font-mono font-semibold">{score(m.corrections[row.studentId]?.score ?? row.final)}</td><td className="px-3 py-3">{t(`status.${row.status}`)}{(m.corrections[row.studentId] || row.reason) && ` · ${t("corrected")}`}</td></tr>)}</tbody></table></div>
      {!m.report.activities.length && <p className="py-8 text-sm">{t("noActivities")}</p>}
    </>}
    <Dialog open={!!student} onOpenChange={(open) => { if (!open) setStudent(undefined); }}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{student?.name}</DialogTitle><DialogDescription>{student?.username}</DialogDescription></DialogHeader>{student && <><PerformanceEvidenceView student={student} />{!m.recordID && student.final != null && <div className="space-y-4 border-t border-border pt-4"><label className="grid gap-2 text-sm"><span>{t("override")}</span><Input type="number" min="0" max="100" step="0.1" value={override} disabled={m.pending} onChange={(e) => setOverride(e.target.value)} /></label><label className="grid gap-2 text-sm"><span>{t("reason")}</span><Input maxLength={500} value={reason} disabled={m.pending} onChange={(e) => setReason(e.target.value)} /></label><Button disabled={invalidCorrection || m.pending} onClick={saveCorrection}>{t("applyCorrection")}</Button></div>}</>}</DialogContent></Dialog>
    <Dialog open={saveOpen} onOpenChange={setSaveOpen}><DialogContent><DialogHeader><DialogTitle>{t("finalize")}</DialogTitle><DialogDescription>{t("finalizeEffect")}</DialogDescription></DialogHeader><label className="grid gap-2 text-sm"><span>{t("recordTitle")}</span><Input value={title} maxLength={120} disabled={m.pending} onChange={(e) => setTitle(e.target.value)} /></label>{m.error && <p role="alert" className="text-sm text-destructive">{m.error}</p>}<Button disabled={m.pending || !title.trim() || !m.report} onClick={() => void m.save(title).then((saved) => { if (saved) setSaveOpen(false); })}>{m.pending ? <Spinner className="size-4" /> : null}{t("confirmFinalize")}</Button></DialogContent></Dialog>
  </section>;
}
