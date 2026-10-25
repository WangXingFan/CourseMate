"use client";

import { ArrowRight, GitCompareArrows } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { QuizComparisonResponse } from "@deeix/api-contract";

export function QuizComparisonPanel({ comparison }: { comparison: QuizComparisonResponse }) {
  const t = useTranslations("classrooms.activities.comparison");
  const counts = [
    ["paired", comparison.pairedCount], ["beforeOnly", comparison.beforeOnly],
    ["afterOnly", comparison.afterOnly], ["neither", comparison.neither],
  ] as const;
  return <section className="space-y-4 rounded-xl border border-primary/25 bg-primary/[0.025] p-3 sm:p-4" aria-label={t("title")}>
    <div className="space-y-1.5">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><GitCompareArrows className="size-4 text-primary" />{t("title")}</h3>
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="break-words">{comparison.beforeTitle}</span><ArrowRight className="size-3 shrink-0" /><span className="break-words">{comparison.afterTitle}</span></p>
      <p className="text-xs leading-5 text-muted-foreground">{t("denominator")}</p>
      {comparison.afterStatus !== "closed" && <p role="status" className="text-xs text-amber-700 dark:text-amber-400">{t(comparison.afterStatus === "draft" ? "draft" : "provisional")}</p>}
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{counts.map(([label, count]) => <div key={label} className="rounded-lg border border-border/50 bg-background/70 px-3 py-2"><p className="text-2xs text-muted-foreground">{t(label)}</p><p className="mt-1 font-mono text-lg tabular-nums">{count}</p></div>)}</div>
    {comparison.questions.map((q) => <div key={q.conceptId} className="space-y-3 rounded-lg border border-border/50 bg-background/70 p-3">
      <h4 className="text-xs font-medium">{q.conceptTitle || q.conceptId}</h4>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <Rate label={t("beforeRate")} count={q.beforeCorrect} total={q.pairedCount} />
        <ArrowRight className="hidden size-4 text-muted-foreground sm:block" />
        <Rate label={t("afterRate")} count={q.afterCorrect} total={q.pairedCount} />
      </div>
      <p className="text-xs font-medium">{t("change", { value: q.pairedCount ? `${q.afterCorrect >= q.beforeCorrect ? "+" : ""}${((q.afterCorrect - q.beforeCorrect) / q.pairedCount * 100).toFixed(1)}` : "—" })}</p>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {(["improved", "retained", "regressed", "unresolved"] as const).map((key) => <div key={key} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5"><span className="text-muted-foreground">{t(`outcomes.${key}`)}</span><span className="font-mono tabular-nums">{q[key]}</span></div>)}
      </div>
    </div>)}
    <p className="text-xs leading-5 text-muted-foreground">{t("interpretation")}</p>
    <details className="rounded-lg border border-border/50 bg-background/70 p-3">
      <summary className="cursor-pointer text-xs font-medium">{t("students")}</summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[500px] text-left text-xs">
          <thead className="border-b border-border/60 text-muted-foreground"><tr><th className="pb-2 pr-3">{t("student")}</th><th className="pb-2 pr-3">{t("before")}</th><th className="pb-2 pr-3">{t("after")}</th><th className="pb-2">{t("outcome")}</th></tr></thead>
          <tbody>{comparison.students.map((s) => <tr key={s.studentId} className="border-b border-border/40 last:border-0"><td className="py-2 pr-3"><p className="font-medium">{s.studentName || s.username}</p><p className="mt-0.5 font-mono text-2xs text-muted-foreground">{s.username}</p></td><td className="py-2 pr-3">{t(s.beforeSubmitted ? "submitted" : "missing")}</td><td className="py-2 pr-3">{t(s.afterSubmitted ? "submitted" : "missing")}</td><td className="py-2"><div className="flex flex-wrap gap-1">{s.changes.map((change) => <Badge key={change.conceptId} variant="outline" className="text-2xs font-normal">{comparison.questions.length > 1 ? `${comparison.questions.find((q) => q.conceptId === change.conceptId)?.conceptTitle ?? ""} · ` : ""}{t(`outcomes.${change.outcome}`)}</Badge>)}</div></td></tr>)}</tbody>
        </table>
      </div>
    </details>
  </section>;
}

function Rate({ label, count, total }: { label: string; count: number; total: number }) {
  const percent = total ? count / total * 100 : 0;
  return <div><div className="mb-1.5 flex items-center justify-between gap-2"><span className="text-2xs text-muted-foreground">{label}</span><span className="font-mono text-xs tabular-nums">{total ? `${percent.toFixed(1)}%` : "—"}<span className="ml-1.5 text-2xs text-muted-foreground">({count}/{total})</span></span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></div></div>;
}
