"use client";

import type { AttendanceStudentItemResponse } from "@deeix/api-contract";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { checkInAttendance, listStudentAttendance } from "@/shared/api/attendance";

export function useClassroomStudentAttendance(accessToken: string) {
  const resolveError = useLocalizedErrorMessage();
  const [items, setItems] = useState<AttendanceStudentItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState("");
  const [generation, setGeneration] = useState(0);
  const [scan, setScan] = useState({ id: "", code: "" });
  const scanRead = useRef(false);
  const refresh = useCallback(() => setGeneration((v) => v + 1), []);
  useEffect(() => {
    if (scanRead.current) return;
    scanRead.current = true;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("attendance") ?? "";
    const code = params.get("code") ?? "";
    setScan({ id, code: /^\d{6}$/.test(code) ? code : "" });
    if (id) {
      params.delete("code");
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
      );
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let busy = false;
    const read = async () => {
      if (busy) return;
      busy = true;
      try {
        const data = await listStudentAttendance(accessToken, controller.signal);
        if (!controller.signal.aborted) {
          setItems(data.items);
          setLoadError("");
        }
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(resolveError(error));
      } finally {
        busy = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void read();
    const timer = setInterval(() => {
      void read();
    }, 5000);
    window.addEventListener("focus", read);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", read);
    };
  }, [accessToken, generation, resolveError]);
  async function submit(id: string, code: string) {
    if (pending) return;
    setPending(id);
    setActionError("");
    try {
      const record = await checkInAttendance(accessToken, id, code);
      setItems((current) => current.map((item) => (item.session.id === id ? { ...item, record } : item)));
      refresh();
    } catch (error) {
      setActionError(resolveError(error));
    } finally {
      setPending("");
    }
  }
  return { items, loading, loadError, actionError, pending, scan, refresh, submit };
}
