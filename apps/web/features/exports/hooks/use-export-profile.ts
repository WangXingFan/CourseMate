"use client";

import { useEffect, useRef, useState } from "react";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { getExportProfile, saveExportProfile, type ClassroomExportProfile } from "@/shared/api/exports";

export const EXPORT_PROFILE_FIELDS = [
  { key: "academicTerm", maxLength: 64 },
  { key: "courseCode", maxLength: 64 },
  { key: "courseName", maxLength: 120 },
  { key: "teacherName", maxLength: 80 },
  { key: "college", maxLength: 120 },
  { key: "teachingLocation", maxLength: 120 },
] as const;

type ProfileState = { classroomID: string; draft: ClassroomExportProfile; saved: ClassroomExportProfile };

export function useExportProfile(accessToken: string, classroomID: string) {
  const resolveError = useLocalizedErrorMessage();
  const [state, setState] = useState<ProfileState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const active = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setState(null); setError(""); setSaving(false); setLoading(!!classroomID);
    if (classroomID) {
      void getExportProfile(accessToken, classroomID, controller.signal).then((profile) => {
        if (!controller.signal.aborted) setState({ classroomID, draft: profile, saved: profile });
      }).catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(resolveError(cause));
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }
    return () => { controller.abort(); active.current?.abort(); active.current = null; };
  }, [accessToken, classroomID, revision, resolveError]);

  const current = state?.classroomID === classroomID ? state : null;
  const complete = !!current && EXPORT_PROFILE_FIELDS.every(({ key }) => current.draft[key].trim().length > 0);
  const dirty = !!current && EXPORT_PROFILE_FIELDS.some(({ key }) => current.draft[key] !== current.saved[key]);
  const ready = complete && !dirty && !loading && !saving;

  function update(key: keyof ClassroomExportProfile, value: string) {
    setState((previous) => previous?.classroomID === classroomID ? { ...previous, draft: { ...previous.draft, [key]: value } } : previous);
    setError("");
  }

  async function save() {
    if (!current || !complete || active.current) return;
    const controller = new AbortController(); active.current = controller;
    setSaving(true); setError("");
    try {
      const profile = await saveExportProfile(accessToken, classroomID, current.draft, controller.signal);
      if (!controller.signal.aborted) setState({ classroomID, draft: profile, saved: profile });
    } catch (cause) {
      if (!controller.signal.aborted) setError(resolveError(cause));
    } finally {
      if (active.current === controller) { active.current = null; setSaving(false); }
    }
  }

  return { draft: current?.draft, complete, dirty, ready, loading, saving, error, update, save, reload: () => setRevision((value) => value + 1) };
}
