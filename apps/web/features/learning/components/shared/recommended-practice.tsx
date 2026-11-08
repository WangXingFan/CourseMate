"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useLearningMastery } from "@/features/learning/hooks/use-learning-mastery";

export function RecommendedPractice() {
  const t = useTranslations("learning.continuity");
  const topics = useTranslations("learningLabs.progress.topics");
  const model = useLearningMastery();
  const weak = model.data?.concepts.filter((concept) => concept.status === "weak" && concept.practiceHref).slice(0, 3) ?? [];
  return <section className="mt-8 border-t border-border pt-5"><h2 className="font-display text-xl font-normal">{t("recommendations")}</h2>
    {model.error ? <p role="alert" className="mt-3 text-sm text-destructive">{model.error}</p> : !model.data ? <p role="status" className="mt-3 text-sm">{t("loading")}</p> : weak.length ? weak.map((concept) => <Link key={concept.id} href={concept.practiceHref} className="block border-b border-border py-3 text-sm hover:text-primary">{concept.title || topics(concept.topic)}</Link>) : <Link href="/learn/practice" className="block py-4 text-sm hover:text-primary">{t("explorePractice")}</Link>}
  </section>;
}
