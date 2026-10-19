"use client";

import { BookOpen, Lightbulb, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLearningTutor } from "@/features/learning/hooks/use-learning-tutor";
import type { LearningTutorPayload } from "@/shared/api/learning-types";

type ExperimentTutorProps = {
  seed: string;
  experimentId: "signal-basics" | "time-domain" | "frequency-domain" | "s-domain";
  action: "hint" | "explain";
  parameters: LearningTutorPayload["parameters"];
  plotSummary: string;
  selected: string | null;
  reason: string;
  correct: boolean;
};

export function ExperimentTutor({ seed, selected, ...input }: ExperimentTutorProps) {
  const t = useTranslations("learningLabs.tutor");
  const model = useLearningTutor(seed, { ...input, selected: selected ?? "" });
  return (
    <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4" aria-label={t("title")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium"><Lightbulb className="size-4 text-amber-600" />{t("title")}</div>
        <Button size="sm" variant="outline" onClick={() => void model.request()} disabled={model.loading}>
          {model.loading ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
          {t(model.loading ? "loading" : model.error ? "retry" : input.action)}
        </Button>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{t(input.action === "hint" ? "hintDescription" : "explainDescription")}</p>
      <div aria-live="polite" aria-busy={model.loading}>
        {model.error ? <p role="alert" className="mt-3 text-xs text-destructive">{model.error}</p> : null}
        {model.data ? <div className="mt-4 space-y-3 text-xs leading-6">
          <Badge variant="secondary">{t(model.data.source === "model" ? "model" : "curated")}</Badge>
          <p className="whitespace-pre-wrap">{model.data.summary}</p>
          <ol className="list-decimal space-y-1 pl-5">{model.data.steps.map((step, index) => <li key={`${index}:${step}`}>{step}</li>)}</ol>
          <div className="flex flex-wrap gap-3">{model.data.citations.map((citation) => <Link key={citation.id} href={citation.href} className="inline-flex items-center gap-1 text-primary underline underline-offset-4"><BookOpen className="size-3" />{citation.chapter} · {citation.section}</Link>)}</div>
        </div> : null}
      </div>
    </section>
  );
}
