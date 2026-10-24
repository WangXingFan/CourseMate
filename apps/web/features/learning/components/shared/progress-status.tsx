"use client";

import { Check, LoaderCircle, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { useLearningProgress } from "@/features/learning/hooks/use-learning-progress";

export function ProgressStatus({ model }: { model: ReturnType<typeof useLearningProgress> }) {
  const t = useTranslations("learningLabs.progress");
  if (model.loadError) return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
      <span className="flex-1">{t("loadFailed")} {model.loadError}</span>
      <Button size="sm" variant="outline" onClick={model.refresh}><RefreshCw className="size-3.5" />{t("retry")}</Button>
    </div>
  );
  if (model.saveError) return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
      <span className="flex-1">{t("saveFailed", { count: model.pendingCount })} {model.saveError}</span>
      <Button size="sm" variant="outline" onClick={model.retrySave}><RefreshCw className="size-3.5" />{t("retrySave")}</Button>
    </div>
  );
  return (
    <p role="status" className="flex items-center gap-1.5 text-[11px] leading-5 text-muted-foreground">
      {model.loading || model.saving || model.pendingCount > 0
        ? <><LoaderCircle className="size-3 animate-spin" />{t(model.pendingCount > 0 ? "saving" : "loading")}</>
        : <><Check className="size-3" />{t("synced")}</>}
    </p>
  );
}
