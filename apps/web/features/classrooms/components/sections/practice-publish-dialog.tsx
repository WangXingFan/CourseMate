"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { QuestionContent } from "@/shared/components/question-content";
import { useClassroomPracticePublish } from "@/features/classrooms/hooks/use-classroom-practice-publish";

export function PracticePublishDialog({ accessToken, classroomID, conceptID, title: initialTitle, students, onClose }: {
  accessToken: string; classroomID: string; conceptID: string; title: string;
  students: { id: string; name: string; username: string }[]; onClose: () => void;
}) {
  const t = useTranslations("classrooms.practice");
  const model = useClassroomPracticePublish(accessToken, classroomID, conceptID);
  const [title, setTitle] = useState(initialTitle);
  const [recipients, setRecipients] = useState(students.map((s) => s.id));
  const [deadline, setDeadline] = useState(() => { const d = new Date(Date.now() + 3 * 86_400_000); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); });
  return <Dialog open onOpenChange={(open) => { if (!open && !model.pending) onClose(); }}>
    <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-3xl">
      <DialogHeader><DialogTitle>{t("publishTitle")}</DialogTitle><DialogDescription>{t("publishEffect")}</DialogDescription></DialogHeader>
      <form className="flex min-h-0 flex-col gap-5" onSubmit={(event) => { event.preventDefault(); void model.publish(title, deadline, recipients).then((ok) => { if (ok) onClose(); }); }}>
        <div className="min-h-0 space-y-6 overflow-y-auto pr-1">
          <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm"><span>{t("name")}</span><Input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} disabled={model.pending} /></label><label className="grid gap-2 text-sm"><span>{t("deadline")}</span><Input required type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} disabled={model.pending} /></label></div>
          <fieldset disabled={model.pending} className="space-y-3"><legend className="mb-3 font-display text-xl">{t("recipients", { count: recipients.length })}</legend><div className="flex flex-wrap gap-x-6 gap-y-3">{students.map((s) => <label key={s.id} className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={recipients.includes(s.id)} onChange={(e) => setRecipients((current) => e.target.checked ? [...current, s.id] : current.filter((id) => id !== s.id))} />{s.name || s.username}</label>)}</div></fieldset>
          <fieldset disabled={model.pending} className="divide-y divide-border border-y border-border"><legend className="mb-3 font-display text-xl">{t("selectedQuestions", { count: model.selected.length })}</legend>
            {model.loading ? <Spinner /> : model.questions.map((q) => <label key={q.id} className="flex cursor-pointer items-start gap-3 py-4"><input type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" checked={model.selected.includes(q.id)} disabled={!model.selected.includes(q.id) && model.selected.length >= 5} onChange={(e) => model.setSelected((current) => e.target.checked ? [...current, q.id] : current.filter((id) => id !== q.id))} /><div className="min-w-0 space-y-2 text-sm"><QuestionContent content={q.prompt} />{q.options.map((option, i) => <div key={option} className="flex gap-2"><span className="font-mono">{String.fromCharCode(65 + i)}.</span><QuestionContent content={option} /></div>)}</div></label>)}
          </fieldset>
          {model.error && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{model.error}</p>{!model.questions.length && <Button type="button" variant="outline" onClick={model.retry}>{t("refresh")}</Button>}</div>}
        </div>
        <div className="flex shrink-0 justify-end gap-3"><Button type="button" variant="ghost" onClick={onClose} disabled={model.pending}>{t("cancel")}</Button><Button type="submit" disabled={model.pending || model.loading || model.selected.length < 3 || !recipients.length}>{model.pending && <Spinner />}{t("publish")}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
