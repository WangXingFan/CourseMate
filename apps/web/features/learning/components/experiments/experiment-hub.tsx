"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { VirtualLabCards } from "@/features/learning/components/experiments/virtual-lab-cards";
import { LessonShell } from "@/features/learning/components/shared/lesson-shell";
import { useAuthSession } from "@/shared/auth/auth-session-context";
import { TeacherExperiments } from "@/features/learning/components/experiments/teacher-experiments";

export function ExperimentHub() {
  const t = useTranslations("learning.virtualLab");
  const { user, accessToken } = useAuthSession();
  const teacher = !!user && ["teacher", "admin", "superadmin"].includes(user.role);
  return (
    <LessonShell title={t("title")}>
      {user?.role === "teacher" ? <TeacherExperiments key={user.publicID} accessToken={accessToken} /> : <><VirtualLabCards />
      {teacher && <div className="mt-5"><Button asChild size="sm" variant="outline"><Link href="/learn/experiments/guide">{t("guide")}</Link></Button></div>}</>}
    </LessonShell>
  );
}
