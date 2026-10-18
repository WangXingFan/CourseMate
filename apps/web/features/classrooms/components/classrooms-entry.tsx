"use client";

import { useTranslations } from "next-intl";

import { CenteredEmptyState } from "@/components/ui/empty-state";
import { SpinnerLabel } from "@/components/ui/spinner";
import { AppClassrooms } from "@/features/classrooms/components/app-classrooms";
import { useAuthSession } from "@/shared/auth/auth-session-context";

export function ClassroomsEntry() {
  const t = useTranslations("classrooms");
  const { accessToken, user, userStatus } = useAuthSession();

  if (userStatus === "loading") {
    return (
      <main className="flex h-full min-h-0 w-full flex-1 items-center justify-center text-muted-foreground">
        <SpinnerLabel>{t("loading")}</SpinnerLabel>
      </main>
    );
  }

  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  if (!isTeacher && !isAdmin) {
    return (
      <main className="h-full min-h-0 w-full flex-1 bg-background">
        <CenteredEmptyState title={t("accessDeniedTitle")} description={t("accessDeniedDescription")} />
      </main>
    );
  }

  return <AppClassrooms accessToken={accessToken} canManage={isTeacher} />;
}
