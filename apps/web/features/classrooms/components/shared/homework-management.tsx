"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { HomeworkResponse, HomeworkSubmissionResponse } from "@/shared/api/homeworks";
import { useClassroomHomeworkManagement } from "@/features/classrooms/hooks/use-classroom-homework-management";

export function HomeworkManagement({ accessToken, item, submission, onSaved, onExtend }: { accessToken: string; item: HomeworkResponse; submission?: HomeworkSubmissionResponse; onSaved: () => void; onExtend?: () => void }) {
  const reasonID = useId();
  const t = useTranslations("classrooms.continuity");
  const [action, setAction] = useState<"extend" | "withdraw" | "release" | "correct" | null>(null);
  const [reason, setReason] = useState("");
  const [deadline, setDeadline] = useState("");
  const [score, setScore] = useState(String(submission?.score ?? 0));
  const model = useClassroomHomeworkManagement(accessToken, item.id, onSaved);
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2">
      {submission ? <Button variant="outline" onClick={() => { setScore(String(submission.score)); setReason(""); setAction("correct"); }}>{t("correct")}</Button> : item.status !== "withdrawn" && <>
        {!item.feedbackReleased && <Button variant="outline" onClick={onExtend ?? (() => { setReason(""); setAction("extend"); })}>{t("extend")}</Button>}
        {!item.submissionCount && !item.feedbackReleased && <Button variant="outline" onClick={() => { setReason(""); setAction("withdraw"); }}>{t("withdraw")}</Button>}
        {item.status === "closed" && Date.parse(item.endsAt) <= Date.now() && !item.feedbackReleased && <Button variant="outline" onClick={() => { setReason(""); setAction("release"); }}>{t("release")}</Button>}
        {item.feedbackReleased && <span className="py-2 text-sm">{t("released")}</span>}
      </>}
    </div>
    {submission?.corrections?.map((change) => <p key={change.at} className="border-l-2 border-primary pl-3 text-sm leading-7">{change.before} → {change.score} · {change.reason}</p>)}
    {!submission && !!item.changes?.length && <details className="text-sm leading-7"><summary className="cursor-pointer">{t("changes")}</summary>{item.changes.map((change) => <p key={change.at}>{t(change.action)} · {new Date(change.at).toLocaleString()} · {change.reason}</p>)}</details>}
    <Dialog open={!!action} onOpenChange={(open) => { if (!open && !model.pending) setAction(null); }}><DialogContent aria-describedby={undefined}><DialogHeader><DialogTitle>{action && t(action)}</DialogTitle></DialogHeader>
      <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); if (action) void model.save(action, reason, deadline, submission?.studentId ?? "", Number(score)).then((ok) => { if (ok) setAction(null); }); }}>
        {action === "extend" && <label className="grid gap-2 text-sm">{t("newDeadline")}<Input required type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>}
        {action === "correct" && <label className="grid gap-2 text-sm">{t("score")}<Input required type="number" min={0} max={item.total} step={1} value={score} onChange={(e) => setScore(e.target.value)} /></label>}
        <p className="text-sm leading-7">{action && t(`${action}Consequence`)}</p>
        <label htmlFor={reasonID} className="grid gap-2 text-sm">{t("reason")}<Textarea id={reasonID} required maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        {model.error && <p role="alert" className="text-sm text-destructive">{model.error}</p>}
        <Button type="submit" disabled={model.pending || !reason.trim()}>{t("confirm")}</Button>
      </form>
    </DialogContent></Dialog>
  </div>;
}
