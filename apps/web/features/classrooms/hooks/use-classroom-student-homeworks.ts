"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { listStudentHomeworks, submitHomework, type HomeworkResponse, type StudentHomeworksResponse } from "@/shared/api/homeworks";
import { useClassroomAnswerDrafts } from "./use-classroom-answer-drafts";

export function useClassroomStudentHomeworks(accessToken: string, owner: string) {
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
  const { draftStatus, readDraft, writeDraft, clearDraft } = useClassroomAnswerDrafts(owner, "homework");
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
      const drafts = new Map(next.items.map((item) => {
        if (item.submission) { clearDraft(item.id); return [item.id, undefined] as const; }
        return [item.id, readDraft(item.id)] as const;
      }));
      setAnswers((current) => {
        const merged = { ...current };
        for (const item of next.items) if (item.questions.length) {
          const draft = drafts.get(item.id);
          const saved = draft?.kind === "homework" && draft.answers.length === item.questions.length && draft.answers.every((row, i) => row.length === item.questions[i].blankCount) ? draft.answers : undefined;
          merged[item.id] = item.submission?.answers ?? current[item.id] ?? saved ?? item.questions.map((q) => Array.from({ length: q.blankCount }, () => ""));
        }
        return merged;
      });
    }).catch((cause: unknown) => { if (!controller.signal.aborted) setError(resolveError(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, revision, resolveError, readDraft, clearDraft]);
  useEffect(() => {
    const future = data?.items.filter((item) => item.status === "scheduled").map((item) => new Date(item.startsAt).getTime());
    if (!future?.length) return;
    const delay = Math.min(...future) - (Date.now() + offset.current);
    const timer = window.setTimeout(() => setRevision((v) => v + 1), Math.min(2_147_483_647, Math.max(1000, delay + 100)));
    return () => window.clearTimeout(timer);
  }, [data]);
  function setAnswer(id: string, question: number, blank: number, value: string) {
    const next = (answers[id] ?? []).map((row, i) => i === question ? row.map((answer, j) => j === blank ? value : answer) : row);
    setAnswers((current) => ({ ...current, [id]: next }));
    writeDraft(id, { kind: "homework", answers: next });
  }
  async function submit(item: HomeworkResponse, confirmBlank = false) {
    if (busy.current) return false;
    const selected = answers[item.id] ?? [];
    if (selected.length !== item.questionCount || !confirmBlank && selected.some((row) => row.some((value) => !value.trim()))) { toast.error(t("answerAll")); return false; }
    busy.current = true; setPending(item.id);
    try {
      const submission = await submitHomework(accessToken, item.id, selected, confirmBlank);
      clearDraft(item.id);
      setData((current) => current && ({ ...current, items: current.items.map((entry) => entry.id === item.id ? { ...entry, submission } : entry) }));
      toast.success(t("graded", { score: submission.score, total: item.total })); return true;
    } catch (cause) { toast.error(resolveError(cause)); setRevision((v) => v + 1); return false; }
    finally { busy.current = false; setPending(""); }
  }
  return { data, error, loading, pending, answers, now, draftStatus, setAnswer, submit, refresh: () => setRevision((v) => v + 1) };
}
