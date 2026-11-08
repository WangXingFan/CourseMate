"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useLearningReading } from "@/features/learning/hooks/use-learning-reading";

export function ContinueLearning() {
  const t = useTranslations("learning.continuity");
  const { data } = useLearningReading();
  if (!data.last) return null;
  return <Link href={`/learn/knowledge?lesson=${encodeURIComponent(data.last)}`} className="block border-b border-border py-5 text-base hover:text-primary">{t("resume")}: {data.title}</Link>;
}
