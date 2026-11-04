"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { MasteryProfile } from "@/features/learning";
import { useClassroomMastery } from "@/features/classrooms/hooks/use-classroom-mastery";
import { cn } from "@/lib/utils";

export function ClassroomMastery({ accessToken, classroomID }: { accessToken: string; classroomID: string }) {
  const t = useTranslations("learning.mastery");
  const topics = useTranslations("learningLabs.progress.topics");
  const model = useClassroomMastery(accessToken, classroomID);
  const [conceptID, setConceptID] = useState("");
  const selected = model.report?.students.find((student) => student.id === model.studentID);
  const weakConcepts = model.report?.concepts.filter((item) => item.weak > 0).sort((a, b) => b.weak - a.weak) ?? [];
  const visible = model.report?.students.filter((student) => !conceptID || student.weakConceptIds.includes(conceptID)) ?? [];
  return <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-8" data-classroom-mastery>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl font-normal">{selected ? t("studentTitle", { name: selected.name || selected.username }) : t("classTitle")}</h2><div className="flex gap-2">{model.studentID && <Button variant="outline" onClick={() => model.selectStudent("")}>{t("backClass")}</Button>}<Button variant="ghost" onClick={model.refresh}>{t("refresh")}</Button></div></div>
    {model.error ? <p role="alert" className="text-sm text-destructive">{model.error}</p> : !model.report ? <div role="status" className="flex items-center gap-2 text-sm"><Spinner />{t("loading")}</div> : model.studentID ? (model.profileError ? <p role="alert" className="text-sm text-destructive">{model.profileError}</p> : model.profile ? <MasteryProfile key={model.studentID} profile={model.profile} readOnly /> : <div role="status" className="flex items-center gap-2 text-sm"><Spinner />{t("loading")}</div>) : <div className="space-y-8">
      <p className="text-sm leading-7">{t("classScope")}</p>
      <section><h3 className="mb-4 font-display text-xl font-normal">{t("classWeak")}</h3><div className="divide-y divide-border border-y border-border">{weakConcepts.map((item) => <button type="button" key={item.concept.id} aria-pressed={conceptID === item.concept.id} onClick={() => setConceptID((id) => id === item.concept.id ? "" : item.concept.id)} className={cn("flex w-full flex-wrap items-center justify-between gap-3 px-3 py-4 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring", conceptID === item.concept.id ? "bg-accent shadow-[inset_2px_0_0_var(--primary)]" : "hover:bg-muted")}><span className="font-display text-lg">{item.concept.title || topics(item.concept.topic)}</span><span>{t("weakStudents", { weak: item.weak, assessed: item.assessed })}</span></button>)}</div>{!weakConcepts.length && <p className="py-4 text-sm">{t("noClassWeak")}</p>}</section>
      <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="font-display text-xl font-normal">{t("students", { count: visible.length })}</h3>{conceptID && <Button variant="ghost" onClick={() => setConceptID("")}>{t("clearFilter")}</Button>}</div><div className="divide-y divide-border border-y border-border">{visible.map((student) => <button type="button" key={student.id} onClick={() => model.selectStudent(student.id)} className="flex w-full flex-wrap items-center justify-between gap-3 px-3 py-4 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" data-mastery-student={student.id}><span className="font-display text-lg">{student.name || student.username}</span><span className="text-sm">{student.counts.assessed ? t("studentCounts", { assessed: student.counts.assessed, weak: student.counts.weak, secure: student.counts.secure }) : t("status.unassessed")}</span></button>)}</div>{!model.report.students.length && <p className="py-4 text-sm">{t("noStudents")}</p>}</section>
    </div>}
  </div>;
}
