"use client";

import type { AttendanceReportResponse } from "@deeix/api-contract";
import { Monitor, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AttendanceCode } from "./classroom-attendance-code";

export function AttendanceProjection({ report }: { report: AttendanceReportResponse }) {
  const t = useTranslations("classrooms.attendance");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"present" | "absent">("present");
  const ownsFullscreen = useRef(false);

  const exitFullscreen = useCallback(() => {
    if (!ownsFullscreen.current) return;
    ownsFullscreen.current = false;
    if (document.fullscreenElement === document.documentElement) {
      void document.exitFullscreen().catch((error: unknown) => console.warn("Attendance projection: exit fullscreen failed", error));
    }
  }, []);

  useEffect(() => {
    function onFullscreenChange() {
      if (ownsFullscreen.current && !document.fullscreenElement) {
        ownsFullscreen.current = false;
        setOpen(false);
      }
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      exitFullscreen();
    };
  }, [exitFullscreen]);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      exitFullscreen();
      return;
    }
    setFilter("present");
    if (document.fullscreenEnabled && !document.fullscreenElement) {
      ownsFullscreen.current = true;
      void document.documentElement.requestFullscreen().catch((error: unknown) => {
        ownsFullscreen.current = false;
        console.warn("Attendance projection: fullscreen unavailable", error);
      });
    }
  }

  const present = report.records.filter((record) => record.status === "present" || record.status === "late");
  const absent = report.records.filter((record) => record.status === "absent");
  const visible = filter === "present" ? present : absent;
  const excused = report.records.length - present.length - absent.length;

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Monitor className="size-4" strokeWidth={1.5} aria-hidden="true" />
          {t("projection.open")}
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="inset-0 flex h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 shadow-none backdrop-blur-none data-[state=open]:animate-none data-[state=closed]:animate-none sm:max-w-none"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4 md:px-8 md:py-6">
          <div className="min-w-0 space-y-2">
            <DialogTitle className="truncate font-display text-2xl font-normal leading-tight md:text-3xl">
              {report.session.title}
            </DialogTitle>
            <p className="text-sm text-muted-foreground md:text-lg">
              {t(report.session.open ? "endsAt" : "endedAt", {
                time: new Date(report.session.closedAt ?? report.session.endsAt).toLocaleTimeString(locale, {
                  hour: "2-digit", minute: "2-digit",
                }),
              })}
            </p>
          </div>
          <DialogClose asChild>
            <Button variant="outline" size="lg" className="shrink-0">
              <X className="size-5" strokeWidth={1.5} aria-hidden="true" />
              {t("projection.exit")}
            </Button>
          </DialogClose>
        </header>
        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-2 md:grid-rows-1">
          <AttendanceCode report={report} projection />
          <section className="flex min-h-0 min-w-0 flex-col border-t border-border md:border-t-0 md:border-l" aria-label={t(`projection.${filter}`)}>
            <div className="grid shrink-0 grid-cols-2 border-b border-border" role="group" aria-label={t("summary")}>
              {(["present", "absent"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                  className={`flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 border-b-2 px-4 py-4 text-lg outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:py-6 md:text-2xl ${filter === key ? "border-primary bg-accent text-foreground" : "border-transparent text-muted-foreground"}`}
                >
                  <span>{t(`projection.${key}`)}</span>
                  <span className="font-mono tabular-nums">{key === "present" ? present.length : absent.length}</span>
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 md:p-8" role="region" aria-label={t(`projection.${filter}`)}>
              {visible.length ? (
                <ul className="grid grid-cols-2 gap-x-6 gap-y-5 xl:grid-cols-3">
                  {visible.map((record) => (
                    <li key={record.studentId} className="min-w-0 break-words font-display text-2xl font-normal leading-snug lg:text-3xl">
                      {record.displayName || record.username}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-8 text-center text-xl text-muted-foreground">{t(`projection.${filter === "present" ? "emptyPresent" : "emptyAbsent"}`)}</p>
              )}
            </div>
            <footer className="flex shrink-0 flex-wrap gap-x-6 gap-y-2 border-t border-border px-6 py-4 text-base text-muted-foreground md:px-8 md:text-lg">
              <span>{t("counts.all")} <span className="font-mono tabular-nums">{report.records.length}</span></span>
              <span>{t("counts.excused")} <span className="font-mono tabular-nums">{excused}</span></span>
            </footer>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
