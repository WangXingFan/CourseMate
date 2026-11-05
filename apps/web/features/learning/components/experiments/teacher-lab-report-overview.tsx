"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnalyticsChart, AnalyticsReadouts, AnalyticsSelect } from "@/features/analytics";
import { summarizeLabReport } from "@/features/learning/model/teacher-lab-report";
import type { LabReportResponse } from "@/shared/api/lab-assessments";

export function TeacherLabReportOverview({ report, onSelectStudent }: { report: LabReportResponse; onSelectStudent: (id: string) => void }) {
  const t = useTranslations("learning.teacherExperiments");
  const locale = useLocale();
  const [metric, setMetric] = useState("distribution");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const stats = summarizeLabReport(report);
  const shown = stats.students.filter(({ student, progress }) => (!status || progress.status === status) && `${student.name} ${student.username}`.toLowerCase().includes(query.trim().toLowerCase()));
  const plot = metric === "distribution" ? ["0–59", "60–69", "70–79", "80–89", "90–100"].map((name, i) => ({ name, value: stats.distribution[i] }))
    : metric === "completion" ? [{ name: t("status.completed"), value: stats.completed }, { name: t("status.inProgress"), value: stats.started - stats.completed }, { name: t("status.notStarted"), value: stats.students.length - stats.started }]
    : [1, 2, 3, 4].map((number) => ({ name: t("taskNumber", { number }), value: stats.students.length ? stats.students.filter(({ student }) => student.grade.tasks.find((task) => task.id === `${report.assignment.courseId}-${number}`)?.attempts.some((attempt) => !!attempt.submittedAt && !!attempt.result)).length / stats.students.length * 100 : null }));
  return <div className="space-y-6" data-teacher-lab-report>
    <AnalyticsReadouts values={[{ label: t("students"), value: stats.students.length }, { label: t("completedStudents"), value: stats.completed }, { label: t("completionRate"), value: stats.completionRate, suffix: "%" }, { label: t("completedAverage"), value: stats.completedAverage }]} />
    <div className="flex flex-wrap justify-between gap-4 text-sm"><span>{t("submittedStudents", { count: stats.submitted })}</span><span>{t("classAverage")} <span className="font-mono">{stats.classAverage === null ? "—" : stats.classAverage.toFixed(1)}</span></span></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="font-display text-xl font-normal">{t("statistics")}</h4><AnalyticsSelect label={t("chartMetric")} value={metric} onChange={setMetric}><option value="distribution">{t("distribution")}</option><option value="completion">{t("completion")}</option><option value="tasks">{t("taskCompletion")}</option></AnalyticsSelect></div>
    <AnalyticsChart label={t(metric === "tasks" ? "completionRate" : "students")} percent={metric === "tasks"} data={plot} />
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6"><h4 className="font-display text-xl font-normal">{t("studentResults")}</h4><div className="flex flex-wrap gap-3"><Input aria-label={t("search")} placeholder={t("search")} value={query} onChange={(event) => setQuery(event.target.value)} className="w-52 max-w-full" /><AnalyticsSelect label={t("submissionStatus")} value={status} onChange={setStatus}><option value="">{t("allStatuses")}</option>{["notStarted", "inProgress", "completed"].map((key) => <option key={key} value={key}>{t(`status.${key}`)}</option>)}</AnalyticsSelect></div></div>
    <Table><TableHeader><TableRow><TableHead>{t("name")}</TableHead><TableHead>{t("studentNumber")}</TableHead><TableHead>{t("submissionStatus")}</TableHead><TableHead>{t("submittedTasks")}</TableHead><TableHead>{t("score")}</TableHead><TableHead>{t("lastSubmission")}</TableHead><TableHead className="text-right">{t("answerSheet")}</TableHead></TableRow></TableHeader><TableBody>{shown.map(({ student, progress }) => <TableRow key={student.id}><TableCell className="whitespace-nowrap">{student.name || student.username}</TableCell><TableCell className="font-mono">{student.username}</TableCell><TableCell className="whitespace-nowrap">{t(`status.${progress.status}`)}</TableCell><TableCell className="font-mono">{progress.submitted}/4</TableCell><TableCell className="font-mono">{progress.started ? `${student.grade.total}/100` : "—"}</TableCell><TableCell className="whitespace-nowrap">{progress.latest ? new Date(progress.latest).toLocaleString(locale, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell><TableCell className="text-right"><Button variant="outline" onClick={() => onSelectStudent(student.id)}>{t("viewStudent")}</Button></TableCell></TableRow>)}</TableBody></Table>
    {!shown.length && <p className="py-8 text-center text-sm text-muted-foreground">{t("noMatches")}</p>}
  </div>;
}
