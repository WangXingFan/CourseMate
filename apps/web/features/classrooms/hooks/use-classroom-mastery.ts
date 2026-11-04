"use client";

import { useEffect, useState } from "react";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { getClassroomMastery, getStudentMastery, type ClassroomMasteryData, type LearningMasteryData } from "@/shared/api/learning-mastery";

export function useClassroomMastery(accessToken: string, classroomID: string) {
  const resolveError = useLocalizedErrorMessage();
  const [report, setReport] = useState<ClassroomMasteryData>();
  const [profile, setProfile] = useState<LearningMasteryData>();
  const [studentID, setStudentID] = useState("");
  const [error, setError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setReport(undefined); setError("");
    void getClassroomMastery(accessToken, classroomID, controller.signal).then((data) => {
      if (!controller.signal.aborted) setReport(data);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setError(resolveError(error));
    });
    return () => controller.abort();
  }, [accessToken, classroomID, revision, resolveError]);
  useEffect(() => {
    const controller = new AbortController();
    setProfile(undefined); setProfileError("");
    if (studentID) void getStudentMastery(accessToken, classroomID, studentID, controller.signal).then((data) => {
      if (!controller.signal.aborted) setProfile(data);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setProfileError(resolveError(error));
    });
    return () => controller.abort();
  }, [accessToken, classroomID, studentID, revision, resolveError]);
  const selectStudent = (id: string) => { setProfile(undefined); setProfileError(""); setStudentID(id); };
  return { report, profile, studentID, selectStudent, error, profileError, refresh: () => setRevision((value) => value + 1) };
}
