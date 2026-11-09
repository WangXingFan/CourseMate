"use client";

import { ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SpinnerLabel } from "@/components/ui/spinner";
import { useClassroomDashboard } from "@/features/classrooms/hooks/use-classroom-dashboard";
import { useAuthSession } from "@/shared/auth/auth-session-context";
import { ContinueLearning, RecommendedPractice } from "@/features/learning";

export function StudentDashboardEntry() {
  const { user, userStatus, accessToken, refreshUser } = useAuthSession();
  const t = useTranslations("classrooms.dashboard");
  const router = useRouter();
  useEffect(() => {
    if (userStatus === "ready" && user && user.role !== "student") router.replace(user.role === "teacher" ? "/classrooms" : "/chat");
  }, [user, userStatus, router]);
  if (userStatus === "failed") return <main className="m-auto space-y-4 p-6"><p role="alert">{t("profileError")}</p><Button variant="outline" onClick={() => void refreshUser()}>{t("refresh")}</Button></main>;
  if (user?.role !== "student") return <div className="m-auto"><SpinnerLabel /></div>;
  return <StudentDashboard key={user.publicID} accessToken={accessToken} owner={user.publicID} />;
}

function StudentDashboard({ accessToken, owner }: { accessToken: string; owner: string }) {
  const t = useTranslations("classrooms.dashboard");
  const locale = useLocale();
  const model = useClassroomDashboard(accessToken, owner);
  const [filter, setFilter] = useState("all");
  const visible = model.tasks.filter((item) => filter === "all" || (item.state ?? "open") === filter);
  const date = (value: string) => new Date(value).toLocaleString(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return <main className="h-full min-h-0 flex-1 overflow-y-auto bg-background">
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-10 md:py-10">
      <header className="flex items-center justify-between gap-4 border-b border-border pb-8">
        <h1 className="font-display text-3xl font-normal tracking-[-0.015em] md:text-4xl">{t("title")}</h1>
        <Button variant="ghost" onClick={model.refresh} disabled={model.loading}><RefreshCw className="size-4" strokeWidth={1.6} aria-hidden />{t("refresh")}</Button>
      </header>
      <ContinueLearning />
      <div className="grid items-start gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_13rem]">
        <section aria-labelledby="dashboard-tasks">
          <div className="mb-4 flex items-baseline justify-between gap-4"><h2 id="dashboard-tasks" className="font-display text-2xl font-normal">{t("tasks")}</h2><span className="font-mono text-sm tabular-nums">{model.tasks.length}</span></div>
          {model.errors.map((item) => <p key={item.kind} role="alert" className="mb-4 text-sm text-destructive">{t(`kinds.${item.kind}`)}：{item.error}</p>)}
          {model.loading && <div role="status" className="py-5 text-sm"><SpinnerLabel>{t("loading")}</SpinnerLabel></div>}
          {!model.loading && model.notJoined && <p className="mb-5 border-l-2 border-primary pl-4 text-sm leading-7">{t("notJoined")} <Link href="/activities" className="text-primary underline">{t("joinClass")}</Link></p>}
          {!model.loading && model.tasks.length === 0 && <p className="border-y border-border py-12 text-base">{t(model.errors.length ? "unavailable" : model.notJoined ? "selfStudy" : model.hasAssignments ? "empty" : "unassigned")}</p>}
          {model.tasks.length > 0 && <label className="mb-5 flex items-center gap-3 text-sm">{t("filter")}<select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3">{["all", "open", "inProgress", "scheduled", "overdue"].map((key) => <option key={key} value={key}>{t(`states.${key}`)}</option>)}</select></label>}
          {!model.loading && model.tasks.length > 0 && !visible.length && <p className="py-5 text-sm">{t("filteredEmpty")}</p>}
          <ol className="divide-y divide-border border-t border-border">
            {visible.map((item, index) => <li key={`${item.kind}:${item.id}`}>
              <Link href={item.href} className="group flex items-center gap-4 py-6 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="w-7 shrink-0 self-start pt-1 font-mono text-sm text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"><span className={item.kind === "attendance" ? "text-seal" : "text-muted-foreground"}>{t(`kinds.${item.kind}`)}</span><span className={item.state === "overdue" ? "text-destructive" : "text-primary"}>{t(`states.${item.state ?? "open"}`)}</span>{item.startsAt ? <span>{t("startsAt", { time: date(item.startsAt) })}</span> : item.deadline && <span>{t("deadline", { time: date(item.deadline) })}</span>}</div><h3 className="break-words font-display text-xl font-normal md:text-2xl">{item.title}</h3></div>
                <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" strokeWidth={1.5} aria-hidden />
              </Link>
            </li>)}
          </ol>
        </section>
        <nav aria-label={t("resources")} className="border-t border-border pt-5 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
          <h2 className="mb-4 font-display text-xl font-normal">{t("resources")}</h2>
          {[["knowledge", "/learn/knowledge"], ["preview", "/learn/preview"], ["experiments", "/learn/experiments"], ["mastery", "/learn/mastery"], ["chat", "/chat"]].map(([key, href]) => <Link key={key} href={href} className="flex min-h-11 items-center justify-between gap-3 border-b border-border py-3 text-sm hover:text-primary focus-visible:outline-ring">{t(key)}<ArrowRight className="size-4" strokeWidth={1.5} aria-hidden /></Link>)}
          <RecommendedPractice />
        </nav>
      </div>
    </div>
  </main>;
}
