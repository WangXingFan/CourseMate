"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { listStudentAttendance } from "@/shared/api/attendance";
import { listStudentQuizzes } from "@/shared/api/classrooms";
import { listStudentHomeworks } from "@/shared/api/homeworks";
import { listAssignedPractice } from "@/shared/api/practice-assignments";
import { ApiError } from "@/shared/api/http-client";
import { listLabAssessments, readLabAssessment } from "@/shared/api/lab-assessments";
import { getLearningProgress } from "@/shared/api/learning";

export type DashboardTask = {
  id: string;
  kind: "attendance" | "quiz" | "homework" | "practice" | "lab" | "review";
  title: string;
  href: string;
  deadline?: string;
  startsAt?: string;
};
type Section = { kind: DashboardTask["kind"]; items: DashboardTask[]; error: string; loading: boolean };
const KINDS = ["attendance", "quiz", "homework", "practice", "lab", "review"] as const;

export function useClassroomDashboard(accessToken: string) {
  const t = useTranslations("classrooms.dashboard");
  const resolveError = useLocalizedErrorMessage();
  const [revision, setRevision] = useState(0);
  const [sections, setSections] = useState<Section[]>([]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") setRevision((value) => value + 1); };
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => { window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    setSections(KINDS.map((kind) => ({ kind, items: [], error: "", loading: true })));
    const requests: Record<DashboardTask["kind"], () => Promise<DashboardTask[]>> = {
      attendance: async () => (await listStudentAttendance(accessToken, signal)).items
        .filter((item) => item.session.open && !item.record.checkedAt && !item.record.corrections.length)
        .map(({ session }) => ({ id: session.id, kind: "attendance", title: session.title, deadline: session.endsAt, href: `/activities#attendance-${session.id}` })),
      quiz: async () => (await listStudentQuizzes(accessToken, signal)).quizzes
        .filter((item) => item.status === "open" && !item.submitted)
        .map((item) => ({ id: item.id, kind: "quiz", title: item.title, href: `/activities#quiz-${item.id}` })),
      homework: async () => (await listStudentHomeworks(accessToken, signal)).items
        .filter((item) => !item.submission && item.status !== "closed")
        .map((item) => ({ id: item.id, kind: "homework", title: item.title, deadline: item.deadline, startsAt: item.status === "scheduled" ? item.startsAt : undefined, href: `/homeworks#${item.id}` })),
      practice: async () => (await listAssignedPractice(accessToken, undefined, signal)).items
        .filter((item) => item.open && !item.submission)
        .map((item) => ({ id: item.id, kind: "practice", title: item.title, deadline: item.deadline, href: `/activities#practice-${item.id}` })),
      lab: async () => {
        const { items } = await listLabAssessments(accessToken, undefined, signal);
        const results = await Promise.all(items.filter((item) => item.active).map((item) => readLabAssessment(accessToken, item.id, signal)));
        return results.flatMap(({ assignment, tasks }) => {
          const unfinished = tasks.find((task) => !task.attempts.some((attempt) => attempt.submittedAt) || task.checkpoints.some((point) => !point.passed));
          return unfinished ? [{ id: assignment.id, kind: "lab", title: t("labTitle", { course: assignment.courseId.slice(1) }), deadline: assignment.deadline ?? undefined, href: `/learn/experiments/assessment#${unfinished.id}` }] : [];
        });
      },
      review: async () => {
        const { questions } = await getLearningProgress(accessToken, signal);
        const count = questions.filter((item) => item.reviewDue).length;
        return count ? [{ id: "due", kind: "review", title: t("reviewCount", { count }), href: "/learn/progress" }] : [];
      },
    };
    for (const kind of KINDS) {
      void requests[kind]().then((items) => {
        if (!signal.aborted) setSections((current) => current.map((section) => section.kind === kind ? { kind, items, error: "", loading: false } : section));
      }).catch((cause: unknown) => {
        if (signal.aborted) return;
        const error = cause instanceof ApiError && cause.errorCode === "classroom.not_joined" ? "" : resolveError(cause);
        setSections((current) => current.map((section) => section.kind === kind ? { kind, items: [], error, loading: false } : section));
      });
    }
    return () => controller.abort();
  }, [accessToken, revision, resolveError, t]);
  const tasks = sections.flatMap((section) => section.items).sort((a, b) => {
    const priority = (item: DashboardTask) => item.startsAt ? 3 : item.kind === "attendance" ? 0 : item.kind === "review" ? 2 : 1;
    return priority(a) - priority(b) || (Date.parse(a.deadline ?? "") || Infinity) - (Date.parse(b.deadline ?? "") || Infinity) || a.title.localeCompare(b.title);
  });
  return { tasks, errors: sections.filter((section) => section.error), loading: sections.length === 0 || sections.some((section) => section.loading), refresh: () => setRevision((value) => value + 1) };
}
