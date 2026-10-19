"use client";

import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLearningReview } from "@/features/learning/hooks/use-learning-review";

export function VariantReview({ variantId, onSaved, onClose }: { variantId: string; onSaved: () => void; onClose: () => void }) {
  const t = useTranslations("learningLabs.review");
  const format = useFormatter();
  const model = useLearningReview(variantId, onSaved);
  const attempt = model.result?.attempt;

  return <Dialog open onOpenChange={(open) => { if (!open && !model.saving) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg" onInteractOutside={(event) => { if (model.saving) event.preventDefault(); }}>
      <DialogHeader><DialogTitle>{t("title")}</DialogTitle><DialogDescription>{t("description")}</DialogDescription></DialogHeader>
      {model.loading ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />{t("loading")}</p> : null}
      {model.error ? <div role="alert" className="space-y-2"><p className="text-xs text-destructive">{model.error}</p>{!model.data ? <Button variant="outline" size="sm" onClick={model.reload}>{t("retry")}</Button> : null}</div> : null}
      {model.data ? <div className="space-y-4">
        <h3 className="text-sm font-medium leading-6">{model.data.prompt}</h3>
        <fieldset disabled={model.locked || Boolean(attempt)} className="space-y-2"><legend className="sr-only">{t("choose")}</legend>{model.data.options.map((option, index) => <label key={`${model.data?.id}:${index}`} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-sm leading-5 ${model.selected === index ? "border-primary bg-primary/5" : "border-border"}`}>
          <input type="radio" name="review-option" value={index} checked={model.selected === index} onChange={() => model.setSelected(index)} className="mt-0.5 accent-primary" />
          <span>{String.fromCharCode(65 + index)}. {option}</span>
        </label>)}</fieldset>
        {!attempt ? <Button disabled={model.selected === null || model.saving} onClick={() => void model.submit()}>{t(model.saving ? "saving" : model.locked ? "retrySubmission" : "submit")}</Button> : <div role="status" className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm leading-6">
          <p className="flex items-center gap-2 font-medium">{attempt.correct ? <CheckCircle2 className="size-4 text-emerald-600" /> : <XCircle className="size-4 text-destructive" />}{t(attempt.correct ? "correct" : "incorrect")}</p>
          <p>{t("answer", { answer: model.data.options[attempt.answer] ?? "—" })}</p>
          <p className="text-muted-foreground">{model.result?.explanation}</p>
          <p>{t("stage", { stage: attempt.reviewStage })}</p>
          <p>{attempt.nextReviewAt ? t("next", { date: format.dateTime(new Date(attempt.nextReviewAt), { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) }) : t("completed")}</p>
          <Button size="sm" variant="outline" onClick={onClose}>{t("close")}</Button>
        </div>}
      </div> : null}
    </DialogContent>
  </Dialog>;
}
