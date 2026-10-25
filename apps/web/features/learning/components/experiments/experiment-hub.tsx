"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { VirtualLabCards } from "@/features/learning/components/experiments/virtual-lab-cards";
import { LessonPanel, LessonShell } from "@/features/learning/components/shared/lesson-shell";
import { useAuthSession } from "@/shared/auth/auth-session-context";

export function ExperimentHub() {
  const t = useTranslations("learning.virtualLab");
  const { user } = useAuthSession();
  const teacher = !!user && ["teacher", "admin", "superadmin"].includes(user.role);
  return (
    <LessonShell title={t("title")}>
      <VirtualLabCards />
      <LessonPanel title={t("workflowTitle")} className="mt-4">

        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm"><Link href="/learn/experiments/workspace#home">{t("open")}</Link></Button>
          {teacher && <Button asChild size="sm" variant="outline"><Link href="/learn/experiments/guide">{t("guide")}</Link></Button>}
        </div>
      </LessonPanel>
    </LessonShell>
  );
}
