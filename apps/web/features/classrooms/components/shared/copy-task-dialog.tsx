"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useClassroomCopyTask } from "@/features/classrooms/hooks/use-classroom-copy-task";

export function CopyTaskDialog({ accessToken, quiz, onClose }: { accessToken: string; quiz: { id: string; title: string; purpose?: string }; onClose: () => void }) {
  const t = useTranslations("classrooms.continuity");
  const m = useClassroomCopyTask(accessToken, quiz.id);
  const [title, setTitle] = useState(quiz.title);
  const [saved, setSaved] = useState(false);
  return <Dialog open onOpenChange={(open) => { if (!open && !m.pending) onClose(); }}><DialogContent aria-describedby={undefined} className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{t("copyTask")}</DialogTitle></DialogHeader>{saved ? <p role="status">{t("copySaved")}</p> : <div className="space-y-5"><label className="grid gap-2 text-sm">{t("taskTitle")}<Input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} /></label><label className="grid gap-2 text-sm">{t("targetClass")}<select className="h-9 rounded-md border border-input bg-background px-3" value={m.target} onChange={(e) => m.setTarget(e.target.value)}><option value="">{t("selectClass")}</option>{m.classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{quiz.purpose === "remediation" && <fieldset className="space-y-3"><legend>{t("recipients", { count: m.selected.length })}</legend>{m.students.map((student) => <label key={student.id} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={m.selected.includes(student.id)} onChange={(e) => m.setSelected((ids) => e.target.checked ? [...ids, student.id] : ids.filter((id) => id !== student.id))} />{student.displayName || student.username}</label>)}</fieldset>}{m.error && <p role="alert" className="text-sm text-destructive">{m.error}</p>}<Button disabled={m.pending || !m.target || !title.trim() || quiz.purpose === "remediation" && !m.selected.length} onClick={() => void m.copy(title).then((ok) => setSaved(ok))}>{t("copyDraft")}</Button></div>}</DialogContent></Dialog>;
}
