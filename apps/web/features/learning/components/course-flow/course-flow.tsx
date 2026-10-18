"use client";

import { ArrowUpRight, Check, ClipboardCopy, GraduationCap, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LessonPanel, LessonShell } from "@/features/learning/components/shared/lesson-shell";
import { isBoolean, isRecord, isString, parseJSON } from "@/shared/lib/type-guards";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "coursemate.learning.course-flow.v1";

const PHASES = [
  {
    id: "before",
    minutes: 15,
    items: [
      { id: "read", href: "/learn" },
      { id: "warmup", href: "/learn/quiz" },
      { id: "predict", href: "/learn/convolution" },
    ],
  },
  {
    id: "during",
    minutes: 45,
    items: [
      { id: "challenge", href: "/learn/experiments" },
      { id: "explain", href: "/learn/laplace" },
      { id: "exit" },
    ],
  },
  {
    id: "after",
    minutes: 30,
    items: [
      { id: "experiment", href: "/learn/experiments" },
      { id: "selfcheck", href: "/learn/quiz" },
      { id: "question", href: "/learn" },
    ],
  },
] as const;

const ALL_ITEMS = PHASES.flatMap((phase) => phase.items.map((item) => `${phase.id}-${item.id}`));

type FlowState = {
  checked: Record<string, boolean>;
  keep: string;
  stuck: string;
};

export function CourseFlow() {
  const t = useTranslations("learningLabs.courseFlow");
  const [state, setState] = React.useState<FlowState>({ checked: {}, keep: "", stuck: "" });
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = parseJSON(raw);
      if (!isRecord(parsed)) return;
      const checked: Record<string, boolean> = {};
      if (isRecord(parsed.checked)) {
        for (const [key, value] of Object.entries(parsed.checked)) {
          if (isBoolean(value)) checked[key] = value;
        }
      }
      setState({
        checked,
        keep: isString(parsed.keep) ? parsed.keep : "",
        stuck: isString(parsed.stuck) ? parsed.stuck : "",
      });
    } catch {
      // Ignore malformed local state; the checklist still works in memory.
    }
  }, []);

  function persist(next: FlowState) {
    setState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be unavailable in private mode; keep the in-memory state.
    }
  }

  function toggle(key: string) {
    persist({ ...state, checked: { ...state.checked, [key]: !state.checked[key] } });
  }

  function reset() {
    persist({ checked: {}, keep: "", stuck: "" });
    setCopied(false);
  }

  async function copyExitTicket() {
    const lines = [
      `${t("exit.title")}`,
      `${t("exit.keepLabel")}: ${state.keep.trim() || "—"}`,
      `${t("exit.stuckLabel")}: ${state.stuck.trim() || "—"}`,
      `checked=${countChecked(state.checked)}/${ALL_ITEMS.length}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const completed = countChecked(state.checked);

  return (
    <LessonShell title={t("title")} subtitle={t("subtitle")}>
      <div className="space-y-3">
        <LessonPanel title={t("progress.title")} description={t("progress.description")}>
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${(completed / ALL_ITEMS.length) * 100}%` }}
              />
            </div>
            <span className="font-mono text-xs tabular-nums text-foreground">
              {completed}/{ALL_ITEMS.length}
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{t("progress.hint")}</p>
        </LessonPanel>

        <div className="grid gap-3 lg:grid-cols-3">
          {PHASES.map((phase) => {
            const phaseCompleted = phase.items.filter((item) => state.checked[`${phase.id}-${item.id}`]).length;
            return (
              <LessonPanel key={phase.id} title={t(`phases.${phase.id}.title`)} description={t(`phases.${phase.id}.description`)}>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="rounded-md font-mono text-[10px] font-normal">
                    {phase.minutes} min
                  </Badge>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    {phaseCompleted}/{phase.items.length}
                  </span>
                </div>
                <ul className="mt-3 space-y-2">
                  {phase.items.map((item) => {
                    const key = `${phase.id}-${item.id}`;
                    const checked = Boolean(state.checked[key]);
                    return (
                      <li key={key} className="flex items-start gap-2">
                        <button
                          type="button"
                          aria-pressed={checked}
                          onClick={() => toggle(key)}
                          className={cn(
                            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                            checked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border/70 bg-background text-transparent hover:border-border",
                          )}
                        >
                          <Check className="size-2.5" strokeWidth={2.6} />
                        </button>
                        <span className={cn("flex-1 text-[11px] leading-5", checked ? "text-muted-foreground line-through" : "text-foreground")}>
                          {t(`phases.${phase.id}.items.${item.id}`)}
                        </span>
                        {"href" in item ? (
                          <Link
                            href={item.href}
                            prefetch={false}
                            aria-label={t("openLab")}
                            className="mt-0.5 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <ArrowUpRight className="size-3.5" strokeWidth={1.8} />
                          </Link>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </LessonPanel>
            );
          })}
        </div>

        <LessonPanel title={t("exit.title")} description={t("exit.description")}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="exit-keep" className="text-xs text-muted-foreground">
                {t("exit.keepLabel")}
              </label>
              <Textarea
                id="exit-keep"
                value={state.keep}
                maxLength={240}
                placeholder={t("exit.keepPlaceholder")}
                onChange={(event) => persist({ ...state, keep: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="exit-stuck" className="text-xs text-muted-foreground">
                {t("exit.stuckLabel")}
              </label>
              <Textarea
                id="exit-stuck"
                value={state.stuck}
                maxLength={240}
                placeholder={t("exit.stuckPlaceholder")}
                onChange={(event) => persist({ ...state, stuck: event.target.value })}
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => { void copyExitTicket(); }}>
              <ClipboardCopy className="size-3.5" strokeWidth={1.8} />
              {copied ? t("exit.copied") : t("exit.copy")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={reset}>
              <RotateCcw className="size-3.5" strokeWidth={1.8} />
              {t("reset")}
            </Button>
          </div>
        </LessonPanel>

        <LessonPanel title={t("teacher.title")} description={t("teacher.description")}>
          <div className="flex items-start gap-2">
            <GraduationCap className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
            <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
              <li>{t("teacher.before")}</li>
              <li>{t("teacher.during")}</li>
              <li>{t("teacher.after")}</li>
              <li>{t("teacher.code")}</li>
            </ul>
          </div>
        </LessonPanel>
      </div>
    </LessonShell>
  );
}

function countChecked(checked: Record<string, boolean>): number {
  return ALL_ITEMS.filter((key) => checked[key]).length;
}
