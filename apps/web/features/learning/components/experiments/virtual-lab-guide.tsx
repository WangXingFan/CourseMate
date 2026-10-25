"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LessonShell } from "@/features/learning/components/shared/lesson-shell";
import { useLearningVirtualLabGuide } from "@/features/learning/hooks/use-learning-virtual-lab-guide";
import { NativeLabGuideDocument } from "./native-lab-guide-document";

export function VirtualLabGuide() {
  const t = useTranslations("learning.virtualLab");
  const { allowed, state, retry } = useLearningVirtualLabGuide();
  return (
    <LessonShell title={t("guide")} className="max-w-6xl">
      {!allowed ? <p className="text-sm">{t("teacherOnly")}</p> : state?.failed ? (
        <div><p className="mb-3 text-sm">{t("loadFailed")}</p><Button onClick={retry}>{t("retry")}</Button></div>
      ) : state?.html ? (
        <NativeLabGuideDocument key={state.token} html={state.html} />
      ) : <p className="text-sm">{t("status.loading")}</p>}
    </LessonShell>
  );
}
