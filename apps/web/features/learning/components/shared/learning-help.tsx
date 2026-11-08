"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLearningHelp } from "@/features/learning/hooks/use-learning-help";

export function LearningHelp({ title, context, returnHref }: { title: string; context: string; returnHref: string }) {
  const questionID = useId();
  const t = useTranslations("learning.continuity");
  const [opened, setOpened] = useState(false);
  const [question, setQuestion] = useState("");
  const model = useLearningHelp(title, context, returnHref);
  return <>
    <Button variant="outline" onClick={() => setOpened(true)}><MessageCircle className="size-4" strokeWidth={1.6} aria-hidden />{t("ask")}</Button>
    <Dialog open={opened} onOpenChange={setOpened}><DialogContent aria-describedby={undefined} className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      <div className="flex flex-wrap gap-2">{["explain", "checkThinking", "explainPlot"].map((key) => <Button key={key} variant="outline" onClick={() => setQuestion(t(key))}>{t(key)}</Button>)}</div>
      <label htmlFor={questionID} className="grid gap-2 text-sm">{t("question")}<Textarea id={questionID} maxLength={2000} value={question} onChange={(e) => setQuestion(e.target.value)} /></label>
      <details className="text-sm"><summary className="cursor-pointer">{t("includedContext")}</summary><pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap font-sans leading-7">{context.slice(0, 16000)}</pre></details>
      {model.error && <p role="alert" className="text-sm text-destructive">{model.error}</p>}
      <Button disabled={!question.trim()} onClick={() => model.open(question)}>{t("continueChat")}</Button>
    </DialogContent></Dialog>
  </>;
}
