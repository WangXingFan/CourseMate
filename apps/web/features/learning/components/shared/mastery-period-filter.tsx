"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MasteryPeriod } from "@/shared/api/learning-mastery";

export function MasteryPeriodFilter({ period, onChange }: { period: MasteryPeriod; onChange: (period: MasteryPeriod) => void }) {
  const t = useTranslations("learning.mastery.period");
  const locale = useLocale();
  const id = useId();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const invalid = !!startDate && !!endDate && startDate > endDate;
  const start = period.startAt ? new Date(period.startAt).toLocaleDateString(locale) : "";
  const end = period.endAt ? new Date(new Date(period.endAt).getTime() - 1).toLocaleDateString(locale) : "";
  const scope = start && end ? t("range", { start, end }) : start ? t("from", { start }) : end ? t("until", { end }) : t("all");

  return <form className="mb-6 space-y-3 border-b border-border pb-6" onSubmit={(event) => {
    event.preventDefault();
    if (invalid) return;
    const next: MasteryPeriod = {};
    // Calendar dates use the browser's timezone; the end includes the whole day.
    if (startDate) next.startAt = new Date(`${startDate}T00:00:00`).toISOString();
    if (endDate) {
      const exclusiveEnd = new Date(`${endDate}T00:00:00`);
      exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
      next.endAt = exclusiveEnd.toISOString();
    }
    onChange(next);
  }}>
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1 basis-40 space-y-2 sm:max-w-52">
        <Label htmlFor={`${id}-start`}>{t("start")}</Label>
        <Input id={`${id}-start`} type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} />
      </div>
      <div className="min-w-0 flex-1 basis-40 space-y-2 sm:max-w-52">
        <Label htmlFor={`${id}-end`}>{t("end")}</Label>
        <Input id={`${id}-end`} type="date" value={endDate} min={startDate || undefined} aria-invalid={invalid} onChange={(event) => setEndDate(event.target.value)} />
      </div>
      <Button type="submit" disabled={invalid}>{t("apply")}</Button>
      <Button type="button" variant="outline" onClick={() => { setStartDate(""); setEndDate(""); onChange({}); }}>{t("all")}</Button>
    </div>
    {invalid && <p role="alert" className="text-sm text-destructive">{t("invalid")}</p>}
    <p role="status" className="text-sm">{t("current", { scope })}</p>
  </form>;
}
