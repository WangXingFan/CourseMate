"use client";

import type { AttendanceReportResponse } from "@deeix/api-contract";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { createQRCodeDataURL } from "@/shared/lib/qr-code";

export function AttendanceCode({
  report,
  projection = false,
}: {
  report: AttendanceReportResponse;
  projection?: boolean;
}) {
  const t = useTranslations("classrooms.attendance");
  const [remaining, setRemaining] = useState(0);
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (/^https?:$/.test(window.location.protocol)) setOrigin(window.location.origin);
  }, []);
  useEffect(() => {
    const expires = report.codeExpiresAt
      ? Math.min(Date.parse(report.codeExpiresAt), Date.parse(report.session.endsAt)) - Date.parse(report.serverTime)
      : 0;
    const received = Date.now();
    const tick = () => setRemaining(Math.max(0, Math.ceil((expires - (Date.now() - received)) / 1000)));
    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [report]);
  const url = origin
    ? `${origin}/activities?attendance=${encodeURIComponent(report.session.id)}&code=${report.code}`
    : "";
  const qr = useMemo(() => (url ? createQRCodeDataURL(url) : ""), [url]);
  const active = report.session.open && remaining > 0;
  return (
    <div className={projection
      ? "flex min-h-0 flex-col items-center justify-center gap-6 overflow-y-auto p-6 md:p-8"
      : "flex flex-wrap items-center justify-center gap-8 rounded-lg border border-border p-6 md:gap-12 md:p-8"}
    >
      <div className={projection ? "order-2 flex shrink-0 items-center justify-center" : ""}>
        {qr && active && (
          <img
            src={qr}
            alt={t("qr")}
            width={212}
            height={212}
            className={projection ? "size-36 md:size-[min(30vw,38dvh)]" : "size-52"}
          />
        )}
      </div>
      <div className="shrink-0 space-y-3 text-center">
        <p className={projection ? "text-xl" : "text-sm"}>{t("code")}</p>
        <p
          className="font-mono text-5xl leading-none tabular-nums"
          style={projection ? { fontSize: "clamp(3rem, 8vw, 9rem)" } : undefined}
        >
          {active ? report.code : "------"}
        </p>
        <p className={projection ? "text-lg text-muted-foreground" : "text-sm text-muted-foreground"} aria-live="off">
          {!report.session.open ? t("projection.ended") : active ? t("expires", { seconds: remaining }) : t("refreshing")}
        </p>
      </div>
    </div>
  );
}
