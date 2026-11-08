"use client";

import { useTranslations } from "next-intl";

export function AIActivityBonusRules() {
  const t = useTranslations("classrooms.aiActivity");
  return <details className="text-sm leading-relaxed">
    <summary className="cursor-pointer py-2 font-medium">{t("bonusOptions")}</summary>
    <ul className="list-disc space-y-2 pl-5">
      <li>{t("continuityRule")}</li>
      <li>{t("followupRule")}</li>
      <li>{t("learningRule")}</li>
    </ul>
    <p className="mt-3">{t("capRule")}</p>
  </details>;
}
