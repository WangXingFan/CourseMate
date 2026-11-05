"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { UsageReportResponse } from "@/shared/api/analytics";
import { AnalyticsChart } from "@/features/analytics/components/shared/analytics-chart";
import { AnalyticsReadouts, AnalyticsSelect } from "@/features/analytics/components/shared/analytics-controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function AnalyticsVisits({ data }: { data: UsageReportResponse }) {
  const t = useTranslations("analytics");
  const locale = useLocale();
  const [kind, setKind] = useState("line");
  const categories = new Map<string, number>();
  for (const item of data.resources) categories.set(item.category, (categories.get(item.category) ?? 0) + item.visits);
  return <div className="space-y-8">
    <AnalyticsReadouts values={[{ label: t("visits"), value: data.summary.visits }, { label: t("resourcesUsed"), value: data.resources.length }, { label: t("practiceAnswers"), value: data.summary.practiceAnswers }, { label: t("submissions"), value: data.summary.homeworkSubmissions + data.summary.quizSubmissions }]} />
    <div className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(15rem,1fr)]">
      <section className="min-w-0 space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl font-normal">{t("visitTrend")}</h2><AnalyticsSelect label={t("chartType")} value={kind} onChange={setKind}><option value="line">{t("line")}</option><option value="bar">{t("bar")}</option></AnalyticsSelect></div>
        <AnalyticsChart label={t("visits")} kind={kind === "line" ? "line" : "bar"} data={data.daily.map((day) => ({ name: day.date.slice(5), value: day.visits }))} />
        <details className="text-sm"><summary className="cursor-pointer py-2">{t("dailyDetails")}</summary><Table><TableHeader><TableRow><TableHead>{t("date")}</TableHead><TableHead className="text-right">{t("visits")}</TableHead></TableRow></TableHeader><TableBody>{data.daily.map((day) => <TableRow key={day.date}><TableCell>{day.date}</TableCell><TableCell className="text-right font-mono">{day.visits}</TableCell></TableRow>)}</TableBody></Table></details>
      </section>
      <section className="space-y-6 xl:border-l xl:border-border xl:pl-8"><h2 className="font-display text-2xl font-normal">{t("categoryUsage")}</h2>{[...categories.entries()].sort((a, b) => b[1] - a[1]).map(([category, count]) => <div key={category}><div className="mb-2 flex items-center justify-between gap-4 text-sm"><span>{t(`categories.${category}`)}</span><span className="font-mono">{count.toLocaleString(locale)}</span></div><div className="h-2 rounded-sm bg-muted"><div className="h-2 rounded-sm bg-primary" style={{ width: `${data.summary.visits ? count / data.summary.visits * 100 : 0}%` }} /></div></div>)}{!categories.size && <p className="py-6 text-sm text-muted-foreground">{t("noVisits")}</p>}</section>
    </div>
    <section className="space-y-5 border-t border-border pt-6"><h2 className="font-display text-2xl font-normal">{t("resourceRanking")}</h2><Table><TableHeader><TableRow><TableHead>{t("resource")}</TableHead><TableHead>{t("category")}</TableHead><TableHead className="text-right">{t("visits")}</TableHead><TableHead className="text-right">{t("share")}</TableHead></TableRow></TableHeader><TableBody>{data.resources.map((item) => <TableRow key={item.key}><TableCell>{t(`resources.${item.key}`)}</TableCell><TableCell>{t(`categories.${item.category}`)}</TableCell><TableCell className="text-right font-mono">{item.visits.toLocaleString(locale)}</TableCell><TableCell className="text-right font-mono">{(item.visits / data.summary.visits * 100).toFixed(1)}%</TableCell></TableRow>)}</TableBody></Table>{!data.resources.length && <p className="py-6 text-center text-sm text-muted-foreground">{t("noVisits")}</p>}</section>
    {!!data.classrooms.length && <section className="space-y-5"><h2 className="font-display text-2xl font-normal">{t("classroomVisits")}</h2><Table><TableHeader><TableRow><TableHead>{t("classroom")}</TableHead><TableHead className="text-right">{t("visits")}</TableHead></TableRow></TableHeader><TableBody>{data.classrooms.map((item) => <TableRow key={item.id}><TableCell>{item.name}</TableCell><TableCell className="text-right font-mono">{item.visits.toLocaleString(locale)}</TableCell></TableRow>)}</TableBody></Table></section>}
  </div>;
}
