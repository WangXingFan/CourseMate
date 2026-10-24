"use client";

import * as React from "react";

import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import type { ClassroomDTO, ClassroomStudentDTO } from "@/shared/api/classroom-types";
import { listClassrooms, listClassroomStudents } from "@/shared/api/classrooms";

type RollCallRoster = {
  classroomID: string;
  students: ClassroomStudentDTO[];
  history: ClassroomStudentDTO[];
};

type DrawPreview = {
  student: ClassroomStudentDTO;
  previous: ClassroomStudentDTO;
  next: ClassroomStudentDTO;
  tick: number;
  progress: number;
};

export function useClassroomRollCall(accessToken: string) {
  const resolveErrorMessage = useLocalizedErrorMessage();
  const [classrooms, setClassrooms] = React.useState<ClassroomDTO[]>([]);
  const [classroomID, setClassroomID] = React.useState("");
  const [classroomsLoading, setClassroomsLoading] = React.useState(true);
  const [classroomsError, setClassroomsError] = React.useState("");
  const [studentsLoading, setStudentsLoading] = React.useState(false);
  const [studentsError, setStudentsError] = React.useState("");
  const [revision, setRevision] = React.useState(0);
  const [roster, setRoster] = React.useState<RollCallRoster>({ classroomID: "", students: [], history: [] });
  const [preview, setPreview] = React.useState<DrawPreview | null>(null);
  const drawTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawing = React.useRef(false);
  const cancelDraw = React.useCallback(() => {
    if (drawTimer.current !== null) clearTimeout(drawTimer.current);
    drawTimer.current = null;
    drawing.current = false;
    setPreview(null);
  }, []);

  React.useEffect(() => () => {
    if (drawTimer.current !== null) clearTimeout(drawTimer.current);
    drawing.current = false;
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    cancelDraw();
    setClassroomsLoading(true);
    setClassroomsError("");
    void (async () => {
      try {
        const data = await listClassrooms(accessToken, controller.signal);
        if (controller.signal.aborted) return;
        const items = data.classrooms ?? [];
        setClassrooms(items);
        setClassroomID((current) => items.some((item) => item.id === current) ? current : (items[0]?.id ?? ""));
      } catch (error) {
        if (controller.signal.aborted) return;
        setClassrooms([]);
        setClassroomID("");
        setClassroomsError(resolveErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) setClassroomsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [accessToken, revision, resolveErrorMessage, cancelDraw]);

  React.useEffect(() => {
    const controller = new AbortController();
    setRoster({ classroomID, students: [], history: [] });
    setStudentsError("");
    setStudentsLoading(Boolean(classroomID));
    if (!classroomID) return () => controller.abort();
    void (async () => {
      try {
        const data = await listClassroomStudents(accessToken, classroomID, controller.signal);
        if (controller.signal.aborted) return;
        // IDs identify students throughout a round, even when names are shared.
        const students = [...new Map((data.students ?? []).map((student) => [student.id, student])).values()];
        setRoster({ classroomID, students, history: [] });
      } catch (error) {
        if (controller.signal.aborted) return;
        setStudentsError(resolveErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) setStudentsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [accessToken, classroomID, revision, resolveErrorMessage]);

  const loading = classroomsLoading || studentsLoading || roster.classroomID !== classroomID;
  const error = classroomsError || studentsError;
  const draw = React.useCallback(() => {
    if (drawing.current || loading || error || !classroomID) return;
    const called = new Set(roster.history.map((student) => student.id));
    const remaining = roster.students.filter((student) => !called.has(student.id));
    // Select once, uniformly. Decorative name cycling never changes the winner.
    const winnerIndex = Math.floor(Math.random() * remaining.length);
    const student = remaining[winnerIndex];
    if (!student) return;
    const finish = () => {
      setRoster((current) => {
        if (current.classroomID !== classroomID || current.history.some((item) => item.id === student.id)) return current;
        return { ...current, history: [...current.history, student] };
      });
      cancelDraw();
    };
    // Respect the OS preference without making users wait through hidden motion.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    drawing.current = true;
    const steps = 20;
    // End the slowing reel on the actual winner, with no last-second name swap.
    const start = (winnerIndex + remaining.length - ((steps - 1) % remaining.length)) % remaining.length;
    let tick = 0;
    const advance = () => {
      if (!drawing.current) return;
      if (tick === steps) { finish(); return; }
      const index = (start + tick) % remaining.length;
      setPreview({
        student: remaining[index],
        previous: remaining[(index + remaining.length - 1) % remaining.length],
        next: remaining[(index + 1) % remaining.length],
        tick,
        progress: (tick + 1) / steps,
      });
      // Short early steps gradually slow to a pause before the reveal (~2 s).
      drawTimer.current = setTimeout(advance, 55 + 200 * (tick / steps) ** 3);
      tick++;
    };
    advance();
  }, [classroomID, error, loading, roster.students, roster.history, cancelDraw]);

  const selectClassroom = (id: string) => {
    if (id === classroomID) return;
    cancelDraw();
    setClassroomID(id);
    setRoster({ classroomID: id, students: [], history: [] });
    setStudentsLoading(Boolean(id));
    setStudentsError("");
  };

  const refresh = () => {
    cancelDraw();
    setClassroomsLoading(true);
    setRoster({ classroomID, students: [], history: [] });
    setRevision((current) => current + 1);
  };

  return {
    classrooms,
    classroomID,
    classroom: classrooms.find((item) => item.id === classroomID) ?? null,
    loading,
    error,
    students: roster.students,
    history: roster.history,
    picked: roster.history.at(-1) ?? null,
    remaining: roster.students.length - roster.history.length,
    preview,
    drawing: preview !== null,
    selectClassroom,
    refresh,
    draw,
    reset: () => {
      cancelDraw();
      setRoster((current) => ({ ...current, history: [] }));
    },
  };
}
