"use client";

import { ArrowUpRight, BookOpen, Gamepad2, Route, Sparkles, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { LEARNING_TOPICS, type LearningTopic } from "@/features/learning/model/learning-topics";

const QUICK_LINKS = [
  { id: "workbench", href: "/learn/workbench", icon: SlidersHorizontal },
  { id: "flow", href: "/learn/course-flow", icon: Route },
  { id: "quiz", href: "/learn/quiz", icon: Gamepad2 },
  { id: "experiments", href: "/learn/experiments", icon: Sparkles },
  { id: "progress", href: "/learn/progress", icon: BookOpen },
] as const;

export function LearningHub() {
  const t = useTranslations("learning");
  const concepts = LEARNING_TOPICS.filter((topic) => topic.group === "concept");
  const experiments = LEARNING_TOPICS.filter((topic) => topic.group === "experiment");

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto bg-background [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 md:py-8">
        <header className="mb-6 max-w-2xl">
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="size-3.5" strokeWidth={1.6} />
            {t("hub.eyebrow")}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {t("hub.title")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("hub.description")}</p>
        </header>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.id}
                href={link.href}
                prefetch={false}
                className="group flex items-start gap-3 rounded-xl border border-border/60 bg-card px-3 py-3 text-card-foreground shadow-sm transition-colors hover:border-border hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/40">
                  <Icon className="size-4 text-foreground" strokeWidth={1.6} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center justify-between gap-2 text-xs font-medium text-foreground">
                    {t(`hub.quick.${link.id}.title`)}
                    <ArrowUpRight className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </p>
                  <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{t(`hub.quick.${link.id}.description`)}</p>
                </div>
              </Link>
            );
          })}
        </div>

        <SectionHeader
          title={t("hub.sections.concepts")}
          description={t("hub.sections.conceptsDescription")}
          count={concepts.length}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {concepts.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              title={t(`topics.${topic.id}.title`)}
              description={t(`topics.${topic.id}.description`)}
              tag={t(`topics.${topic.id}.tag`)}
              interactive={t("hub.interactive")}
            />
          ))}
        </div>

        <SectionHeader
          title={t("hub.sections.experiments")}
          description={t("hub.sections.experimentsDescription")}
          count={experiments.length}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {experiments.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              title={t(`topics.${topic.id}.title`)}
              description={t(`topics.${topic.id}.description`)}
              tag={t(`topics.${topic.id}.tag`)}
              interactive={t("hub.inClass")}
            />
          ))}
        </div>
        <p className="mt-3 max-w-3xl text-[11px] leading-5 text-muted-foreground">{t("hub.experimentsNote")}</p>

        <p className="mt-6 max-w-2xl text-[11px] leading-5 text-muted-foreground">{t("hub.footer")}</p>
      </div>
    </div>
  );
}

function SectionHeader({ title, description, count }: { title: string; description: string; count: number }) {
  return (
    <div className="mt-7 mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{description}</p>
      </div>
      <Badge variant="outline" className="rounded-md font-mono text-[10px] font-normal tabular-nums">
        {count}
      </Badge>
    </div>
  );
}

function TopicCard({
  topic,
  title,
  description,
  tag,
  interactive,
}: {
  topic: LearningTopic;
  title: string;
  description: string;
  tag: string;
  interactive: string;
}) {
  const Icon = topic.icon;
  return (
    <Link
      href={topic.href}
      prefetch={false}
      className="group relative flex min-h-32 flex-col justify-between overflow-hidden rounded-xl border border-border/60 bg-card p-4 text-card-foreground shadow-sm transition-colors hover:border-border hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <span
            className="flex size-8 items-center justify-center rounded-lg border border-border/50 bg-muted/40"
            style={{ color: topic.accent }}
          >
            <Icon className="size-4" strokeWidth={1.6} />
          </span>
          <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
        <h3 className="mt-2.5 text-[14px] font-medium text-foreground">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline" className="rounded-md px-1.5 text-[10px] font-normal">
          {tag}
        </Badge>
        <Badge variant="secondary" className="rounded-md px-1.5 text-[10px] font-normal">
          {interactive}
        </Badge>
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -bottom-10 size-28 rounded-full opacity-10 blur-2xl"
        style={{ background: topic.accent }}
      />
    </Link>
  );
}
