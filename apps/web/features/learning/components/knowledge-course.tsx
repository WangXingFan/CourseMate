"use client";

import { ArrowLeft, ArrowRight, BookOpen, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLearningCourse, useLearningCourseLesson } from "@/features/learning/hooks/use-learning-course";
import { COURSE_LESSON_VIDEOS } from "@/features/learning/model/course-videos";
import type { LearningCourseLessonData } from "@/shared/api/learning-types";
import { StreamdownRender } from "@/shared/components/markdown/streamdown-render";
import { LessonVideos } from "./shared/lesson-videos";
import { LearningHelp } from "./shared/learning-help";
import { useLearningReading, useLearningCourseSearch } from "@/features/learning/hooks/use-learning-reading";
import { courseExperimentHref } from "@/features/learning/model/course-experiments";

export function KnowledgeCourse({ preview = false }: { preview?: boolean }) {
  const t = useTranslations("learning.knowledge");
  const p = useTranslations("learning.preview");
  const params = useSearchParams();
  const c = useTranslations("learning.continuity");
  const reading = useLearningReading();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const restored = React.useRef("");
  const [bookmarksOnly, setBookmarksOnly] = React.useState(false);
  const catalog = useLearningCourse();
  const [search, setSearch] = React.useState("");
  const [chapter, setChapter] = React.useState("");
  const searchResult = useLearningCourseSearch(search);
  const practiceLessons = (catalog.data?.lessons ?? []).filter((lesson) => !preview || COURSE_LESSON_VIDEOS[lesson.id]);
  const lessonHref = (id: string) => `/learn/${preview ? "preview" : "knowledge"}?lesson=${encodeURIComponent(id)}`;
  const selected = params.get("lesson")?.trim() || (!preview && practiceLessons.some((lesson) => lesson.id === reading.data.last) ? reading.data.last : practiceLessons[0]?.id) || "";
  const detail = useLearningCourseLesson(selected);
  const chapters = [...new Set(practiceLessons.map((lesson) => lesson.chapter))];
  const filtered = practiceLessons.filter((lesson) => (!chapter || lesson.chapter === chapter) && (!bookmarksOnly || reading.data.bookmarks.includes(lesson.id)) && (!search.trim() || searchResult.matches.includes(lesson.id)));
  const index = practiceLessons.findIndex((lesson) => lesson.id === selected);
  const previous = practiceLessons[index - 1];
  const next = index >= 0 ? practiceLessons[index + 1] : undefined;

  React.useEffect(() => {
    if (!reading.ready || !detail.data || preview || restored.current === detail.ownerKey) return;
    const position = reading.data.positions[selected] ?? 0;
    const title = detail.data.lesson.title;
    const frame = requestAnimationFrame(() => {
      restored.current = detail.ownerKey;
      const element = scrollRef.current;
      if (element) element.scrollTop = position;
      reading.remember(selected, title, position);
    });
    return () => cancelAnimationFrame(frame);
  }, [reading.ready, reading.data.positions, reading.remember, detail.data, detail.ownerKey, selected, preview]);
  React.useEffect(() => {
    const element = scrollRef.current;
    if (!element || !detail.data || !reading.ready || preview) return;
    const title = detail.data.lesson.title;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => reading.remember(selected, title, element.scrollTop);
    const onScroll = () => { clearTimeout(timer); timer = setTimeout(save, 250); };
    element.addEventListener("scroll", onScroll);
    return () => { clearTimeout(timer); element.removeEventListener("scroll", onScroll); };
  }, [detail.data, reading.ready, reading.remember, selected, preview]);

  return (
    <div ref={scrollRef} className="h-full min-h-0 overflow-y-auto bg-background [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto w-full max-w-5xl px-5 pt-6 pb-16 md:px-10 md:pt-10">
        <Link href="/learn" prefetch={false} className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"><ArrowLeft className="size-4" strokeWidth={1.6} aria-hidden />{t("back")}</Link>
        <header className="mt-6 mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-border pb-8">
          <h1 className="font-display text-3xl leading-[1.12] font-normal tracking-[-0.015em] text-foreground md:text-4xl">{preview ? p("title") : t("title")}</h1>
        </header>

        {catalog.error && <ErrorNotice error={catalog.error} reload={catalog.reload} />}
        <div className="grid items-start gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="min-w-0 lg:sticky lg:top-4">
            <label htmlFor="knowledge-search" className="mb-2 flex items-center gap-2 text-sm font-medium"><Search className="size-4" strokeWidth={1.6} aria-hidden />{t("catalog")}</label>
            <Input id="knowledge-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={c("searchBody")} maxLength={100} />
            <label htmlFor="knowledge-chapter" className="sr-only">{t("chapter")}</label>
            <select id="knowledge-chapter" value={chapter} onChange={(event) => setChapter(event.target.value)} className="mt-2 h-9 w-full rounded-md border border-input/70 bg-background px-2 text-sm">
              <option value="">{t("chooseChapter")}</option>
              {chapters.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <Button variant="ghost" className="mt-3" aria-pressed={bookmarksOnly} onClick={() => setBookmarksOnly(!bookmarksOnly)}>{c(bookmarksOnly ? "allLessons" : "bookmarks")}</Button>
            {searchResult.loading && <p role="status" className="py-2 text-sm">{c("loading")}</p>}
            {searchResult.error && <p role="alert" className="py-2 text-sm text-destructive">{searchResult.error}</p>}
            <nav aria-label={t("catalog")} className="mt-4 max-h-60 overflow-y-auto border-t border-border lg:max-h-[65vh]">
              {filtered.map((lesson) => <Link key={lesson.id} href={lessonHref(lesson.id)} prefetch={false} aria-current={selected === lesson.id ? "page" : undefined} className={`flex items-center gap-2 border-b border-border px-2 py-2.5 text-sm leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 ${selected === lesson.id ? "bg-accent text-foreground shadow-[inset_2px_0_0_var(--primary)]" : "text-muted-foreground hover:text-foreground"}`}>
                <span className="w-8 shrink-0 font-mono text-xs tabular-nums">{lesson.number}</span><span className="flex-1">{lesson.title}</span>
              </Link>)}
              {catalog.data && filtered.length === 0 && <p className="py-4 text-sm text-muted-foreground">{t("empty")}</p>}
            </nav>
          </aside>

          <main className="min-w-0">
            {reading.failed && <p role="alert" className="mb-4 text-sm text-destructive">{c("storageFailed")}</p>}
            {detail.data && <div className="mb-5 flex flex-wrap gap-3"><Button variant="outline" aria-pressed={reading.data.bookmarks.includes(selected)} onClick={() => reading.toggleBookmark(selected)}>{c(reading.data.bookmarks.includes(selected) ? "unbookmark" : "bookmark")}</Button><Button asChild variant="outline"><Link href={`/learn/practice?concept=${encodeURIComponent(`lesson:${selected}`)}`}>{c("practice")}</Link></Button><Button asChild variant="ghost"><Link href={courseExperimentHref(selected)}>{c("experiments")}</Link></Button><LearningHelp title={detail.data.lesson.title} context={detail.data.markdown} returnHref={lessonHref(selected)} /></div>}
            {/* With an empty catalog there is no lesson to load; the sidebar already shows the empty state. */}
            {catalog.data && !selected ? null : detail.error ? <ErrorNotice error={detail.error} reload={detail.reload} /> : !detail.data ? <p role="status" className="py-12 text-sm text-muted-foreground">{t("loading")}</p> : <LessonContent key={`${detail.ownerKey}|${detail.data.version}`} data={detail.data} preview={preview} />}
            {detail.data && <nav aria-label={t("lessonNavigation")} className="mt-8 flex flex-wrap justify-between gap-3 border-t border-border pt-5">
              {previous ? <Link href={lessonHref(previous.id)} prefetch={false} className="flex max-w-full items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4 shrink-0" strokeWidth={1.6} aria-hidden /><span className="font-mono text-xs">{previous.number}</span>{previous.title}</Link> : <span />}
              {next && <Link href={lessonHref(next.id)} prefetch={false} className="flex max-w-full items-center gap-2 text-sm text-muted-foreground hover:text-primary"><span className="font-mono text-xs">{next.number}</span>{next.title}<ArrowRight className="size-4 shrink-0" strokeWidth={1.6} aria-hidden /></Link>}
            </nav>}
          </main>
        </div>
      </div>
    </div>
  );
}

function LessonContent({ data, preview }: { data: LearningCourseLessonData; preview: boolean }) {
  const t = useTranslations("learning.knowledge");
  const [reading, setReading] = React.useState(true);
  return <>
    <p className="text-xs text-muted-foreground">{data.lesson.chapter}</p>
    <h2 className="mt-2 mb-6 font-display text-2xl font-normal text-foreground"><span className="mr-3 font-mono text-lg text-muted-foreground">{data.lesson.number}</span>{" "}{data.lesson.title}</h2>
    {preview ? <LessonVideos lessonId={data.lesson.id} showActions /> :
      <section className="min-w-0 rounded-lg border border-border bg-card p-5 md:p-6">
        <button type="button" aria-expanded={reading} aria-controls="lesson-reading" onClick={() => setReading((value) => !value)} className="flex w-full items-center justify-between gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"><span className="flex items-center gap-2 font-display text-xl text-foreground"><BookOpen className="size-4 text-primary" strokeWidth={1.6} aria-hidden />{t("notes")}</span><span className="text-sm text-muted-foreground">{reading ? t("collapse") : t("expand")}</span></button>
        {reading && <div id="lesson-reading" lang="zh-CN" className="mt-5 min-w-0 overflow-x-auto text-sm leading-7"><StreamdownRender content={data.markdown} /></div>}
      </section>}
  </>;
}

function ErrorNotice({ error, reload }: { error: string; reload: () => void }) {
  const t = useTranslations("learning.knowledge");
  return <div role="alert" className="mb-4 rounded-lg border border-destructive/25 p-4 text-sm"><p className="text-destructive">{error}</p><Button type="button" size="sm" variant="outline" className="mt-3" onClick={reload}>{t("reload")}</Button></div>;
}
