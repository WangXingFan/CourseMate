"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthSession } from "@/shared/auth/auth-session-context";
import { resolveApiBaseURL } from "@/shared/api/http-client";
import { isRecord } from "@/shared/lib/type-guards";
import { searchLearningCourse } from "@/shared/api/learning-corrections";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";

type Reading = { last: string; title: string; positions: Record<string, number>; bookmarks: string[] };
const empty: Reading = { last: "", title: "", positions: {}, bookmarks: [] };
export function useLearningReading() {
  const { user } = useAuthSession();
  const key = `coursemate.reading.v1:${JSON.stringify([resolveApiBaseURL(), user?.publicID ?? ""])}`;
  const [snapshot, setSnapshot] = useState<{ key: string; data: Reading }>();
  const [failed, setFailed] = useState(false);
  const current = useRef(empty);
  useEffect(() => {
    let data: Reading = { ...empty, positions: {}, bookmarks: [] };
    try {
      const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
      if (isRecord(value) && typeof value.last === "string" && typeof value.title === "string" && isRecord(value.positions) && Array.isArray(value.bookmarks)) {
        const positions: Record<string, number> = {};
        for (const [id, position] of Object.entries(value.positions)) if (typeof position === "number" && Number.isFinite(position)) positions[id] = position;
        data = { last: value.last, title: value.title, positions, bookmarks: value.bookmarks.filter((id): id is string => typeof id === "string") };
      }
    } catch { setFailed(true); }
    current.current = data; setSnapshot({ key, data });
  }, [key]);
  const save = useCallback((update: (data: Reading) => Reading) => {
    const data = update(current.current); current.current = data; setSnapshot({ key, data });
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { setFailed(true); }
  }, [key]);
  const remember = useCallback((id: string, title: string, position: number) => save((data) => ({ ...data, last: id, title, positions: { ...data.positions, [id]: position } })), [save]);
  const toggleBookmark = useCallback((id: string) => save((data) => ({ ...data, bookmarks: data.bookmarks.includes(id) ? data.bookmarks.filter((item) => item !== id) : [...data.bookmarks, id] })), [save]);
  return { data: snapshot?.key === key ? snapshot.data : empty, ready: snapshot?.key === key, failed, remember, toggleBookmark };
}

export function useLearningCourseSearch(query: string) {
  const { accessToken } = useAuthSession();
  const resolveError = useLocalizedErrorMessage();
  const [matches, setMatches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController(); setError("");
    if (!query.trim()) { setMatches([]); setLoading(false); return; }
    setLoading(true);
    const timer = setTimeout(() => {
      void searchLearningCourse(accessToken, query, controller.signal).then((data) => { if (!controller.signal.aborted) setMatches(data.items.map((item) => item.id)); }).catch((cause) => { if (!controller.signal.aborted) setError(resolveError(cause)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [accessToken, query, resolveError]);
  return { matches, loading, error };
}
