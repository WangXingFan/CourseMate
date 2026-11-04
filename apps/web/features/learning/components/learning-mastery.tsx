"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { LessonShell } from "@/features/learning/components/shared/lesson-shell";
import { MasteryProfile } from "@/features/learning/components/mastery-profile";
import { useLearningMastery } from "@/features/learning/hooks/use-learning-mastery";

export function LearningMastery() {
  const t = useTranslations("learning.mastery");
  const model = useLearningMastery();
  return <LessonShell title={t("title")}>
    <div className="mb-6 flex flex-wrap justify-between gap-3">
      <Button asChild variant="outline"><Link href="/learn/progress">{t("history")}</Link></Button>
      <Button variant="ghost" onClick={model.refresh}>{t("refresh")}</Button>
    </div>
    {model.error ? <div role="alert" className="text-sm text-destructive">{model.error}<Button variant="ghost" onClick={model.refresh}>{t("retry")}</Button></div>
      : model.data ? <MasteryProfile profile={model.data} /> : <div role="status" className="flex items-center gap-2 text-sm"><Spinner />{t("loading")}</div>}
  </LessonShell>;
}
