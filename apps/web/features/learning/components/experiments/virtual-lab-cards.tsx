"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useLearningLabAccess } from "@/features/learning/hooks/use-learning-lab-access";
import { VIRTUAL_LAB_COURSES } from "@/features/learning/model/virtual-lab-courses";

export function VirtualLabCards() {
  const t = useTranslations("learning.virtualLab");
  const access = useLearningLabAccess();
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {VIRTUAL_LAB_COURSES.map(({ id, icon: Icon }, index) => (
        <Link key={id} aria-disabled={!access.courses?.[id]} onClick={(event) => { if (!access.courses?.[id]) event.preventDefault(); }} href={`/learn/experiments/workspace#course/${id}`} prefetch={false}
          className="group flex min-h-40 flex-col rounded-lg border border-border/60 bg-card p-5 shadow-sm transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="flex items-center justify-between">
            <Icon aria-hidden className="size-5 text-primary" strokeWidth={1.6} />
            <span className="font-mono text-sm text-muted-foreground">0{index + 1}</span>
          </div>
          <h3 className="mt-5 text-base font-medium">{t(`courses.${id}.title`)}</h3>
          <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-3 text-sm">
            <span>{access.error ? t("access.failed") : !access.courses ? t("access.checking") : t(access.courses[id] ? "access.open" : "access.closedShort")}</span>
            <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </Link>
      ))}
    </div>
  );
}
