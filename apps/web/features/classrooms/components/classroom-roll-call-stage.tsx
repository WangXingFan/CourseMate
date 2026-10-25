"use client";

import { Users } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

import { SpinnerLabel } from "@/components/ui/spinner";
import type { useClassroomRollCall } from "@/features/classrooms/hooks/use-classroom-roll-call";

type RollCallModel = ReturnType<typeof useClassroomRollCall>;

export function ClassroomRollCallStage({ model }: { model: RollCallModel }) {
  const t = useTranslations("classrooms.rollCall");
  const reducedMotion = useReducedMotion();
  const { picked, preview } = model;
  const drawNumber = model.history.length + (preview || !picked ? 1 : 0);

  return (
    <div role="status" aria-label={t("result")} aria-live="polite" aria-atomic="true" aria-busy={model.drawing}
      data-draw-state={model.drawing ? "drawing" : picked ? "revealed" : "idle"}
      className="relative isolate flex min-h-[390px] flex-col overflow-hidden px-5 py-6 text-center sm:min-h-[430px] sm:px-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_45%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_65%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{ backgroundImage: "radial-gradient(color-mix(in oklab, var(--primary) 20%, transparent) 0.7px, transparent 0.7px)", backgroundSize: "22px 22px", maskImage: "radial-gradient(ellipse, black, transparent 75%)" }} />

      <div className="relative z-10 flex justify-end text-xs text-muted-foreground">
        <span className="font-mono tabular-nums">{t("round", { number: String(drawNumber).padStart(2, "0") })}</span>
      </div>

      <div className="relative flex flex-1 items-center justify-center py-8">
        <motion.div aria-hidden className="pointer-events-none absolute size-64 rounded-full border border-primary/10 sm:size-72"
          animate={!reducedMotion && model.drawing ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={{ duration: 1.5, repeat: model.drawing && !reducedMotion ? Infinity : 0 }} />
        <motion.div aria-hidden className="pointer-events-none absolute size-[300px] rounded-full border border-dashed border-primary/15 sm:size-[340px]"
          animate={{ rotate: model.drawing && !reducedMotion ? 180 : 0 }}
          transition={{ duration: model.drawing ? 8 : 0.5, repeat: model.drawing && !reducedMotion ? Infinity : 0, ease: "linear" }} />

        {model.loading ? <SpinnerLabel>{t("loading")}</SpinnerLabel> : preview ? (
          <div className="relative w-full max-w-md">
            <p className="sr-only">{t("rolling")}</p>
            <div aria-hidden data-roll-call-preview={preview.tick} className="relative overflow-hidden py-1">
              <motion.div key={preview.tick} initial={{ y: -24, opacity: 0.45 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.1, ease: "easeOut" }}>
                <p className="mb-4 truncate text-lg font-medium text-muted-foreground/40 blur-[0.5px]">{preview.previous.displayName || preview.previous.username}</p>
                <div className="relative rounded-xl border-y border-primary/20 bg-background/70 px-4 py-5 shadow-[0_8px_40px_-20px_var(--primary)] backdrop-blur-sm">
                  <span className="absolute top-1/2 left-0 h-7 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                  <p className="truncate font-display text-4xl font-normal tracking-[-0.01em] text-foreground sm:text-5xl">{preview.student.displayName || preview.student.username}</p>
                  <p className="mt-3 truncate font-mono text-xs text-muted-foreground">{preview.student.username}</p>
                  <span className="absolute top-1/2 right-0 h-7 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                </div>
                <p className="mt-4 truncate text-lg font-medium text-muted-foreground/40 blur-[0.5px]">{preview.next.displayName || preview.next.username}</p>
              </motion.div>
            </div>
          </div>
        ) : picked ? (
          <div key={`${model.classroomID}-${model.history.length}`} className="relative w-full">
            {!reducedMotion && <div aria-hidden className="pointer-events-none absolute inset-0">
              <motion.span className="absolute top-1/2 left-1/2 size-52 rounded-full border border-primary/35"
                initial={{ x: "-50%", y: "-50%", scale: 0.7, opacity: 0.7 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} />
            </div>}
            <motion.div initial={reducedMotion ? false : { opacity: 0, y: 20, scale: 0.86 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 19 }}>
              <span className="mb-5 inline-flex items-center gap-2 text-xs font-medium tracking-[0.08em] text-seal"><span aria-hidden className="h-px w-6 bg-current" />{t("pickedLabel")}<span aria-hidden className="h-px w-6 bg-current" /></span>
              <h2 className="break-words font-display text-6xl leading-tight font-normal tracking-[-0.015em] text-foreground sm:text-7xl">{picked.displayName || picked.username}</h2>
              <p className="mx-auto mt-5 w-fit max-w-full break-all rounded-md border border-border/60 bg-background/70 px-3 py-1.5 font-mono text-xs text-muted-foreground">{t("studentID", { username: picked.username })}</p>
              <p className="mt-3 break-words text-sm text-muted-foreground">{model.classroom?.name}</p>
            </motion.div>
          </div>
        ) : (
          <div className="relative max-w-xs">
            <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full border border-primary/20 bg-background/80 text-primary shadow-sm"><Users aria-hidden className="size-7" strokeWidth={1.25} /></span>
            <h2 className="font-display text-2xl font-normal text-foreground">{!model.classrooms.length ? t("noClasses") : !model.students.length ? t("noStudents") : t("ready")}</h2>
            {(!model.classrooms.length || !model.students.length) && <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("emptyHint")}</p>}
          </div>
        )}
      </div>

      {preview && <div className="relative z-10 h-7">
        <div aria-hidden className="absolute -bottom-6 left-1/2 h-0.5 w-40 -translate-x-1/2 overflow-hidden rounded-full bg-primary/10">
          <motion.div className="h-full origin-left rounded-full bg-primary/60" initial={{ scaleX: 0 }} animate={{ scaleX: preview.progress }} transition={{ duration: 0.1 }} />
        </div>
      </div>}
    </div>
  );
}
