"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { AssessmentStatsResponse } from "@/shared/api/analytics";
import { AnalyticsChart } from "@/features/analytics/components/shared/analytics-chart";
import { AnalyticsReadouts, AnalyticsSelect } from "@/features/analytics/components/shared/analytics-controls";
import { aggregateAssessments, percentage } from "@/features/analytics/model/statistics";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function AnalyticsAssessments({ items, lab = false }: { items: AssessmentStatsResponse[]; lab?: boolean }) {
  const t = useTranslations("analytics");
  const [selected, setSelected] = useState("");
  const [metric, setMetric] = useState("completion");
  const options = [...new Map(items.map((item) => [item.itemKey, item.title])).entries()];
  const rows = aggregateAssessments(items.filter((item) => !selected || item.itemKey === selected));
  const expected = rows.reduce((total, item) => total + item.expected, 0);
  const completed = rows.reduce((total, item) => total + item.completed, 0);
  const scoreCount = rows.reduce((total, item) => total + item.scoreCount, 0);
  const scoreSum = rows.reduce((total, item) => total + item.scoreSum, 0);
  const bins = ["0–59", "60–69", "70–79", "80–89", "90–100"];
  const plot = metric === "distribution" ? bins.map((name, index) => ({ name, value: rows.reduce((count, row) => count + (row.distribution[index] ?? 0), 0) })) : rows.map((item) => ({ name: item.classroomName, value: metric === "completion" ? percentage(item.completed, item.expected) : item.scoreCount ? item.scoreSum / item.scoreCount : null }));
  const display = (value: number | null, suffix = "") => value === null ? "—" : `${value.toFixed(1)}${suffix}`;
  return <div className="space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><AnalyticsSelect label={t(lab ? "experiment" : "homework")} value={selected} onChange={setSelected}><option value="">{t("allItems")}</option>{options.map(([id, title]) => <option key={id} value={id}>{lab ? t(`experiments.${id}`) : title}</option>)}</AnalyticsSelect><AnalyticsSelect label={t("chartMetric")} value={metric} onChange={setMetric}><option value="completion">{t("completionRate")}</option><option value="average">{t("averageScore")}</option><option value="distribution">{t("scoreDistribution")}</option></AnalyticsSelect></div>
    <AnalyticsReadouts values={[{ label: t("expected"), value: expected }, { label: t("completed"), value: completed }, { label: t("completionRate"), value: percentage(completed, expected), suffix: "%" }, { label: t("averageScore"), value: scoreCount ? scoreSum / scoreCount : null }]} />
    <section className="space-y-6"><h2 className="font-display text-2xl font-normal">{t(metric === "completion" ? "classCompletion" : metric === "average" ? "classScores" : "scoreDistribution")}</h2>{rows.length ? <AnalyticsChart label={t(metric === "completion" ? "completionRate" : metric === "average" ? "averageScore" : "completed")} data={plot} percent={metric === "completion"} /> : <p className="py-16 text-center text-sm text-muted-foreground">{t("noAssignments")}</p>}</section>
    <section className="space-y-5 border-t border-border pt-6"><h2 className="font-display text-2xl font-normal">{t("classroomDetails")}</h2><Table><TableHeader><TableRow><TableHead>{t("classroom")}</TableHead><TableHead className="text-right">{t("expected")}</TableHead>{lab && <TableHead className="text-right">{t("inProgress")}</TableHead>}<TableHead className="text-right">{t("completed")}</TableHead><TableHead className="text-right">{t("incomplete")}</TableHead><TableHead className="text-right">{t("completionRate")}</TableHead><TableHead className="text-right">{t("averageScore")}</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="whitespace-nowrap">{row.classroomName}</TableCell><TableCell className="text-right font-mono">{row.expected}</TableCell>{lab && <TableCell className="text-right font-mono">{row.started - row.completed}</TableCell>}<TableCell className="text-right font-mono">{row.completed}</TableCell><TableCell className="text-right font-mono">{row.expected - row.completed}</TableCell><TableCell className="text-right font-mono">{display(percentage(row.completed, row.expected), "%")}</TableCell><TableCell className="text-right font-mono">{display(row.scoreCount ? row.scoreSum / row.scoreCount : null)}</TableCell></TableRow>)}</TableBody></Table></section>
  </div>;
}
