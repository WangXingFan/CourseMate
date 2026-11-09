"use client";

import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SpinnerLabel } from "@/components/ui/spinner";
import { useClassroomOverview } from "@/features/classrooms/hooks/use-classroom-overview";
import type { ClassroomDetailTab } from "@/features/classrooms/types/classrooms";

export function ClassroomOverview({ accessToken, classroomID, onNavigate }: { accessToken: string; classroomID: string; onNavigate: (tab: ClassroomDetailTab) => void }) {
  const t = useTranslations("classrooms.overview");
  const locale = useLocale();
  const model = useClassroomOverview(accessToken, classroomID);
  const groups = [
    { key: "dueSoon", items: model.items.filter((i) => i.state === "active" && i.deadline && Date.parse(i.deadline) - model.now <= 86_400_000) },
    { key: "active", items: model.items.filter((i) => i.state === "active" && (!i.deadline || Date.parse(i.deadline) - model.now > 86_400_000)) },
    { key: "upcoming", items: model.items.filter((i) => i.state !== "active") },
  ];
  return <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8" data-classroom-overview>
    <div className="mb-7 flex items-center justify-between gap-3 border-b border-border pb-6"><h3 className="font-display text-2xl font-normal">{t("title")}</h3><Button variant="ghost" onClick={model.refresh} disabled={model.loading}><RefreshCw className="size-4" strokeWidth={1.6} aria-hidden />{t("refresh")}</Button></div>
    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">{(["attendance", "activities", "homeworks", "mastery"] as const).map((tab, index) => <button key={tab} type="button" onClick={() => onNavigate(tab)} className="flex min-h-20 items-center gap-3 rounded-lg border border-border px-4 py-5 text-left transition-colors hover:bg-accent focus-visible:outline-ring"><span aria-hidden className="font-mono text-sm text-muted-foreground">0{index + 1}</span><span className="flex-1 font-display text-lg">{t(`actions.${tab}`)}</span><ArrowRight className="size-4" strokeWidth={1.6} aria-hidden /></button>)}</div>
    <div className="mt-6 flex flex-wrap gap-3"><Button variant="outline" onClick={() => onNavigate("practice")}>{t("practice")}</Button><Button asChild variant="ghost"><Link href={`/learn/experiments?classroom=${encodeURIComponent(classroomID)}`}>{t("labs")}</Link></Button><Button asChild variant="ghost"><Link href="/exports">{t("exports")}</Link></Button></div>
    {model.errors.map((error) => <p role="alert" key={error.kind} className="mt-5 text-sm text-destructive">{t(`kinds.${error.kind}`)}：{error.error}</p>)}
    {model.loading && <div role="status" className="mt-6 text-sm"><SpinnerLabel>{t("loading")}</SpinnerLabel></div>}
    {groups.map((group) => <section key={group.key} className="mt-9"><div className="mb-4 flex items-baseline justify-between"><h4 className="font-display text-xl font-normal">{t(group.key)}</h4><span className="font-mono text-sm">{group.items.length}</span></div><div className="divide-y divide-border border-y border-border">
      {group.items.map((item) => <div key={`${item.kind}:${item.id}`} className="flex items-center justify-between gap-4 py-5"><div className="min-w-0 space-y-2"><p className="font-display text-xl">{item.title}</p><div className="flex flex-wrap gap-x-4 gap-y-2 text-sm"><span>{t(`kinds.${item.kind}`)}</span>{item.state !== "active" && <span>{t(item.state)}</span>}{item.deadline && <time dateTime={item.deadline}>{new Date(item.deadline).toLocaleString(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>}{item.submitted !== undefined && <span>{t("submitted", { count: item.submitted })}</span>}</div></div>{item.tab ? <Button variant="ghost" onClick={() => { if (item.tab) onNavigate(item.tab); }}>{t("open")}<ArrowRight className="size-4" aria-hidden /></Button> : item.href && <Button asChild variant="ghost"><Link href={item.href}>{t("open")}<ArrowRight className="size-4" aria-hidden /></Link></Button>}</div>)}
      {!group.items.length && !model.loading && <p className="py-5 text-sm text-muted-foreground">{t(model.errors.length ? "partial" : "empty")}</p>}
    </div></section>)}
  </div>;
}
