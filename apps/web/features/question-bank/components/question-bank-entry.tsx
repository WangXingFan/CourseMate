"use client";

import { useTranslations } from "next-intl";
import { CenteredEmptyState } from "@/components/ui/empty-state";
import { SpinnerLabel } from "@/components/ui/spinner";
import { useAuthSession } from "@/shared/auth/auth-session-context";
import { QuestionBankContent } from "./question-bank-content";

export function QuestionBankEntry({ embedded = false }: { embedded?: boolean }) {
  const t = useTranslations("learningLabs.questionBank");
  const { user, userStatus, accessToken } = useAuthSession();
  if (userStatus === "loading") return <div className="flex flex-1 items-center justify-center p-10"><SpinnerLabel>{t("loading")}</SpinnerLabel></div>;
  if (!user || !["teacher", "admin", "superadmin"].includes(user.role)) return <CenteredEmptyState title={t("accessDenied")} />;
  return <QuestionBankContent key={user.publicID} accessToken={accessToken} embedded={embedded} />;
}
