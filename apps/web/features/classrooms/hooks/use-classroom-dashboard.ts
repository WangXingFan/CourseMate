"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { listStudentAttendance } from "@/shared/api/attendance";
import { listStudentQuizzes } from "@/shared/api/classrooms";
import { listStudentHomeworks } from "@/shared/api/homeworks";
import { listAssignedPractice } from "@/shared/api/practice-assignments";
import { ApiError } from "@/shared/api/http-client";
import { listLabAssessments } from "@/shared/api/lab-assessments";
import { getLearningProgress } from "@/shared/api/learning";
import { getLearningCorrections } from "@/shared/api/learning-corrections";
import { useClassroomAnswerDrafts } from "./use-classroom-answer-drafts";

export type DashboardTask = {
  state?: "open" | "scheduled" | "overdue" | "inProgress";
  id: string;
  kind: "attendance" | "quiz" | "homework" | "practice" | "lab" | "review";
  title: string;
  href: string;
  deadline?: string;
  startsAt?: string;
};
type Section = { kind: DashboardTask["kind"]; items: DashboardTask[]; error: string; loading: boolean; notJoined?: boolean; assigned?: number; errorCode?: string };
const KINDS = ["attendance", "quiz", "homework", "practice", "lab", "review"] as const;

export function useClassroomDashboard(accessToken: string, owner: string) {
  const t = useTranslations("classrooms.dashboard");
  const resolveError = useLocalizedErrorMessage();
  const [revision, setRevision] = useState(0);
  const [sections, setSections] = useState<Section[]>([]);
  const { readDraft: readHomework } = useClassroomAnswerDrafts(owner, "homework");
  const { readDraft: readQuiz } = useClassroomAnswerDrafts(owner, "quiz");
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
    const assigned = (kind: Section["kind"], count: number) => {
      if (!signal.aborted) setSections((current) => current.map((section) => section.kind === kind ? { ...section, assigned: count } : section));
    };
    const requests: Record<DashboardTask["kind"], () => Promise<DashboardTask[]>> = {
      attendance: async () => (await listStudentAttendance(accessToken, signal)).items
        .filter((item) => item.session.open && !item.record.checkedAt && !item.record.corrections.length)
        .map(({ session }) => ({ id: session.id, kind: "attendance", title: session.title, deadline: session.endsAt, href: `/activities#attendance-${session.id}` })),
      quiz: async () => {
        const { quizzes } = await listStudentQuizzes(accessToken, signal);
        assigned("quiz", quizzes.length);
        return quizzes.filter((item) => !item.submitted).map((item) => ({ id: item.id, kind: "quiz", state: item.status === "closed" ? "overdue" : readQuiz(item.id) ? "inProgress" : "open", title: item.title, href: `/activities#quiz-${item.id}` }));
      },
      homework: async () => {
        const { items } = await listStudentHomeworks(accessToken, signal);
        assigned("homework", items.length);
        return items.filter((item) => !item.submission && item.status !== "withdrawn").map((item) => ({ id: item.id, kind: "homework", state: item.status === "closed" ? "overdue" : item.status === "scheduled" ? "scheduled" : readHomework(item.id) ? "inProgress" : "open", title: item.title, deadline: item.deadline, startsAt: item.status === "scheduled" ? item.startsAt : undefined, href: `/homeworks#${item.id}` }));
      },
      practice: async () => {
        const { items } = await listAssignedPractice(accessToken, undefined, signal);
        assigned("practice", items.length);
        return items.filter((item) => item.open && !item.submission).map((item) => ({ id: item.id, kind: "practice", state: "open", title: item.title, deadline: item.deadline, href: `/activities#practice-${item.id}` }));
      },
      lab: async () => {
        const { items } = await listLabAssessments(accessToken, undefined, signal);
        assigned("lab", items.length);
        return items.flatMap((assignment) => {
          const state = assignment.active ? assignment.inProgress ? "inProgress" : "open" : assignment.open && Date.parse(assignment.startsAt) > Date.now() ? "scheduled" : "overdue";
          return assignment.pendingTaskId ? [{ id: assignment.id, kind: "lab", state, startsAt: state === "scheduled" ? assignment.startsAt : undefined, title: t("labTitle", { course: assignment.courseId.slice(1) }), deadline: assignment.deadline ?? undefined, href: `/learn/experiments/assessment#${assignment.pendingTaskId}` }] : [];
        });
      },
      review: async () => {
        const [{ questions }, corrections] = await Promise.all([getLearningProgress(accessToken, signal), getLearningCorrections(accessToken, signal)]);
        const count = questions.filter((item) => item.reviewDue).length + corrections.items.filter((item) => item.reviewDue).length;
        return count ? [{ id: "due", kind: "review", title: t("reviewCount", { count }), href: "/learn/progress" }] : [];
      },
    };
    for (const kind of KINDS) {
      void requests[kind]().then((items) => {
        if (!signal.aborted) setSections((current) => current.map((section) => section.kind === kind ? { ...section, items, error: "", loading: false } : section));
      }).catch((cause: unknown) => {
        if (signal.aborted) return;
        const error = cause instanceof ApiError && cause.errorCode === "classroom.not_joined" ? "" : resolveError(cause);
        setSections((current) => current.map((section) => section.kind === kind ? { kind, items: [], error, errorCode: cause instanceof ApiError ? cause.errorCode : "", loading: false, notJoined: cause instanceof ApiError && cause.errorCode === "classroom.not_joined" } : section));
      });
    }
    return () => controller.abort();
  }, [accessToken, revision, resolveError, t, readHomework, readQuiz]);
  const tasks = sections.flatMap((section) => section.items).sort((a, b) => {
    const priority = (item: DashboardTask) => item.state === "overdue" ? 4 : item.startsAt ? 3 : item.kind === "attendance" ? 0 : item.kind === "review" ? 2 : 1;
    return priority(a) - priority(b) || (Date.parse(a.deadline ?? "") || Infinity) - (Date.parse(b.deadline ?? "") || Infinity) || a.title.localeCompare(b.title);
  });
  const notJoined = sections.some((section) => section.notJoined);
  return { tasks, notJoined, hasAssignments: sections.some((section) => (section.assigned ?? 0) > 0), errors: sections.filter((section) => section.error && !(notJoined && section.kind === "lab" && section.errorCode === "lab.forbidden")), loading: sections.length === 0 || sections.some((section) => section.loading), refresh: () => setRevision((value) => value + 1) };
}
