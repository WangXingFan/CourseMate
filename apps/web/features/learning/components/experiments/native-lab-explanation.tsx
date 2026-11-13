"use client";

import { useTranslations } from "next-intl";

import { MathFormula } from "@/features/learning/components/shared/math-formula";

type ExplanationPart = { text: string } | { formula: string };

function explanationParts(value: unknown): ExplanationPart[] {
  if (typeof value === "string") return [{ text: value }];
  if (!Array.isArray(value)) return [];

  const parts: ExplanationPart[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    if ("text" in item && typeof item.text === "string") parts.push({ text: item.text });
    if ("formula" in item && typeof item.formula === "string") parts.push({ formula: item.formula });
  }
  return parts;
}

function ExplanationText({ value }: { value: unknown }) {
  return <>{explanationParts(value).map((part, index) => "formula" in part ? <MathFormula key={index}>{part.formula}</MathFormula> : <span key={index}>{part.text}</span>)}</>;
}

export function NativeLabExplanation({ taskID }: { taskID: string }) {
  const t = useTranslations("learning.virtualLab.flow");

  return <details open className="rounded-lg border border-border/60 bg-card" data-lab-explanation>
    <summary className="cursor-pointer px-5 py-4 font-display text-lg">{t("explanation.title")}</summary>
    <dl className="space-y-4 border-t border-border/60 px-5 py-5 text-base leading-7">
      <div><dt className="text-sm font-medium text-muted-foreground">{t("explanation.what")}</dt><dd className="mt-1"><ExplanationText value={t.raw(`tasks.${taskID}.explanation.what`)} /></dd></div>
      <div><dt className="text-sm font-medium text-muted-foreground">{t("explanation.how")}</dt><dd className="mt-1"><ExplanationText value={t.raw(`tasks.${taskID}.explanation.how`)} /></dd></div>
      <div><dt className="text-sm font-medium text-muted-foreground">{t("explanation.takeaway")}</dt><dd className="mt-1"><ExplanationText value={t.raw(`tasks.${taskID}.explanation.takeaway`)} /></dd></div>
    </dl>
  </details>;
}
