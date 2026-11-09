"use client";

import { useEffect, useRef, useState } from "react";
import { listClassrooms, listClassroomStudents } from "@/shared/api/classrooms";
import { copyClassroomQuiz } from "@/shared/api/remediation";
import type { ClassroomDTO, ClassroomStudentDTO } from "@/shared/api/classroom-types";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";

export function useClassroomCopyTask(accessToken: string, id: string) {
  const resolveError = useLocalizedErrorMessage();
  const [classes, setClasses] = useState<ClassroomDTO[]>([]);
  const [target, setTarget] = useState("");
  const [students, setStudents] = useState<ClassroomStudentDTO[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    void listClassrooms(accessToken, controller.signal).then((data) => { if (!controller.signal.aborted) setClasses(data.classrooms); }).catch((cause) => { if (!controller.signal.aborted) setError(resolveError(cause)); });
    return () => controller.abort();
  }, [accessToken, resolveError]);
  useEffect(() => {
    const controller = new AbortController(); setStudents([]); setSelected([]);
    if (target) void listClassroomStudents(accessToken, target, controller.signal).then((data) => { if (!controller.signal.aborted) { setStudents(data.students); setSelected(data.students.map((s) => s.id)); } }).catch((cause) => { if (!controller.signal.aborted) setError(resolveError(cause)); });
    return () => controller.abort();
  }, [accessToken, target, resolveError]);
  async function copy(title: string) {
    if (busy.current) return false;
    busy.current = true; setPending(true); setError("");
    try { await copyClassroomQuiz(accessToken, id, { classroomId: target, title, studentIds: selected }); return true; }
    catch (cause) { setError(resolveError(cause)); return false; }
    finally { busy.current = false; setPending(false); }
  }
  return { classes, target, setTarget, students, selected, setSelected, pending, error, copy };
}
