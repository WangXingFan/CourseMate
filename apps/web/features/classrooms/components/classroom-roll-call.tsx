"use client";

import { ArrowUpRight, Check, ClipboardList, RefreshCw, RotateCcw, Shuffle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { CenteredEmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { SpinnerLabel } from "@/components/ui/spinner";
import { ClassroomRollCallStage } from "@/features/classrooms/components/classroom-roll-call-stage";
import { useClassroomRollCall } from "@/features/classrooms/hooks/use-classroom-roll-call";
import { useAuthSession } from "@/shared/auth/auth-session-context";

export function ClassroomRollCallEntry() {
  const t = useTranslations("classrooms.rollCall");
  const { accessToken, user, userStatus } = useAuthSession();

  if (userStatus === "loading") {
    return <main className="flex h-full flex-1 items-center justify-center text-muted-foreground"><SpinnerLabel>{t("loading")}</SpinnerLabel></main>;
  }
  if (user?.role !== "teacher") {
    return <main className="h-full min-h-0 flex-1"><CenteredEmptyState title={t("teacherOnly")} description={t("teacherOnlyDescription")} /></main>;
  }
  return <ClassroomRollCall key={user.id} accessToken={accessToken} />;
}

function ClassroomRollCall({ accessToken }: { accessToken: string }) {
  const t = useTranslations("classrooms.rollCall");
  const model = useClassroomRollCall(accessToken);
  const reducedMotion = useReducedMotion();
  const exhausted = model.students.length > 0 && model.remaining === 0;
  const statistics = [["total", model.students.length], ["called", model.history.length], ["remaining", model.remaining]] as const;

  return (
    <main className="h-full min-h-0 min-w-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary"><Shuffle aria-hidden className="size-5" strokeWidth={1.6} /></span>
            <div>
              <h1 className="font-display text-3xl font-normal tracking-[-0.015em] text-foreground md:text-4xl">{t("title")}</h1>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm"><Link href="/classrooms">{t("manageClasses")}<ArrowUpRight aria-hidden className="size-3.5" /></Link></Button>
        </header>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-y border-border py-5">
          <div className="min-w-0 flex-1 space-y-2 sm:max-w-sm">
            <Label htmlFor="roll-call-classroom">{t("classroom")}</Label>
            <select id="roll-call-classroom" value={model.classroomID} disabled={model.loading && model.classrooms.length === 0}
              onChange={(event) => model.selectClassroom(event.target.value)}
              className="h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50">
              {model.classrooms.length === 0 && <option value="">{model.loading ? t("loading") : t("noClasses")}</option>}
              {model.classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}
            </select>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={model.loading} onClick={model.refresh}>
            <RefreshCw aria-hidden className="size-3.5" />{t("refresh")}
          </Button>
        </div>

        {model.error && <div role="alert" className="mb-5 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">{t("loadFailed")}</p><p className="mt-1 text-xs">{model.error}</p>
        </div>}

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
          <section aria-label={t("drawArea")} className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
            <dl className="grid grid-cols-3 divide-x divide-border border-b border-border px-3 py-5 text-center sm:px-6">
              {statistics.map(([key, value]) => (
                <div key={key} className="space-y-1.5"><dt className="text-xs text-muted-foreground">{t(key)}</dt><dd className="font-display text-3xl tabular-nums text-foreground">{value}</dd></div>
              ))}
            </dl>

            <ClassroomRollCallStage model={model} />

            <div className="border-t border-border/50 px-5 py-5 sm:px-8">
              <Button type="button" size="lg" className="h-12 w-full rounded-md text-base transition-shadow enabled:hover:shadow-md" disabled={model.loading || model.drawing || !!model.error || model.remaining === 0} onClick={model.draw}>
                {exhausted ? <Check aria-hidden className="size-4" /> : <Shuffle aria-hidden className={`size-4 ${model.drawing ? "motion-safe:animate-spin" : ""}`} />}
                {model.drawing ? t("rolling") : exhausted ? t("exhausted") : model.picked ? t("drawAgain") : t("draw")}
              </Button>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-1">
                <p className="text-xs leading-5 text-muted-foreground">{t("noRepeat")}</p>
                <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" disabled={model.loading || (model.history.length === 0 && !model.drawing)} onClick={model.reset}>
                  <RotateCcw aria-hidden className="size-3.5" />{t("reset")}
                </Button>
              </div>
            </div>
          </section>

          <section aria-labelledby="roll-call-history-heading" className="flex min-h-64 min-w-0 flex-col rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border/50 px-5 py-4">
              <ClipboardList aria-hidden className="size-4 text-muted-foreground" strokeWidth={1.6} />
              <h2 id="roll-call-history-heading" className="flex-1 text-base font-medium">{t("historyTitle")}</h2>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{model.history.length}</span>
            </div>
            {model.history.length > 0 ? <ol aria-label={t("historyTitle")} className="max-h-[420px] flex-1 space-y-1 overflow-y-auto p-3">
              {[...model.history].reverse().map((student, index) => <motion.li key={student.id} layout={!reducedMotion} initial={reducedMotion ? false : { opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className={`flex min-w-0 items-center gap-3 rounded-lg px-3 py-3 ${index === 0 ? "border border-primary/15 bg-primary/5" : "border border-transparent bg-muted/25"}`}>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border/50 bg-background text-xs tabular-nums text-muted-foreground">{String(model.history.length - index).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{student.displayName || student.username}</p><p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">{student.username}</p></div>
                <Check aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
              </motion.li>)}
            </ol> : <div className="flex flex-1 items-center justify-center px-6 py-10"><p className="max-w-56 text-center text-sm leading-6 text-muted-foreground">{t("historyEmpty")}</p></div>}
          </section>
        </div>
      </div>
    </main>
  );
}
