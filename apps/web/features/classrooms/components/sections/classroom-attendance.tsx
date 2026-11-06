"use client";

import type {
  AttendanceCorrectionRequest,
  AttendanceRecordResponse,
} from "@deeix/api-contract";
import { Download, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useClassroomAttendance } from "@/features/classrooms/hooks/use-classroom-attendance";
import { AttendanceCode } from "./classroom-attendance-code";
import { AttendanceProjection } from "./classroom-attendance-projection";

export function ClassroomAttendance({
  accessToken,
  classroomID,
}: {
  accessToken: string;
  classroomID: string;
}) {
  const t = useTranslations("classrooms.attendance");
  const locale = useLocale();
  const model = useClassroomAttendance(accessToken, classroomID);
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("5");
  const [lateAfter, setLateAfter] = useState("0");
  const [creating, setCreating] = useState(false);
  const [closing, setClosing] = useState(false);
  const [filter, setFilter] = useState("all");
  const report = model.report;
  const records = report?.records ?? [];
  const counts = {
    all: records.length,
    present: records.filter((r) => r.status === "present" || r.status === "late").length,
    absent: records.filter((r) => r.status === "absent").length,
    excused: records.filter((r) => r.status === "excused").length,
  };
  const visible = records.filter(
    (r) =>
      filter === "all" ||
      (filter === "present" ? r.status === "present" || r.status === "late" : r.status === filter),
  );

  function download() {
    if (!report) return;
    const quote = (value: string) =>
      `"${(/^[=+@\-\t\r]/.test(value) ? "'" : "") + value.replaceAll('"', '""')}"`;
    const rows = [
      [t("name"), t("username"), t("status"), t("checkedAt"), t("reason")],
      ...records.map((r) => [
        r.displayName,
        r.username,
        t(`statuses.${r.status}`),
        r.checkedAt ? new Date(r.checkedAt).toLocaleString(locale) : "",
        r.corrections.at(-1)?.reason ?? "",
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", rows.map((r) => r.map(quote).join(",")).join("\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-${report.session.id}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-6 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-normal">{t("title")}</h2>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={model.refresh} aria-label={t("refresh")}>
            <RefreshCw className="size-4" />
          </Button>
          <Button onClick={() => setCreating((v) => !v)}>{t(creating ? "cancel" : "start")}</Button>
        </div>
      </div>
      {creating && (
        <form
          className="grid gap-4 rounded-lg border border-border p-5 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void model
              .create({ title, minutes: Number(minutes), lateAfter: Number(lateAfter) })
              .then((ok) => {
                if (ok) {
                  setCreating(false);
                  setTitle("");
                }
              });
          }}
        >
          <label className="space-y-2 text-sm sm:col-span-2">
            <span>{t("sessionTitle")}</span>
            <Input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="space-y-2 text-sm">
            <span>{t("minutes")}</span>
            <Input
              required
              type="number"
              min={1}
              max={180}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>{t("lateAfter")}</span>
            <Input
              required
              type="number"
              min={0}
              max={Math.max(0, Number(minutes) - 1)}
              value={lateAfter}
              onChange={(e) => setLateAfter(e.target.value)}
            />
          </label>
          <Button className="justify-self-start" type="submit" disabled={model.pending}>
            {t("start")}
          </Button>
        </form>
      )}
      <AlertDialog open={closing} onOpenChange={setClosing}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("close")}</AlertDialogTitle>
            <AlertDialogDescription>{t("closeConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={model.pending}
              onClick={() => {
                void model.close();
              }}
            >
              {t("close")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {model.actionError && (
        <p role="alert" className="text-sm text-destructive">
          {model.actionError}
        </p>
      )}
      {model.loadError && (
        <p role="alert" className="text-sm text-destructive">
          {model.loadError}
        </p>
      )}
      {model.loading && !model.items.length ? (
        <Spinner />
      ) : !model.items.length ? (
        <p className="py-8 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <>
          <label className="block space-y-2 text-sm">
            <span>{t("sessions")}</span>
            <Select value={model.selectedID} onValueChange={model.select}>
              <SelectTrigger className="w-full" size="default">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {model.items.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title} · {new Date(s.startsAt).toLocaleString(locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          {!report && !model.loadError && <Spinner />}
          {report && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <h3 className="font-display text-xl font-normal">{report.session.title}</h3>
                  <p className="mt-2 text-sm">
                    {t(report.session.open ? "endsAt" : "endedAt", {
                      time: new Date(report.session.closedAt ?? report.session.endsAt).toLocaleString(locale),
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AttendanceProjection report={report} />
                  <Button variant="outline" onClick={download}>
                    <Download className="size-4" />
                    {t("export")}
                  </Button>
                  {report.session.open && (
                    <Button variant="outline" disabled={model.pending} onClick={() => setClosing(true)}>
                      {t("close")}
                    </Button>
                  )}
                </div>
              </div>
              {report.session.open && <AttendanceCode report={report} />}
              <div role="group" className="flex flex-wrap gap-6" aria-label={t("summary")}>
                {(["all", "present", "absent", "excused"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={filter === key}
                    onClick={() => setFilter(key)}
                    className={`border-l-2 pl-3 text-left ${filter === key ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}
                  >
                    <span className="block text-sm">{t(`counts.${key}`)}</span>
                    <span className="font-mono text-2xl">{counts[key]}</span>
                  </button>
                ))}
              </div>
              <div className="divide-y divide-border">
                {visible.map((r) => (
                  <details key={r.studentId} className="py-4">
                    <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <span className="min-w-24 font-display text-lg">{r.displayName || r.username}</span>
                      <span className="font-mono text-muted-foreground">{r.username}</span>
                      <span className="ml-auto">
                        {t(r.status === "absent" && report.session.open ? "pending" : `statuses.${r.status}`)}
                      </span>
                      <span className="text-muted-foreground">
                        {r.checkedAt ? new Date(r.checkedAt).toLocaleTimeString(locale) : "—"}
                      </span>
                      <span>{t("correct")}</span>
                    </summary>
                    <div className="mt-4 space-y-3">
                      {r.corrections.map((c, index) => (
                        <p key={`${c.at}:${index}`} className="text-sm">
                          {new Date(c.at).toLocaleString(locale)} · {t("operator", { id: c.actorId })} ·{" "}
                          {t(`statuses.${c.previous}`)} → {t(`statuses.${c.status}`)} · {c.reason}
                        </p>
                      ))}
                      <CorrectionForm
                        key={r.corrections.length}
                        record={r}
                        pending={model.pending}
                        onSave={(body) => model.correct(r.studentId, body)}
                      />
                    </div>
                  </details>
                ))}
                {!visible.length && <p className="py-6 text-sm text-muted-foreground">{t("noRecords")}</p>}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

function CorrectionForm({
  record,
  pending,
  onSave,
}: {
  record: AttendanceRecordResponse;
  pending: boolean;
  onSave: (body: AttendanceCorrectionRequest) => Promise<boolean>;
}) {
  const t = useTranslations("classrooms.attendance");
  const [status, setStatus] = useState(record.status);
  const [reason, setReason] = useState("");
  return (
    <form
      className="grid gap-3 sm:grid-cols-[10rem_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({ status, reason });
      }}
    >
      <label className="space-y-2 text-sm">
        <span>{t("status")}</span>
        <select
          value={status}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "present" || value === "late" || value === "absent" || value === "excused")
              setStatus(value);
          }}
          className="h-9 w-full rounded-md border border-input bg-background px-3"
        >
          {["present", "late", "absent", "excused"].map((value) => (
            <option key={value} value={value}>
              {t(`statuses.${value}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-2 text-sm">
        <span>{t("reason")}</span>
        <Input required maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      <Button type="submit" className="self-end" disabled={pending || !reason.trim()}>
        {t("save")}
      </Button>
    </form>
  );
}
