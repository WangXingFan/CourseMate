"use client";

import { useCallback, useState } from "react";
import { resolveApiBaseURL } from "@/shared/api/http-client";
import { isRecord, isStringArray, parseJSON } from "@/shared/lib/type-guards";

type HomeworkDraft = { kind: "homework"; answers: string[][] };
type QuizDraft = { kind: "quiz"; answers: number[]; fields: Record<string, Record<string, string>> };
type AnswerDraft = HomeworkDraft | QuizDraft;

function isAnswerDraft(value: unknown): value is AnswerDraft {
  if (!isRecord(value) || !Array.isArray(value.answers)) return false;
  if (value.kind === "homework") return value.answers.every(isStringArray);
  return value.kind === "quiz" && value.answers.every((item) => Number.isInteger(item)) &&
    isRecord(value.fields) && Object.values(value.fields).every((fields) =>
      isRecord(fields) && Object.values(fields).every((answer) => typeof answer === "string"));
}

export function useClassroomAnswerDrafts(owner: string, kind: AnswerDraft["kind"]) {
  const [draftStatus, setDraftStatus] = useState<"saved" | "restored" | "unavailable" | "">("");
  const key = useCallback((id: string) => `coursemate.answers.v1:${JSON.stringify([resolveApiBaseURL(), owner, kind, id])}`, [owner, kind]);
  const readDraft = useCallback((id: string): AnswerDraft | undefined => {
    try {
      const value = parseJSON(window.localStorage.getItem(key(id)) ?? "");
      if (isAnswerDraft(value) && value.kind === kind) {
        setDraftStatus("restored");
        return value;
      }
    } catch {
      setDraftStatus("unavailable");
    }
    return undefined;
  }, [key, kind]);
  const writeDraft = useCallback((id: string, draft: AnswerDraft) => {
    try {
      window.localStorage.setItem(key(id), JSON.stringify(draft));
      setDraftStatus("saved");
    } catch {
      setDraftStatus("unavailable");
    }
  }, [key]);
  const clearDraft = useCallback((id: string) => {
    try { window.localStorage.removeItem(key(id)); }
    catch { setDraftStatus("unavailable"); }
  }, [key]);
  return { draftStatus, readDraft, writeDraft, clearDraft };
}
