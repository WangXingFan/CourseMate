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
    <section className={cn("rounded-lg border border-border bg-card p-5 text-card-foreground md:p-6", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-medium text-foreground">{t("title")}</h2>
        <Badge variant="outline" className="border-seal/40 text-seal">
          {t("predictFirst")}
        </Badge>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("description")}</p>

      <p className="mt-5 font-display text-xl leading-snug text-foreground">{question}</p>
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
                "flex min-h-12 items-center gap-3 rounded-md border px-4 py-2.5 text-left text-sm leading-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
                active
                  ? "border-primary bg-accent text-foreground"
                  : "border-border bg-transparent text-foreground/80 hover:border-foreground/30 hover:bg-muted",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {active ? <Check className="size-3" strokeWidth={2.4} /> : null}
              </span>
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="prediction-reason" className="text-sm text-foreground/85">
            {t("reasonLabel")}
          </label>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {reasonLength}/{minReasonLength}
          </span>
        </div>
        <Textarea
          id="prediction-reason"
          value={reason}
          maxLength={400}
          onChange={(event) => onReason(event.target.value)}
          placeholder={t("reasonPlaceholder")}
          className="min-h-24"
        />
        <p className="text-xs leading-5 text-muted-foreground">{t("reasonHint", { count: minReasonLength })}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" disabled={!ready} onClick={onSubmit}>
          <ClipboardCheck className="size-3.5" strokeWidth={1.8} />
          {t("submit")}
        </Button>
        {result ? (
          <Button type="button" variant="outline" onClick={onRetry}>
            <RotateCcw className="size-3.5" strokeWidth={1.8} />
            {t("retry")}
          </Button>
        ) : null}
        <span className="text-xs text-muted-foreground">{t("noPenalty")}</span>
      </div>

      {result ? (
        <div
          className={cn(
            "mt-5 rounded-md border-l-2 px-4 py-3",
            result.correct ? "border-emerald-600 bg-emerald-500/8" : "border-destructive bg-destructive/5",
          )}
        >
          <div className="flex items-start gap-2">
            {result.correct ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" strokeWidth={1.8} />
            ) : (
              <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" strokeWidth={1.8} />
            )}
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-medium", result.correct ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>
                {result.correct ? t("correct") : t("incorrect")}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {result.correct ? t("correctHint") : t("incorrectHint")}
              </p>
              {result.correct ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">{t("codeLabel")}</span>
                  <code className="rounded bg-background px-1.5 py-0.5 font-mono text-xs text-foreground">
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
