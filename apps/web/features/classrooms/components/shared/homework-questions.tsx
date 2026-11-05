"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { HomeworkQuestionResponse, HomeworkSubmissionResponse } from "@/shared/api/homeworks";
import { StreamdownRender } from "@/shared/components/markdown/streamdown-render";

export function HomeworkQuestions({ questions, answers, disabled = false, showKey = false, submission, onAnswer }: {
  questions: HomeworkQuestionResponse[];
  answers?: string[][];
  disabled?: boolean;
  showKey?: boolean;
  submission?: HomeworkSubmissionResponse | null;
  onAnswer?: (question: number, blank: number, value: string) => void;
}) {
  const t = useTranslations("classrooms.homework");
  return <div className="divide-y divide-border [&_[data-streamdown=image-wrapper]>span]:static [&_[data-streamdown=image-wrapper]>span]:mt-2 [&_img]:rounded-lg" lang="zh-CN">
    {questions.map((question, index) => {
      const result = submission?.results.find((item) => item.questionId === question.id);
      return <fieldset key={question.id} disabled={disabled} className="min-w-0 space-y-4 py-6 first:pt-2">
        <legend className="sr-only">{t("question", { number: index + 1 })}</legend>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-mono tabular-nums">{String(index + 1).padStart(2, "0")}</span>
          <Badge variant="outline">{t(`kind.${question.kind}`)}</Badge>
          <span className="ml-auto font-mono">{result ? t("graded", { score: result.score, total: result.total }) : t("points", { points: question.points })}</span>
        </div>
        <div className="font-display text-lg font-normal leading-8 [&_img]:max-h-64 [&_img]:w-auto [&_img]:bg-white [&_img]:p-2"><StreamdownRender content={question.prompt} /></div>
        {question.kind === "blank" ? <div className="flex flex-wrap gap-4">
          {Array.from({ length: question.blankCount }, (_, blank) => <label key={blank} className="min-w-0 flex-1 space-y-2 text-sm">
            <span>{t("blank", { number: blank + 1 })}</span>
            <Input aria-label={t("answerLabel", { question: index + 1, blank: blank + 1 })} value={answers?.[index]?.[blank] ?? ""} maxLength={200} onChange={(event) => onAnswer?.(index, blank, event.target.value)} autoComplete="off" />
          </label>)}
        </div> : <div className="grid gap-3 sm:grid-cols-2">
          {question.options.map((option, optionIndex) => {
            const selected = answers?.[index]?.[0] === String(optionIndex);
            return <label key={optionIndex} className={cn("flex min-w-0 cursor-pointer items-start gap-3 rounded-md border p-3 text-base", selected ? "border-primary bg-accent shadow-[inset_2px_0_0_var(--primary)]" : "border-border", disabled && "cursor-default")}>
              <input className="mt-1.5 accent-primary" type="radio" name={question.id} checked={selected} onChange={() => onAnswer?.(index, 0, String(optionIndex))} />
              <span className="font-mono">{String.fromCharCode(65 + optionIndex)}.</span>
              <div className="min-w-0 flex-1 [&_img]:max-h-48 [&_img]:w-auto [&_img]:bg-white [&_img]:p-2"><StreamdownRender content={question.kind === "true_false" ? t(optionIndex === 0 ? "true" : "false") : option} /></div>
            </label>;
          })}
        </div>}
        {showKey && question.accepted && <div className="border-l-2 border-primary pl-3 text-sm"><span className="font-medium">{t("answerKey")}: </span>{question.kind === "blank" ? question.accepted.map((values) => values[0]).join("；") : String.fromCharCode(65 + Number(question.accepted[0]?.[0]))}</div>}
      </fieldset>;
    })}
  </div>;
}
