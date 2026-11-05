"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { LessonStatsResponse } from "@/shared/api/analytics";
import { AnalyticsChart } from "@/features/analytics/components/shared/analytics-chart";
import { AnalyticsReadouts, AnalyticsSelect } from "@/features/analytics/components/shared/analytics-controls";
import { aggregateLessons, percentage } from "@/features/analytics/model/statistics";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function AnalyticsLessons({ items }: { items: LessonStatsResponse[] }) {
  const t = useTranslations("analytics");
  const [quiz, setQuiz] = useState("");
  const [lesson, setLesson] = useState("");
  const [metric, setMetric] = useState("correctRate");
  const quizzes = [...new Map(items.map((item) => [item.quizId, item.quizTitle])).entries()];
  const lessons = aggregateLessons(items.filter((item) => !quiz || item.quizId === quiz));
  const rows = lessons.filter((item) => !lesson || item.lessonId === lesson);
  const expected = rows.reduce((total, item) => total + item.expected, 0);
  const answered = rows.reduce((total, item) => total + item.answered, 0);
  const correct = rows.reduce((total, item) => total + item.correct, 0);
  const name = (item: LessonStatsResponse) => `${item.number ? `${item.number} ` : ""}${item.title || t("unassignedLesson")}`;
  const rate = (value: number, total: number) => total ? `${(value / total * 100).toFixed(1)}%` : "—";
  return <div className="space-y-8"><div className="flex flex-wrap gap-4"><AnalyticsSelect label={t("previewQuiz")} value={quiz} onChange={(value) => { setQuiz(value); setLesson(""); }}><option value="">{t("allItems")}</option>{quizzes.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</AnalyticsSelect><AnalyticsSelect label={t("lesson")} value={lesson} onChange={setLesson}><option value="">{t("allLessons")}</option>{lessons.map((item) => <option key={item.lessonId} value={item.lessonId}>{name(item)}</option>)}</AnalyticsSelect><AnalyticsSelect label={t("chartMetric")} value={metric} onChange={setMetric}><option value="correctRate">{t("correctRate")}</option><option value="answerRate">{t("answerRate")}</option><option value="answered">{t("answered")}</option></AnalyticsSelect></div>
    <AnalyticsReadouts values={[{ label: t("expectedAnswers"), value: expected }, { label: t("answered"), value: answered }, { label: t("correctRate"), value: percentage(correct, answered), suffix: "%" }, { label: t("answerRate"), value: percentage(answered, expected), suffix: "%" }]} />
    <section className="space-y-6"><h2 className="font-display text-2xl font-normal">{t("lessonComparison")}</h2>{rows.length ? <AnalyticsChart label={t(metric)} percent={metric !== "answered"} data={rows.map((item) => ({ name: name(item), value: metric === "answered" ? item.answered : metric === "answerRate" ? percentage(item.answered, item.expected) : percentage(item.correct, item.answered) }))} /> : <p className="py-16 text-center text-sm text-muted-foreground">{t("noPreviewQuizzes")}</p>}</section>
    <Table><TableHeader><TableRow><TableHead>{t("lesson")}</TableHead><TableHead className="text-right">{t("expectedAnswers")}</TableHead><TableHead className="text-right">{t("answered")}</TableHead><TableHead className="text-right">{t("correct")}</TableHead><TableHead className="text-right">{t("wrong")}</TableHead><TableHead className="text-right">{t("correctRate")}</TableHead><TableHead className="text-right">{t("answerRate")}</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.lessonId}><TableCell className="min-w-48">{name(row)}</TableCell><TableCell className="text-right font-mono">{row.expected}</TableCell><TableCell className="text-right font-mono">{row.answered}</TableCell><TableCell className="text-right font-mono">{row.correct}</TableCell><TableCell className="text-right font-mono">{row.answered - row.correct}</TableCell><TableCell className="text-right font-mono">{rate(row.correct, row.answered)}</TableCell><TableCell className="text-right font-mono">{rate(row.answered, row.expected)}</TableCell></TableRow>)}</TableBody></Table>
  </div>;
}
