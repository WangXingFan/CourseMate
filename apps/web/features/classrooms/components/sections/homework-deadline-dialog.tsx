"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type HomeworkDeadlineTarget = { id: string; title: string; deadline: string; studentId: string; studentName?: string };

export function HomeworkDeadlineDialog({ target, pending, onClose, onSave }: {
  target: HomeworkDeadlineTarget; pending: boolean; onClose: () => void;
  onSave: (id: string, deadline: string, reason: string, studentId: string) => Promise<boolean>;
}) {
  const reasonID = useId();
  const t = useTranslations("classrooms.homework");
  const [deadline, setDeadline] = useState(() => {
    const next = new Date(Math.max(Date.now(), Date.parse(target.deadline)) + 86_400_000);
    next.setMinutes(next.getMinutes() - next.getTimezoneOffset());
    return next.toISOString().slice(0, 16);
  });
  const [reason, setReason] = useState("");
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <DialogContent>
      <DialogHeader><DialogTitle>{t(target.studentId ? "allowMakeup" : "extendDeadline")}</DialogTitle><DialogDescription>{t(target.studentId ? "makeupEffect" : "extendEffect")}</DialogDescription></DialogHeader>
      <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void onSave(target.id, deadline, reason, target.studentId).then((saved) => { if (saved) onClose(); }); }}>
        <p className="font-display text-xl">{target.title}{target.studentName && ` 路 ${target.studentName}`}</p>
        <label className="grid gap-2 text-sm"><span>{t("newDeadline")}</span><Input type="datetime-local" required value={deadline} disabled={pending} onChange={(event) => setDeadline(event.target.value)} /></label>
        <label htmlFor={reasonID} className="grid gap-2 text-sm"><span>{t("changeReason")}</span><Textarea id={reasonID} required maxLength={500} value={reason} disabled={pending} onChange={(event) => setReason(event.target.value)} /></label>
        <div className="flex justify-end gap-3"><Button type="button" variant="ghost" disabled={pending} onClick={onClose}>{t("cancel")}</Button><Button type="submit" disabled={pending || !reason.trim() || !deadline}>{t("confirmChange")}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
