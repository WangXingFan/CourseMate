"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { listStudentHomeworks, submitHomework, type HomeworkResponse, type StudentHomeworksResponse } from "@/shared/api/homeworks";

export function useClassroomStudentHomeworks(accessToken: string) {
  const t = useTranslations("classrooms.homework");
  const resolveError = useLocalizedErrorMessage();
  const [data, setData] = useState<StudentHomeworksResponse>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [answers, setAnswers] = useState<Record<string, string[][]>>({});
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(Date.now);
  const offset = useRef(0), busy = useRef(false);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now() + offset.current), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setError("");
    void listStudentHomeworks(accessToken, controller.signal).then((next) => {
      if (controller.signal.aborted) return;
      offset.current = new Date(next.serverTime).getTime() - Date.now();
      setNow(Date.now() + offset.current); setData(next);
      setAnswers((current) => {
        const merged = { ...current };
        for (const item of next.items) if (item.questions.length) merged[item.id] = item.submission?.answers ?? current[item.id] ?? item.questions.map((q) => Array.from({ length: q.blankCount }, () => ""));
        return merged;
      });
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(resolveError(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, revision, resolveError]);
  useEffect(() => {
    const future = data?.items.filter((item) => item.status === "scheduled").map((item) => new Date(item.startsAt).getTime());
    if (!future?.length) return;
    const delay = Math.min(...future) - (Date.now() + offset.current);
    const timer = window.setTimeout(() => setRevision((v) => v + 1), Math.min(2_147_483_647, Math.max(1000, delay + 100)));
    return () => window.clearTimeout(timer);
  }, [data]);
  function setAnswer(id: string, question: number, blank: number, value: string) {
    setAnswers((current) => ({ ...current, [id]: (current[id] ?? []).map((row, i) => i === question ? row.map((answer, j) => j === blank ? value : answer) : row) }));
  }
  async function submit(item: HomeworkResponse) {
    if (busy.current) return false;
    const selected = answers[item.id] ?? [];
    if (selected.length !== item.questionCount || selected.some((row) => row.some((value) => !value.trim()))) { toast.error(t("answerAll")); return false; }
    busy.current = true; setPending(item.id);
    try {
      const submission = await submitHomework(accessToken, item.id, selected);
      setData((current) => current && ({ ...current, items: current.items.map((entry) => entry.id === item.id ? { ...entry, submission } : entry) }));
      toast.success(t("graded", { score: submission.score, total: item.total })); return true;
    } catch (cause) { toast.error(resolveError(cause)); setRevision((v) => v + 1); return false; }
    finally { busy.current = false; setPending(""); }
  }
  return { data, error, loading, pending, answers, now, setAnswer, submit, refresh: () => setRevision((v) => v + 1) };
}
