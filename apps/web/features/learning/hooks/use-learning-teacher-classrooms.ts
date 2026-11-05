"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { listClassrooms, setClassroomExperiment } from "@/shared/api/classrooms";
import type { ClassroomDTO } from "@/shared/api/classroom-types";

export function useLearningTeacherClassrooms(accessToken: string) {
  const t = useTranslations("classrooms.experiments");
  const resolveError = useLocalizedErrorMessage();
  const [items, setItems] = useState<ClassroomDTO[]>([]);
  const [selectedID, setSelectedID] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const busy = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    void listClassrooms(accessToken, controller.signal)
      .then(({ classrooms }) => { if (!controller.signal.aborted) { setItems(classrooms); setSelectedID((id) => classrooms.some((item) => item.id === id) ? id : classrooms[0]?.id ?? ""); } })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(resolveError(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, revision, resolveError]);
  async function setOpen(course: string, open: boolean) {
    if (!selectedID || busy.current) return;
    const classroomID = selectedID;
    busy.current = true; setPending(course); setError("");
    try {
      await setClassroomExperiment(accessToken, classroomID, course, { open });
      setItems((current) => current.map((item) => item.id === classroomID ? { ...item, experiments: { ...item.experiments, [course]: open } } : item));
      toast.success(t(open ? "opened" : "closed"));
    } catch (cause) { setError(resolveError(cause)); }
    finally { busy.current = false; setPending(""); }
  }
  return { items, selectedID, select: setSelectedID, selected: items.find((item) => item.id === selectedID), loading, pending, error, setOpen, refresh: () => setRevision((value) => value + 1) };
}
