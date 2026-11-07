"use client";

import { useTranslations } from "next-intl";
import type { PerformanceStudent } from "@/shared/api/classroom-performance";

export function PerformanceEvidenceView({ student: s }: { student: PerformanceStudent }) {
  const t = useTranslations("classrooms.performance");
  const value = (v?: number | null) => v == null ? "—" : v.toFixed(1);
  return <div className="space-y-5 text-sm">
    <dl className="grid grid-cols-2 gap-4">{[["quality", s.quality], ["participation", s.participation], ["growth", s.growth], ["consistency", s.consistency], ["raw", s.raw], ["final", s.final]].map(([key, number]) => <div key={key}><dt>{t(`columns.${key}`)}</dt><dd className="mt-1 font-mono text-lg">{value(typeof number === "number" ? number : null)}</dd></div>)}</dl>
    <p>{t("outcomes", { improved: s.improved, retained: s.retained, regressed: s.regressed, unresolved: s.unresolved, missing: s.missingPairs })}</p>
    {s.reason && <p>{t("reason")}: {s.reason}</p>}
    <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-border text-xs">{["activity", "question", "result", "outcome"].map((key) => <th key={key} className="px-2 py-3 font-medium">{t(key)}</th>)}</tr></thead><tbody>{s.evidence.map((e) => <tr key={`${e.quizId}:${e.questionId}`} className="border-b border-border"><td className="px-2 py-3">{e.title}</td><td className="px-2 py-3 font-mono">{e.questionId}</td><td className="px-2 py-3">{e.submitted ? `${e.points}/${e.total}` : t("notSubmitted")}</td><td className="px-2 py-3">{e.outcome ? t(`outcomeLabels.${e.outcome}`) : "—"}</td></tr>)}</tbody></table></div>
  </div>;
}
