"use client";

import { useEffect, useRef, useState } from "react";
import type { QuizQuestionResponse } from "@deeix/api-contract";
import { createRemediation, getRemediationBank } from "@/shared/api/remediation";
import { getClassroomQuizReport, openClassroomQuiz } from "@/shared/api/classrooms";
import type { ClassroomQuizReportDTO } from "@/shared/api/classroom-types";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";

export function useClassroomRemediation(accessToken: string, classroomID: string, conceptID: string) {
  const resolveError = useLocalizedErrorMessage();
  const [questions, setQuestions] = useState<QuizQuestionResponse[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [published, setPublished] = useState("");
  const [report, setReport] = useState<ClassroomQuizReportDTO>();
  const [revision, setRevision] = useState(0);
  const created = useRef("");
  const busy = useRef(false);
  useEffect(() => {
    const controller = new AbortController(); setError(""); setLoading(true);
    void getRemediationBank(accessToken, classroomID, conceptID, controller.signal).then((data) => { if (!controller.signal.aborted) { setQuestions(data.questions); setSelected(data.questions.slice(0, 3).map((q) => q.id)); } }).catch((cause) => { if (!controller.signal.aborted) setError(resolveError(cause)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, classroomID, conceptID, resolveError, revision]);
  async function publish(title: string, students: string[]) {
    if (busy.current) return;
    busy.current = true; setPending(true); setError("");
    try {
      if (!created.current) created.current = (await createRemediation(accessToken, classroomID, { title, conceptId: conceptID, questionIds: selected, studentIds: students })).quiz.id;
      await openClassroomQuiz(accessToken, created.current); setPublished(created.current);
    } catch (cause) { setError(resolveError(cause)); }
    finally { busy.current = false; setPending(false); }
  }
  async function refreshReport() {
    if (!published) return;
    setPending(true); setError("");
    try { setReport(await getClassroomQuizReport(accessToken, published)); }
    catch (cause) { setError(resolveError(cause)); }
    finally { setPending(false); }
  }
  return { questions, selected, setSelected, loading, pending, error, publish, published, report, refreshReport, locked: !!created.current, retry: () => setRevision((v) => v+1) };
}
