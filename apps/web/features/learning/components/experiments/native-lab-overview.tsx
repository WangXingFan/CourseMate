"use client";

import { ArrowRight, Check, Clock3, FlaskConical } from "lucide-react";
import { useTranslations } from "next-intl";
import type { VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";

export function NativeLabOverview({ engine, courseID }: { engine: VirtualLabEngine; courseID?: string }) {
  const t = useTranslations("learning.virtualLab.native");
  const courses = courseID ? engine.courses.filter((course) => course.id === courseID) : engine.courses;
  return <div className="space-y-7">
    {!courseID && <header className="border-b border-border pb-8"><p className="mb-3 flex items-center gap-2 font-mono text-xs tracking-[0.08em] text-seal"><FlaskConical aria-hidden className="size-3.5" />CS3017 / SIGNAL & SYSTEM</p><h1 className="font-display max-w-3xl text-3xl md:text-4xl leading-tight font-normal tracking-[-0.015em] sm:text-4xl">{t("title")}</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{t("intro")}</p><div className="mt-5 flex flex-wrap gap-4 text-sm text-muted-foreground"><span>{t("courseCount")}</span><span>{t("taskCount")}</span><span>{t("computeLocally")}</span></div></header>}
    <div className={courseID ? "space-y-6" : "space-y-5"}>{courses.map((course) => {
      const ids = engine.courseIds(course.id), done = ids.filter((id) => engine.records.data.tasks[id].completion.confirmed).length;
      return <section key={course.id} className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border/60 bg-card"><div className="border-b border-border/50 p-5 sm:p-6"><div className="mb-4 flex items-center justify-between text-sm text-muted-foreground"><span className="font-mono text-primary">{t("course", { number: course.number })}</span><span>{t("completedCount", { done, total: ids.length })}</span></div>{courseID ? <h1 className="font-display text-3xl md:text-4xl font-normal tracking-[-0.015em]">{course.name}</h1> : <h2 className="font-display text-2xl leading-8 font-normal">{course.name}</h2>}<p className="mt-3 text-sm leading-6 text-muted-foreground">{course.subtitle}</p><p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Clock3 aria-hidden className="size-4" />{course.chapter} · 4 × 45 min</p></div>
        {courseID && <div className="border-b border-border/50 p-5 sm:p-6"><h2 className="mb-3 text-sm font-medium">{t("objectives")}</h2><ul className="grid gap-3 text-sm leading-6 text-muted-foreground sm:grid-cols-2">{course.objectives.map((objective) => <li key={objective} className="flex items-start gap-2"><Check aria-hidden className="mt-1 size-4 shrink-0 text-primary" />{objective}</li>)}</ul></div>}
        <ol className="flex-1 space-y-1 p-3">{ids.map((id, index) => <li key={id}><a href={`#task/${id}`} className="group flex min-w-0 items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"><span className="font-mono text-sm text-muted-foreground">0{index + 1}</span><div className="min-w-0 flex-1"><p className="font-display text-lg font-normal">{engine.tasks[id].title}</p>{courseID && <p className="mt-1 text-sm leading-6 text-muted-foreground">{engine.tasks[id].goal}</p>}</div>{engine.records.data.tasks[id].completion.confirmed ? <Check aria-hidden className="size-3.5 text-primary" /> : <ArrowRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />}</a></li>)}</ol><a href={courseID ? `#task/${ids[0]}` : `#course/${course.id}`} className="flex items-center justify-between border-t border-border/50 px-6 py-4 text-sm font-medium text-primary">{t("startCourse")}<ArrowRight aria-hidden className="size-3.5" /></a>
      </section>;
    })}</div>
  </div>;
}

export function NativeLabHelp() {
  const t = useTranslations("learning.virtualLab.native");
  return <article className="max-w-3xl space-y-6"><h1 className="font-display text-3xl md:text-4xl font-normal">{t("help")}</h1>{["predict", "operate", "explain", "backup"].map((key, index) => <section key={key} className="rounded-lg border border-border/60 bg-card p-5"><p className="mb-2 font-mono text-sm text-primary">0{index + 1}</p><h2 className="text-sm font-medium">{t(`helpSteps.${key}.title`)}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{t(`helpSteps.${key}.body`)}</p></section>)}</article>;
}
