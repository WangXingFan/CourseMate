"use client";

import { ArrowUpRight, BookOpen, Calculator, FlaskConical, Gamepad2, Lightbulb, SlidersHorizontal, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { LEARNING_TOPICS, type LearningTopic } from "@/features/learning/model/learning-topics";

type LearningPath = "concepts" | "practice";

const PATHS = [
  { id: "concepts", icon: Lightbulb, accent: "var(--chart-2)" },
  { id: "practice", icon: Calculator, accent: "var(--chart-1)" },
] as const;

const PRACTICE_LINKS = [
  { id: "knowledge", href: "/learn/knowledge", icon: BookOpen, accent: "var(--chart-1)" },
  { id: "quiz", href: "/learn/quiz", icon: Gamepad2, accent: "var(--chart-2)" },
  { id: "progress", href: "/learn/progress", icon: Trophy, accent: "var(--chart-3)" },
] as const;

const TOOL_LINKS = [
  { id: "workbench", href: "/learn/workbench", icon: SlidersHorizontal, accent: "var(--chart-4)" },
] as const;

export function LearningHub() {
  const t = useTranslations("learning");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activePath, setActivePath] = useState<LearningPath>("concepts");
  const concepts = LEARNING_TOPICS.filter((topic) => topic.group === "concept");

  return (
    <div
      ref={scrollRef}
      className="h-full min-h-0 w-full overflow-y-auto bg-background [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 md:py-8">
        <header className="mb-5 max-w-3xl">
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
            <FlaskConical className="size-3.5" strokeWidth={1.6} />
            {t("hub.eyebrow")}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{t("hub.title")}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("hub.description")}</p>
        </header>

        <div role="tablist" aria-label={t("hub.paths.label")} className="grid gap-2 sm:grid-cols-2">
          {PATHS.map((path) => {
            const Icon = path.icon;
            const active = activePath === path.id;
            return (
              <button
                key={path.id}
                id={`learning-path-${path.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`learning-panel-${path.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => {
                  setActivePath(path.id);
                  scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`group flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 ${
                  active
                    ? "border-foreground/20 bg-muted/35 ring-1 ring-foreground/5"
                    : "border-border/60 bg-card hover:border-border hover:bg-muted/20"
                }`}
              >
                <span
                  className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50"
                  style={{
                    color: path.accent,
                    background: active ? `color-mix(in oklab, ${path.accent} 12%, transparent)` : "var(--muted)",
                  }}
                >
                  <Icon className="size-4.5" strokeWidth={1.6} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{t(`hub.paths.${path.id}.title`)}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{t(`hub.paths.${path.id}.meta`)}</span>
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-5 text-muted-foreground">
                    {t(`hub.paths.${path.id}.description`)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div
          key={activePath}
          id={`learning-panel-${activePath}`}
          role="tabpanel"
          aria-labelledby={`learning-path-${activePath}`}
          className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
        >
          {activePath === "concepts" ? (
            <ConceptPanel concepts={concepts} />
          ) : (
            <PracticePanel />
          )}
        </div>
      </div>
    </div>
  );
}

function ConceptPanel({ concepts }: { concepts: LearningTopic[] }) {
  const t = useTranslations("learning");

  return (
    <>
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

      <SectionHeader title={t("hub.sections.tools")} description={t("hub.sections.toolsDescription")} />
      <div className="grid gap-2 sm:grid-cols-2">
        {TOOL_LINKS.map((link) => (
          <UtilityCard
            key={link.id}
            href={link.href}
            icon={link.icon}
            accent={link.accent}
            title={t(`hub.quick.${link.id}.title`)}
            description={t(`hub.quick.${link.id}.description`)}
          />
        ))}
      </div>
      <p className="mt-5 max-w-3xl text-[11px] leading-5 text-muted-foreground">{t("hub.footer")}</p>
    </>
  );
}

function PracticePanel() {
  const t = useTranslations("learning");

  return (
    <>
      <SectionHeader
        title={t("hub.sections.practice")}
        description={t("hub.sections.practiceDescription")}
        count={PRACTICE_LINKS.length}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {PRACTICE_LINKS.map((link) => (
          <EntryCard
            key={link.id}
            href={link.href}
            icon={link.icon}
            accent={link.accent}
            title={t(`hub.quick.${link.id}.title`)}
            description={t(`hub.quick.${link.id}.description`)}
          />
        ))}
      </div>

    </>
  );
}

function SectionHeader({
  title,
  description,
  count,
}: {
  title: string;
  description: string;
  count?: number;
}) {
  return (
    <div className="mt-7 mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{description}</p>
      </div>
      {typeof count === "number" ? (
        <Badge variant="outline" className="rounded-md font-mono text-[10px] font-normal tabular-nums">
          {count}
        </Badge>
      ) : null}
    </div>
  );
}

function EntryCard({
  href,
  icon: Icon,
  accent,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  accent: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group relative flex min-h-32 flex-col justify-between overflow-hidden rounded-xl border border-border/60 bg-card p-4 text-card-foreground shadow-sm transition-colors hover:border-border hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <span
            className="flex size-8 items-center justify-center rounded-lg border border-border/50 bg-muted/40"
            style={{ color: accent }}
          >
            <Icon className="size-4" strokeWidth={1.6} />
          </span>
          <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
        <h3 className="mt-2.5 text-[14px] font-medium text-foreground">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -bottom-10 size-28 rounded-full opacity-10 blur-2xl"
        style={{ background: accent }}
      />
    </Link>
  );
}

function UtilityCard({
  href,
  icon: Icon,
  accent,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  accent: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-3 text-card-foreground shadow-sm transition-colors hover:border-border hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
    >
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/40"
        style={{ color: accent }}
      >
        <Icon className="size-4" strokeWidth={1.6} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2 text-xs font-medium text-foreground">
          {title}
          <ArrowUpRight className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
        <span className="mt-0.5 block text-[11px] leading-5 text-muted-foreground">{description}</span>
      </span>
    </Link>
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
