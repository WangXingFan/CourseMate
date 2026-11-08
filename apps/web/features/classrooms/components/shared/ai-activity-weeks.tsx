"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { AIActivityStudent } from "@/shared/api/classroom-ai-activity";
import { AIActivityBonusRules } from "./ai-activity-bonus-rules";

export function AIActivityWeeks({ student }: { student: AIActivityStudent }) {
  const t = useTranslations("classrooms.aiActivity");
  return <Dialog>
    <DialogTrigger asChild><Button variant="outline" size="sm" aria-label={t("detailsFor", { name: student.name })}>{t("details")}</Button></DialogTrigger>
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
      <DialogHeader><DialogTitle>{t("detailsFor", { name: student.name })}</DialogTitle><DialogDescription>{t("weekHint")}</DialogDescription></DialogHeader>
      <p className="text-sm leading-relaxed">{t("formula")}</p>
      <AIActivityBonusRules />
      {student.weeks.length ? <div className="overflow-x-auto rounded-md border border-border" role="region" aria-label={t("details")}>
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="border-b border-border bg-muted/40"><tr>{["week", "status", "baseScore", "bonusEvidence", "bonusScore", "weekScore"].map((key) => <th className="px-4 py-3 font-medium" key={key} scope="col">{t(key)}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">{student.weeks.map((week) => <tr key={week.startDate}>
            <th scope="row" className="px-4 py-4 font-mono font-normal">{week.startDate}<span className="block text-muted-foreground">{week.endDate}</span></th>
            <td className="px-4 py-4">{t(week.status)}</td>
            <td className="px-4 py-4"><p className="font-mono text-lg">{week.baseScore}</p><p>{t("dayEvidence", { count: week.activeDays, score: week.dayScore })}</p><p>{t("roundEvidence", { count: week.validRounds, counted: week.countedRounds, score: week.roundScore })}</p></td>
            <td className="px-4 py-4"><p>{t("continuityEvidence", { count: week.consecutiveWeeks, score: week.continuityScore })}</p><p>{t("followupEvidence", { count: week.followupRounds, score: week.followupScore })}</p><p>{t("learningEvidence", { count: week.learningRounds, score: week.learningScore })}</p></td>
            <td className="px-4 py-4 font-mono">+{week.bonusScore}</td><td className="px-4 py-4 font-mono text-lg">{week.score}</td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="py-6 text-sm text-muted-foreground">{t("noData")}</p>}
      <p className="text-sm leading-relaxed text-muted-foreground">{t("validHint")}</p>
    </DialogContent>
  </Dialog>;
}
