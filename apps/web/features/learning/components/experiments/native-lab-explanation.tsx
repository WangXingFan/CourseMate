"use client";

import { useTranslations } from "next-intl";

export function NativeLabExplanation({ taskID }: { taskID: string }) {
  const t = useTranslations("learning.virtualLab.flow");

  return <details open className="rounded-lg border border-border/60 bg-card" data-lab-explanation>
    <summary className="cursor-pointer px-5 py-4 font-display text-lg">{t("explanation.title")}</summary>
    <dl className="space-y-4 border-t border-border/60 px-5 py-5 text-base leading-7">
      <div><dt className="text-sm font-medium text-muted-foreground">{t("explanation.what")}</dt><dd className="mt-1">{t(`tasks.${taskID}.explanation.what`)}</dd></div>
      <div><dt className="text-sm font-medium text-muted-foreground">{t("explanation.how")}</dt><dd className="mt-1">{t(`tasks.${taskID}.explanation.how`)}</dd></div>
      <div><dt className="text-sm font-medium text-muted-foreground">{t("explanation.takeaway")}</dt><dd className="mt-1">{t(`tasks.${taskID}.explanation.takeaway`)}</dd></div>
    </dl>
  </details>;
}
