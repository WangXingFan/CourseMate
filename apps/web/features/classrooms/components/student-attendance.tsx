"use client";

import type { AttendanceStudentItemResponse } from "@deeix/api-contract";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useClassroomStudentAttendance } from "@/features/classrooms/hooks/use-classroom-student-attendance";

export function StudentAttendance({ accessToken }: { accessToken: string }) {
  const t = useTranslations("classrooms.attendance");
  const model = useClassroomStudentAttendance(accessToken);
  const open = model.items.filter((item) => item.session.open || item.session.id === model.scan.id);
  const history = model.items.filter((item) => !item.session.open && item.session.id !== model.scan.id);
  return (
    <section className="mb-8 space-y-4 border-b border-border pb-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-normal">{t("title")}</h2>
        <Button variant="ghost" onClick={model.refresh}>
          {t("refresh")}
        </Button>
      </div>
      {model.loadError && (
        <p role="alert" className="text-sm text-destructive">
          {model.loadError}
        </p>
      )}
      {model.actionError && (
        <p role="alert" className="text-sm text-destructive">
          {model.actionError}
        </p>
      )}
      {model.loading ? (
        <Spinner />
      ) : (
        <>
          {model.scan.id &&
            !model.items.some((item) => item.session.id === model.scan.id) &&
            !model.loadError && (
              <p role="alert" className="text-sm text-destructive">
                {t("scanUnavailable")}
              </p>
            )}
          {!open.length && <p className="text-sm text-muted-foreground">{t("noOpen")}</p>}
          {open.map((item) => (
            <StudentAttendanceCard
              key={`${item.session.id}:${model.scan.code}`}
              item={item}
              initialCode={model.scan.id === item.session.id ? model.scan.code : ""}
              pending={!!model.pending}
              onSubmit={(code) => model.submit(item.session.id, code)}
            />
          ))}
          {!!history.length && (
            <details>
              <summary className="cursor-pointer text-sm">{t("history", { count: history.length })}</summary>
              <div className="mt-4 space-y-4">
                {history.map((item) => (
                  <StudentAttendanceCard
                    key={item.session.id}
                    item={item}
                    initialCode=""
                    pending={false}
                    onSubmit={async () => {}}
                  />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}

function StudentAttendanceCard({
  item,
  initialCode,
  pending,
  onSubmit,
}: {
  item: AttendanceStudentItemResponse;
  initialCode: string;
  pending: boolean;
  onSubmit: (code: string) => Promise<void>;
}) {
  const t = useTranslations("classrooms.attendance");
  const locale = useLocale();
  const [code, setCode] = useState(initialCode);
  const { session, record } = item;
  const canCheckIn = session.open && !record.checkedAt && !record.corrections.length;
  return (
    <article id={`attendance-${session.id}`} ref={(node) => { if (node && window.location.hash === `#attendance-${session.id}`) node.scrollIntoView(); }} className="scroll-mt-4 space-y-4 rounded-lg border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-xl font-normal">{session.title}</h3>
        <span className="text-sm">{t(canCheckIn ? "pending" : `statuses.${record.status}`)}</span>
      </div>
      <p className="text-sm">
        {record.displayName || record.username} · <span className="font-mono">{record.username}</span>
      </p>
      <p className="text-sm text-muted-foreground">
        {t(session.open ? "endsAt" : "endedAt", {
          time: new Date(session.closedAt ?? session.endsAt).toLocaleString(locale),
        })}
      </p>
      {record.checkedAt && (
        <p className="text-sm">{t("receipt", { time: new Date(record.checkedAt).toLocaleString(locale) })}</p>
      )}
      {canCheckIn && (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit(code);
          }}
        >
          <label className="min-w-0 flex-1 space-y-2 text-sm">
            <span>{t("code")}</span>
            <Input
              required
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="font-mono text-lg"
            />
          </label>
          <Button type="submit" disabled={pending || code.length !== 6}>
            {t("checkIn")}
          </Button>
        </form>
      )}
      {record.corrections.length > 0 && (
        <p className="text-sm">
          {t("correctionReason", { reason: record.corrections.at(-1)?.reason ?? "" })}
        </p>
      )}
    </article>
  );
}
