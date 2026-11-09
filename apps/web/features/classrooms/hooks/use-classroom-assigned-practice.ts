"use client";

import { useEffect, useRef, useState } from "react";
import type { PracticeAssignmentsResponse } from "@deeix/api-contract";
import { listAssignedPractice, submitAssignedPractice } from "@/shared/api/practice-assignments";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { useClassroomAnswerDrafts } from "./use-classroom-answer-drafts";

export function useClassroomAssignedPractice(accessToken: string, classroomID?: string) {
  const resolveError = useLocalizedErrorMessage();
  const [data, setData] = useState<PracticeAssignmentsResponse>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    void listAssignedPractice(accessToken, classroomID, controller.signal).then((next) => { if (!controller.signal.aborted) setData(next); })
      .catch((cause) => { if (!controller.signal.aborted) setError(resolveError(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, classroomID, resolveError, revision]);
  return { data, setData, error, loading, refresh: () => setRevision((v) => v + 1) };
}

export function useClassroomStudentPractice(accessToken: string, owner: string) {
  const model = useClassroomAssignedPractice(accessToken);
  const resolveError = useLocalizedErrorMessage();
  const { readDraft, writeDraft, clearDraft, draftStatus } = useClassroomAnswerDrafts(owner, "quiz");
  const [answers, setAnswers] = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [pending, setPending] = useState("");
  const [saveError, setSaveError] = useState<{ id: string; message: string }>();
  const busy = useRef(false);
  useEffect(() => {
    const restored: typeof answers = {};
    for (const item of model.data?.items ?? []) {
      if (item.submission) { clearDraft(`practice:${item.id}`); continue; }
      const draft = readDraft(`practice:${item.id}`);
      if (draft?.kind === "quiz") restored[item.id] = draft.fields;
    }
    setAnswers((current) => ({ ...restored, ...current }));
  }, [model.data, readDraft, clearDraft]);
  function answer(id: string, questionID: string, field: string, value: string) {
    const next = { ...answers[id], [questionID]: { ...answers[id]?.[questionID], [field]: value } };
    setAnswers((current) => ({ ...current, [id]: next }));
    writeDraft(`practice:${id}`, { kind: "quiz", answers: [], fields: next });
  }
  async function submit(id: string) {
    if (busy.current) return;
    busy.current = true; setPending(id); setSaveError(undefined);
    try {
      const submission = await submitAssignedPractice(accessToken, id, answers[id] ?? {});
      clearDraft(`practice:${id}`);
      model.setData((current) => current && ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, submission } : item) }));
    } catch (cause) { setSaveError({ id, message: resolveError(cause) }); }
    finally { busy.current = false; setPending(""); }
  }
  return { ...model, answers, answer, submit, pending, saveError, draftStatus };
}
