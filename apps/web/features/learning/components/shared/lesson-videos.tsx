"use client";

import { ArrowRight, ArrowUpRight, BookOpen, Video } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { COURSE_LESSON_VIDEOS, COURSE_VIDEO_EPISODES, COURSE_VIDEO_SOURCE, courseVideoURL } from "@/features/learning/model/course-videos";
import { useAuthSession } from "@/shared/auth/auth-session-context";

export function LessonVideos({ lessonId, showActions = false }: { lessonId: string; showActions?: boolean }) {
  const t = useTranslations("learning.preview");
  const { user } = useAuthSession();
  const videos = COURSE_LESSON_VIDEOS[lessonId];
  if (!videos && !showActions) return null;

  return (
    <section aria-labelledby="lesson-videos-title" className="min-w-0 rounded-lg border border-border bg-card p-5 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <h3 id="lesson-videos-title" className="flex items-center gap-2 font-display text-xl font-normal">
          <Video className="size-4 text-primary" strokeWidth={1.6} aria-hidden />
          {t("videos")}
        </h3>
        <a href={`https://www.bilibili.com/video/${COURSE_VIDEO_SOURCE.bvid}/`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35">
          {t("fullCourse")}<ArrowUpRight className="size-4" strokeWidth={1.6} aria-hidden /><span className="sr-only">{t("newTab")}</span>
        </a>
      </header>
      {videos ? <>
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <div className="flex gap-2"><dt className="text-muted-foreground">{t("lecturer")}</dt><dd>{t("lecturerName")}</dd></div>
          <div className="flex gap-2"><dt className="text-muted-foreground">{t("source")}</dt><dd lang="zh-CN">Bilibili · {COURSE_VIDEO_SOURCE.uploader}</dd></div>
        </dl>
        <h4 className="mt-6 mb-2 text-sm font-medium">{t("recommended")}</h4>
        <VideoList pages={videos.recommended} />
        {videos.extra.length > 0 && <details className="mt-5">
          <summary className="cursor-pointer rounded-md py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35">{t("extra", { count: videos.extra.length })}</summary>
          <VideoList pages={videos.extra} />
        </details>}
      </> : <p role="status" className="py-6 text-sm">{t("unavailable")}</p>}
      {showActions && <nav aria-label={t("nextSteps")} className="mt-6 flex flex-wrap gap-3 border-t border-border pt-5">
        <Button asChild variant="outline"><Link href={`/learn/knowledge?lesson=${encodeURIComponent(lessonId)}`} prefetch={false}><BookOpen className="size-4" strokeWidth={1.6} aria-hidden />{t("notes")}</Link></Button>
        {user?.role === "student" && <Button asChild><Link href="/activities" prefetch={false}>{t("activities")}<ArrowRight className="size-4" strokeWidth={1.6} aria-hidden /></Link></Button>}
      </nav>}
    </section>
  );
}

function VideoList({ pages }: { pages: number[] }) {
  const t = useTranslations("learning.preview");
  return <ol className="divide-y divide-border">
    {pages.map((page) => {
      const video = COURSE_VIDEO_EPISODES[page];
      return <li key={page}>
        <a href={courseVideoURL(page)} target="_blank" rel="noopener noreferrer" className="group grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-md py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto]">
          <span className="self-start font-mono text-sm text-muted-foreground tabular-nums">P{page}</span>
          <span lang="zh-CN" className="min-w-0 break-words text-base leading-6 group-hover:text-primary">{video.title}</span>
          <span className="col-start-2 flex flex-wrap items-center gap-3 text-sm sm:col-start-auto sm:flex-col sm:items-end sm:gap-1">
            <span className="font-mono text-muted-foreground tabular-nums"><span className="sr-only">{t("duration")}</span>{Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, "0")}</span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap text-primary">{t("watch")}<ArrowUpRight className="size-4" strokeWidth={1.6} aria-hidden /><span className="sr-only">{t("newTab")}</span></span>
          </span>
        </a>
      </li>;
    })}
  </ol>;
}
