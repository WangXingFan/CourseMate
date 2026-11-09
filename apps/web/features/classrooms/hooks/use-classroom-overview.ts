"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { listAttendance } from "@/shared/api/attendance";
import { listClassroomQuizzes } from "@/shared/api/classrooms";
import { listHomeworks } from "@/shared/api/homeworks";
import { listAssignedPractice } from "@/shared/api/practice-assignments";
import { listLabAssessments } from "@/shared/api/lab-assessments";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import type { ClassroomDetailTab } from "@/features/classrooms/types/classrooms";

type OverviewItem = { id: string; title: string; tab?: ClassroomDetailTab; href?: string; deadline?: string; submitted?: number; state: "active" | "scheduled" | "draft" };
type OverviewSection = { kind: string; items: OverviewItem[]; error: string; loading: boolean };

export function useClassroomOverview(accessToken: string, classroomID: string) {
  const t = useTranslations("classrooms.overview");
  const resolveError = useLocalizedErrorMessage();
  const [sections, setSections] = useState<OverviewSection[]>([]);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") { setRevision((v) => v + 1); setNow(Date.now()); } };
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => { window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const requests: Record<string, () => Promise<OverviewItem[]>> = {
      attendance: async () => (await listAttendance(accessToken, classroomID, signal)).items.filter((i) => i.open).map((i) => ({ id: i.id, title: i.title, tab: "attendance", deadline: i.endsAt, state: "active" })),
      activities: async () => (await listClassroomQuizzes(accessToken, classroomID, signal)).quizzes.filter((i) => i.status !== "closed").map((i) => ({ id: i.id, title: i.title, tab: "activities", submitted: i.submissionCount, state: i.status === "draft" ? "draft" : "active" })),
      homeworks: async () => (await listHomeworks(accessToken, classroomID, signal)).items.filter((i) => Date.parse(i.endsAt) > Date.now()).map((i) => ({ id: i.id, title: i.title, tab: "homeworks", deadline: i.endsAt, submitted: i.submissionCount, state: i.status === "scheduled" ? "scheduled" : "active" })),
      practice: async () => (await listAssignedPractice(accessToken, classroomID, signal)).items.filter((i) => i.open).map((i) => ({ id: i.id, title: i.title, tab: "practice", deadline: i.deadline, submitted: i.students.filter((s) => s.submission).length, state: "active" })),
      labs: async () => (await listLabAssessments(accessToken, classroomID, signal)).items.filter((i) => i.active).map((i) => ({ id: i.id, title: t("lab", { number: i.courseId.slice(1) }), href: `/learn/experiments?classroom=${encodeURIComponent(classroomID)}`, deadline: i.deadline ?? undefined, state: "active" })),
    };
    setSections(Object.keys(requests).map((kind) => ({ kind, items: [], error: "", loading: true })));
    for (const [kind, request] of Object.entries(requests)) {
      void request().then((items) => { if (!signal.aborted) setSections((current) => current.map((s) => s.kind === kind ? { kind, items, error: "", loading: false } : s)); })
        .catch((cause) => { if (!signal.aborted) setSections((current) => current.map((s) => s.kind === kind ? { kind, items: [], error: resolveError(cause), loading: false } : s)); });
    }
    return () => controller.abort();
  }, [accessToken, classroomID, revision, resolveError, t]);
  const items = sections.flatMap((s) => s.items.map((item) => ({ ...item, kind: s.kind }))).sort((a, b) => (Date.parse(a.deadline ?? "") || Infinity) - (Date.parse(b.deadline ?? "") || Infinity));
  return { items, errors: sections.filter((s) => s.error), loading: !sections.length || sections.some((s) => s.loading), now, refresh: () => { setRevision((v) => v + 1); setNow(Date.now()); } };
}
