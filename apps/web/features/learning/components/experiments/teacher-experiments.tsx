"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useLearningTeacherClassrooms } from "@/features/learning/hooks/use-learning-teacher-classrooms";
import { TeacherLabAssessments } from "@/features/learning/components/experiments/teacher-lab-assessments";

export function TeacherExperiments({ accessToken }: { accessToken: string }) {
  const t = useTranslations("learning.teacherExperiments");
  const courseT = useTranslations("learning.virtualLab");
  const model = useLearningTeacherClassrooms(accessToken);
  return <div className="min-w-0 space-y-8" data-teacher-experiments>
    <div className="flex flex-wrap items-center justify-between gap-4"><label className="flex min-w-0 items-center gap-3 text-sm"><span>{t("classroom")}</span><select aria-label={t("classroom")} value={model.selectedID} onChange={(event) => model.select(event.target.value)} disabled={model.loading || !!model.pending} className="h-9 min-w-0 max-w-full rounded-md border border-input bg-background px-3 text-sm">{model.items.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><div className="flex flex-wrap gap-2"><Button variant="ghost" disabled={model.loading || !!model.pending} onClick={model.refresh}>{t("refresh")}</Button><Button asChild variant="outline"><Link href="/learn/experiments/guide">{courseT("guide")}</Link></Button><Button asChild variant="outline"><Link href="/analytics">{t("analytics")}</Link></Button></div></div>
    {model.error && <p role="alert" className="text-sm text-destructive">{model.error}</p>}
    {model.loading ? <Spinner /> : model.selected ? <>
      <section aria-label={t("accessTitle")} data-experiment-access><h2 className="mb-5 font-display text-2xl font-normal">{t("accessTitle")}</h2><div className="grid gap-4 md:grid-cols-3">{["L1", "L2", "L3"].map((id) => <article key={id} className="flex min-w-0 flex-col rounded-lg border border-border p-5"><h3 className="font-display text-xl font-normal">{courseT(`courses.${id}.title`)}</h3><div className="my-5 flex items-center justify-between gap-3 text-sm"><span>{t(model.selected?.experiments[id] ? "open" : "closed")}</span><Switch aria-label={t("toggle", { course: id })} checked={!!model.selected?.experiments[id]} disabled={!!model.pending} onCheckedChange={(open) => { void model.setOpen(id, open); }} /></div><Button asChild variant="outline" className="mt-auto"><Link href={`/learn/experiments/workspace#course/${id}`}>{t("preview")}</Link></Button></article>)}</div></section>
      <TeacherLabAssessments key={model.selected.id} accessToken={accessToken} classroomID={model.selected.id} />
    </> : !model.error && <div className="space-y-5 py-12 text-center"><p className="text-sm text-muted-foreground">{t("noClassrooms")}</p><Button asChild><Link href="/classrooms">{t("manageClassrooms")}</Link></Button></div>}
  </div>;
}
