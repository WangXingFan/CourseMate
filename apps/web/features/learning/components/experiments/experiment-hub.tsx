"use client";

import { ArrowUpRight, Dices, FlaskConical, LockKeyhole, PenLine, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { LessonPanel, LessonShell } from "@/features/learning/components/shared/lesson-shell";
import { LEARNING_TOPICS } from "@/features/learning/model/learning-topics";

const STEPS = [
  { id: "seed", icon: Dices },
  { id: "predict", icon: LockKeyhole },
  { id: "explain", icon: PenLine },
  { id: "code", icon: ShieldCheck },
] as const;

export function ExperimentHub() {
  const t = useTranslations("learningLabs.experimentHub");
  const experiments = LEARNING_TOPICS.filter((topic) => topic.group === "experiment");

  return (
    <LessonShell title={t("title")} subtitle={t("subtitle")}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          {experiments.map((topic) => {
            const Icon = topic.icon;
            return (
              <Link
                key={topic.id}
                href={topic.href}
                prefetch={false}
                className="group relative flex min-h-40 flex-col justify-between overflow-hidden rounded-xl border border-border/60 bg-card p-4 text-card-foreground shadow-sm transition-colors hover:border-border hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-muted/40"
                      style={{ color: topic.accent }}
                    >
                      <Icon className="size-4.5" strokeWidth={1.6} />
                    </span>
                    <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                  <h2 className="mt-3 text-[15px] font-medium text-foreground">{t(`topics.${topic.id}.title`)}</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{t(`topics.${topic.id}.description`)}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="rounded-md px-1.5 text-[10px] font-normal">
                    {t(`topics.${topic.id}.tag`)}
                  </Badge>
                  <Badge variant="secondary" className="rounded-md px-1.5 text-[10px] font-normal">
                    {t("minutes", { count: 8 })}
                  </Badge>
                </div>
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-8 -bottom-10 size-32 rounded-full opacity-10 blur-2xl"
                  style={{ background: topic.accent }}
                />
              </Link>
            );
          })}
        </div>

        <LessonPanel title={t("how.title")} description={t("how.description")}>
          <div className="grid gap-2 sm:grid-cols-2">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/15 px-3 py-2">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[10px] text-muted-foreground">
                    {index + 1}
                  </span>
                  <div>
                    <p className="flex items-center gap-1 text-xs font-medium text-foreground">
                      <Icon className="size-3.5" strokeWidth={1.6} />
                      {t(`how.steps.${step.id}.title`)}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{t(`how.steps.${step.id}.description`)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <FlaskConical className="size-3.5" strokeWidth={1.6} />
            {t("how.note")}
          </div>
        </LessonPanel>
      </div>
    </LessonShell>
  );
}
