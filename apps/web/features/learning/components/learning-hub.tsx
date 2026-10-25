"use client";

import { ArrowRight, ArrowUpRight, Calculator, Gamepad2, Lightbulb, SlidersHorizontal, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { LEARNING_TOPICS, type LearningTopic } from "@/features/learning/model/learning-topics";
import { cn } from "@/lib/utils";

type LearningPath = "concepts" | "practice";

const PATHS = [
  { id: "concepts", icon: Lightbulb },
  { id: "practice", icon: Calculator },
] as const;

const PRACTICE_LINKS = [
  { id: "quiz", href: "/learn/quiz", icon: Gamepad2 },
  { id: "progress", href: "/learn/progress", icon: Trophy },
] as const;

const TOOL_LINKS = [
  { id: "workbench", href: "/learn/workbench", icon: SlidersHorizontal },
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
      <div className="mx-auto w-full max-w-5xl px-5 pt-10 pb-16 md:px-10 md:pt-16">
        <header className="grid gap-6 border-b border-border pb-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-[0.08em] text-seal">{t("hub.eyebrow")}</p>
            <h1 className="mt-3 font-display text-4xl leading-[1.1] font-normal tracking-[-0.015em] text-foreground md:text-5xl">
              {t("hub.title")}
            </h1>
          </div>

          <div role="tablist" aria-label={t("hub.paths.label")} className="flex gap-6">
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
                  className={cn(
                    "group relative -mb-[33px] flex flex-col items-start gap-1 pb-8 text-left transition-colors focus-visible:outline-none",
                    "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:bg-foreground after:transition-transform after:duration-300",
                    active ? "text-foreground after:scale-x-100" : "text-muted-foreground after:scale-x-0 hover:text-foreground",
                  )}
                >
                  <span className="flex items-center gap-2 text-base font-medium">
                    <Icon className="size-4" strokeWidth={1.6} aria-hidden />
                    {t(`hub.paths.${path.id}.title`)}
                  </span>
                  <span className="text-xs text-muted-foreground">{t(`hub.paths.${path.id}.meta`)}</span>
                </button>
              );
            })}
          </div>
        </header>

        <div
          key={activePath}
          id={`learning-panel-${activePath}`}
          role="tabpanel"
          aria-labelledby={`learning-path-${activePath}`}
          className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
        >
          {activePath === "concepts" ? <ConceptPanel concepts={concepts} /> : <PracticePanel />}
        </div>
      </div>
    </div>
  );
}

function ConceptPanel({ concepts }: { concepts: LearningTopic[] }) {
  const t = useTranslations("learning");

  return (
    <>
      <SectionHeader title={t("hub.sections.concepts")} count={concepts.length} />
      <ol className="border-t border-border">
        {concepts.map((topic, index) => (
          <TopicRow
            key={topic.id}
            index={index + 1}
            topic={topic}
            title={t(`topics.${topic.id}.title`)}
            description={t(`topics.${topic.id}.description`)}
            tag={t(`topics.${topic.id}.tag`)}
          />
        ))}
      </ol>

      <SectionHeader title={t("hub.sections.tools")} />
      <div className="grid gap-3 sm:grid-cols-2">
        {TOOL_LINKS.map((link) => (
          <EntryCard
            key={link.id}
            href={link.href}
            icon={link.icon}
            title={t(`hub.quick.${link.id}.title`)}
            description={t(`hub.quick.${link.id}.description`)}
          />
        ))}
      </div>
    </>
  );
}

function PracticePanel() {
  const t = useTranslations("learning");

  return (
    <>
      <SectionHeader title={t("hub.sections.practice")} count={PRACTICE_LINKS.length} />
      <div className="grid gap-3 sm:grid-cols-2">
        {PRACTICE_LINKS.map((link) => (
          <EntryCard
            key={link.id}
            href={link.href}
            icon={link.icon}
            title={t(`hub.quick.${link.id}.title`)}
            description={t(`hub.quick.${link.id}.description`)}
          />
        ))}
      </div>
    </>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="mt-12 mb-4 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-2xl font-normal text-foreground">{title}</h2>
      {typeof count === "number" ? (
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{String(count).padStart(2, "0")}</span>
      ) : null}
    </div>
  );
}
function TopicRow({
  index,
  topic,
  title,
  description,
  tag,
}: {
  index: number;
  topic: LearningTopic;
  title: string;
  description: string;
  tag: string;
}) {
  const Icon = topic.icon;
  return (
    <li className="border-b border-border">
      <Link
        href={topic.href}
        prefetch={false}
        className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 py-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 md:grid-cols-[3.5rem_minmax(0,1fr)_9rem_auto] md:items-center md:py-6"
      >
        <span className="pt-1 font-mono text-sm text-muted-foreground tabular-nums md:pt-0">
          {String(index).padStart(2, "0")}
        </span>
        <span className="min-w-0">
          <span className="block font-display text-xl leading-snug text-foreground transition-colors group-hover:text-primary md:text-[1.375rem]">
            {title}
          </span>
          <span className="mt-1.5 block max-w-2xl text-sm leading-6 text-muted-foreground">{description}</span>
        </span>
        <span className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
          <Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
          {tag}
        </span>
        <ArrowRight
          aria-hidden
          className="mt-1.5 size-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary md:mt-0"
        />
      </Link>
    </li>
  );
}

function EntryCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group flex min-h-36 flex-col justify-between rounded-lg border border-border bg-card p-5 text-card-foreground transition-[border-color,box-shadow] hover:border-foreground/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-secondary text-primary">
          <Icon className="size-4.5" strokeWidth={1.6} aria-hidden />
        </span>
        <ArrowUpRight
          aria-hidden
          className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </div>
      <div className="mt-5">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
