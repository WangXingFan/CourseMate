"use client";

import { BookOpen, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { QuestionBankItem } from "@/shared/api/question-bank";
import { QuestionContent } from "@/shared/components/question-content";
import { cn } from "@/lib/utils";

function QuestionText({ text }: { text: string }) {
  return <QuestionContent content={text} className="text-inherit leading-[inherit]" />;
}

export function QuestionBankQuestion({ question, number, initiallyOpen }: { question: QuestionBankItem; number: number; initiallyOpen: boolean }) {
  const t = useTranslations("learningLabs.questionBank");
  const [open, setOpen] = useState(initiallyOpen);
  const courseFormula = ["preview", "in_class", "after_class", "preview_retest", "in_class_retest"].includes(question.category);
  const detailID = `bank-answer-${question.id}`;
  return <article data-question-id={question.id} lang={question.language} className="min-w-0 space-y-4 py-7 [&_[data-streamdown=image-wrapper]>span]:static [&_[data-streamdown=image-wrapper]>span]:mt-2 [&_img]:max-h-64 [&_img]:w-auto">
    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
      <span className="font-mono tabular-nums">{String(number).padStart(3, "0")}</span>
      <Badge variant="outline">{t(`categories.${question.category}`)}</Badge>
      <span>{question.title}</span>
    </div>
    <div className="min-w-0 break-words font-display text-xl font-normal leading-8"><QuestionText text={question.prompt} /></div>
    {question.formula && <div className="min-w-0 overflow-x-auto border-l-2 border-seal pl-4 text-base leading-7"><QuestionText text={courseFormula ? `$$${question.formula}$$` : question.formula} /></div>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="ghost" size="sm" aria-expanded={open} aria-controls={detailID} onClick={() => setOpen(!open)}>{open ? t("hideAnswer") : t("showAnswer")}<ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden /></Button>
      {question.lessonUrl && <Link href={question.lessonUrl} className="inline-flex items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><BookOpen className="size-4" strokeWidth={1.6} aria-hidden />{t("handout")}</Link>}
    </div>
    {open && <div id={detailID} className="space-y-6 rounded-lg border border-border bg-card p-4 md:p-5">
      {question.parts.map((part, index) => <section key={`${question.id}-${index}`} className="min-w-0 space-y-3">
        {part.label && <h3 className="font-display text-lg font-normal"><QuestionText text={part.label} /></h3>}
        {part.options.length > 0 && <ol className="grid gap-2 sm:grid-cols-2">
          {part.options.map((option, optionIndex) => {
            const letter = String.fromCharCode(65+optionIndex);
            return <li key={letter} className={cn("flex min-w-0 gap-3 rounded-md border p-3 text-base leading-7", part.answers.includes(letter) ? "border-primary bg-accent" : "border-border")}><span className="font-mono text-sm">{letter}.</span><div className="min-w-0 flex-1 break-words"><QuestionText text={option} /></div></li>;
          })}
        </ol>}
        <div className="min-w-0 border-l-2 border-primary pl-3 text-base leading-7"><span className="mr-2 font-medium">{t("answer")}</span><QuestionText text={part.answers.join(" / ")} /></div>
        {part.explanation && <div className="space-y-1 text-sm leading-7"><h4 className="font-medium">{t("explanation")}</h4><QuestionText text={part.explanation} /></div>}
      </section>)}
      {question.explanation && <div className="border-t border-border pt-4 text-sm leading-7"><h3 className="mb-2 font-medium">{t("explanation")}</h3><QuestionText text={question.explanation} /></div>}
    </div>}
  </article>;
}
