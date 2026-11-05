"use client";

import { Info, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { AnalyticsVisits } from "@/features/analytics/components/sections/analytics-visits";
import { AnalyticsAssessments } from "@/features/analytics/components/sections/analytics-assessments";
import { AnalyticsLessons } from "@/features/analytics/components/sections/analytics-lessons";
import { AnalyticsSelect } from "@/features/analytics/components/shared/analytics-controls";
import { useAnalyticsReport } from "@/features/analytics/hooks/use-analytics-report";
import { useAuthSession } from "@/shared/auth/auth-session-context";
import { cn } from "@/lib/utils";

export function AnalyticsPage() {
  const { user, userStatus, accessToken } = useAuthSession();
  const t = useTranslations("analytics");
  if (userStatus === "loading") return <div className="m-auto"><Spinner className="size-5" /></div>;
  if (!user || !["teacher", "admin", "superadmin"].includes(user.role)) return <main className="m-auto p-6 text-sm" role="alert">{t("forbidden")}</main>;
  return <AnalyticsDashboard key={user.publicID} accessToken={accessToken} admin={user.role !== "teacher"} />;
}

function AnalyticsDashboard({ accessToken, admin }: { accessToken: string; admin: boolean }) {
  const t = useTranslations("analytics");
  const locale = useLocale();
  const model = useAnalyticsReport(accessToken);
  const [tab, setTab] = useState("visits");
  const data = model.data;
  const date = (value: string) => new Date(value).toLocaleString(locale, { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  return <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background" data-analytics>
    <header className="shrink-0 border-b border-border px-5 py-6 pb-8 md:px-8"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4"><div className="flex flex-wrap items-center gap-3"><h1 className="font-display text-3xl font-normal tracking-[-0.015em] md:text-4xl">{t("title")}</h1><Badge variant="outline">{t(admin ? "siteScope" : "teacherScope")}</Badge></div><div className="flex gap-2"><Dialog><DialogTrigger asChild><Button variant="ghost"><Info className="size-4" strokeWidth={1.6} />{t("definitions")}</Button></DialogTrigger><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{t("definitions")}</DialogTitle><DialogDescription>{t("reportTimezone")}</DialogDescription></DialogHeader><div className="space-y-5 text-sm leading-relaxed">{["visits", "assessments", "labs", "lessons"].map((key) => <p key={key}>{t(`definitionsText.${key}`)}</p>)}</div></DialogContent></Dialog><Button variant="outline" disabled={model.loading} onClick={model.refresh}><RefreshCw className="size-4" strokeWidth={1.6} />{t("refresh")}</Button></div></div></header>
    <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-5 py-6 md:px-8"><div className="mx-auto min-w-0 max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><AnalyticsSelect label={t("classroom")} value={model.classroomId} onChange={model.setClassroomId}><option value="">{t(admin ? "siteScope" : "allClassrooms")}</option>{data?.classrooms.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</AnalyticsSelect>{tab === "visits" && <AnalyticsSelect label={t("visitPeriod")} value={String(model.days)} onChange={(value) => model.setDays(Number(value))}>{[7, 30, 90].map((days) => <option key={days} value={days}>{t("lastDays", { days })}</option>)}</AnalyticsSelect>}</div>
      <div role="tablist" aria-label={t("title")} className="flex gap-1 overflow-x-auto border-b border-border">{["visits", "homeworks", "labs", "lessons"].map((item) => <button type="button" role="tab" id={`tab-${item}`} aria-controls={`panel-${item}`} aria-selected={tab === item} key={item} onClick={() => setTab(item)} className={cn("shrink-0 border-b-2 px-4 py-3 text-sm focus-visible:outline-2 focus-visible:outline-ring", tab === item ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{t(`tabs.${item}`)}</button>)}</div>
      {model.error && <p role="alert" className="text-sm text-destructive">{model.error}</p>}
      {model.loading ? <div className="flex min-h-72 items-center justify-center" role="status" aria-label={t("loading")}><Spinner className="size-5" /></div> : !model.error && data && <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="min-w-0" key={`${tab}:${model.classroomId}`}>
        <div className="mb-6 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{tab === "visits" ? `${data.from} — ${data.through}` : t("cumulative")}</span><span>{t("updatedAt", { time: date(data.generatedAt) })} · {t("beijingTime")}</span></div>
        {tab === "visits" ? <AnalyticsVisits data={{ ...data, classrooms: data.classrooms.filter((item) => !model.classroomId || item.id === model.classroomId) }} /> : tab === "homeworks" ? <AnalyticsAssessments items={data.homeworks} /> : tab === "labs" ? <AnalyticsAssessments items={data.labs} lab /> : <AnalyticsLessons items={data.lessons} />}
        {tab === "visits" && <p className="mt-6 text-sm text-muted-foreground">{data.firstVisitAt ? t("firstVisit", { time: date(data.firstVisitAt) }) : t("noVisits")}</p>}
      </div>}
    </div></div>
  </main>;
}
