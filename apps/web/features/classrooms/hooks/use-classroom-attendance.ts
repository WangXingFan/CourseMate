"use client";

import type {
  AttendanceCreateRequest,
  AttendanceCorrectionRequest,
  AttendanceReportResponse,
  AttendanceSessionResponse,
} from "@deeix/api-contract";
import { useCallback, useEffect, useState } from "react";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import {
  closeAttendance,
  correctAttendance,
  createAttendance,
  getAttendanceReport,
  listAttendance,
} from "@/shared/api/attendance";

export function useClassroomAttendance(accessToken: string, classroomID: string) {
  const resolveError = useLocalizedErrorMessage();
  const [items, setItems] = useState<AttendanceSessionResponse[]>([]);
  const [selectedID, setSelectedID] = useState("");
  const [report, setReport] = useState<AttendanceReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState(false);
  const [generation, setGeneration] = useState(0);
  const refresh = useCallback(() => setGeneration((v) => v + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    void listAttendance(accessToken, classroomID, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setItems(data.items);
        setSelectedID((id) => (data.items.some((item) => item.id === id) ? id : (data.items[0]?.id ?? "")));
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(resolveError(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [accessToken, classroomID, generation, resolveError]);

  useEffect(() => {
    if (!selectedID) return;
    const controller = new AbortController();
    let busy = false;
    const read = async () => {
      if (busy) return;
      busy = true;
      try {
        const data = await getAttendanceReport(accessToken, selectedID, controller.signal);
        if (!controller.signal.aborted) {
          setReport(data);
          setLoadError("");
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setReport(null);
          setLoadError(resolveError(error));
        }
      } finally {
        busy = false;
      }
    };
    void read();
    const timer = setInterval(() => {
      void read();
    }, 3000);
    window.addEventListener("focus", read);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", read);
    };
  }, [accessToken, selectedID, generation, resolveError]);

  async function act(action: () => Promise<unknown>) {
    if (pending) return false;
    setPending(true);
    setActionError("");
    try {
      await action();
      refresh();
      return true;
    } catch (error) {
      setActionError(resolveError(error));
      return false;
    } finally {
      setPending(false);
    }
  }
  return {
    items,
    selectedID,
    report: report?.session.id === selectedID ? report : null,
    loading,
    loadError,
    actionError,
    pending,
    refresh,
    select: (id: string) => {
      setSelectedID(id);
      setActionError("");
    },
    create: (body: AttendanceCreateRequest) =>
      act(async () => {
        const item = await createAttendance(accessToken, classroomID, body);
        setSelectedID(item.id);
      }),
    close: () =>
      act(async () => {
        await closeAttendance(accessToken, selectedID);
        setReport(null);
      }),
    correct: (studentID: string, body: AttendanceCorrectionRequest) =>
      act(() => correctAttendance(accessToken, selectedID, studentID, body)),
  };
}
