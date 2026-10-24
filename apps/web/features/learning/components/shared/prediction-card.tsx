"use client";

import { Check, CheckCircle2, ClipboardCheck, Copy, RotateCcw, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type PredictionOption = {
  id: string;
  label: string;
};

export type PredictionResult = {
  correct: boolean;
  code: string;
} | null;

export function PredictionCard({
  question,
  options,
  selected,
  onSelect,
  reason,
  onReason,
  onSubmit,
  onRetry,
  result,
  record,
  minReasonLength = 20,
  className,
}: {
  question: string;
  options: readonly PredictionOption[];
  selected: string | null;
  onSelect: (id: string) => void;
  reason: string;
  onReason: (value: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
  result: PredictionResult;
  record: string;
  minReasonLength?: number;
  className?: string;
}) {
  const t = useTranslations("learningLabs.prediction");
  const [copied, setCopied] = React.useState(false);
  const reasonLength = reason.trim().length;
  const ready = selected !== null && reasonLength >= minReasonLength;

  async function copyRecord() {
    try {
      await navigator.clipboard.writeText(record);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className={cn("rounded-xl border border-border/60 bg-card p-4 text-card-foreground shadow-sm", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[13px] font-medium text-foreground">{t("title")}</h2>
        <Badge variant="outline" className="rounded-md px-1.5 text-[10px] font-normal">
          {t("predictFirst")}
        </Badge>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("description")}</p>

      <p className="mt-4 text-sm font-medium leading-6 text-foreground">{question}</p>
      <div role="group" aria-label={t("optionsLabel")} className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const active = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(option.id)}
              className={cn(
                "flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs leading-5 transition-colors",
                active
                  ? "border-primary/50 bg-primary/8 text-foreground"
                  : "border-border/60 bg-muted/15 text-muted-foreground hover:border-border hover:bg-muted/30",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {active ? <Check className="size-2.5" strokeWidth={2.4} /> : null}
              </span>
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="prediction-reason" className="text-xs text-muted-foreground">
            {t("reasonLabel")}
          </label>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            {reasonLength}/{minReasonLength}
          </span>
        </div>
        <Textarea
          id="prediction-reason"
          value={reason}
          maxLength={400}
          onChange={(event) => onReason(event.target.value)}
          placeholder={t("reasonPlaceholder")}
          className="min-h-20"
        />
        <p className="text-[11px] leading-5 text-muted-foreground">{t("reasonHint", { count: minReasonLength })}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={!ready} onClick={onSubmit}>
          <ClipboardCheck className="size-3.5" strokeWidth={1.8} />
          {t("submit")}
        </Button>
        {result ? (
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            <RotateCcw className="size-3.5" strokeWidth={1.8} />
            {t("retry")}
          </Button>
        ) : null}
        <span className="text-[10px] text-muted-foreground">{t("noPenalty")}</span>
      </div>

      {result ? (
        <div
          className={cn(
            "mt-4 rounded-lg border px-3 py-3",
            result.correct ? "border-emerald-500/30 bg-emerald-500/8" : "border-destructive/30 bg-destructive/5",
          )}
        >
          <div className="flex items-start gap-2">
            {result.correct ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" strokeWidth={1.8} />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" strokeWidth={1.8} />
            )}
            <div className="min-w-0 flex-1">
              <p className={cn("text-xs font-medium", result.correct ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>
                {result.correct ? t("correct") : t("incorrect")}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                {result.correct ? t("correctHint") : t("incorrectHint")}
              </p>
              {result.correct ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{t("codeLabel")}</span>
                  <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                    {result.code}
                  </code>
                  <Button type="button" size="xs" variant="outline" onClick={() => { void copyRecord(); }}>
                    {copied ? <Check className="size-3" strokeWidth={2} /> : <Copy className="size-3" strokeWidth={1.8} />}
                    {copied ? t("copied") : t("copyRecord")}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
