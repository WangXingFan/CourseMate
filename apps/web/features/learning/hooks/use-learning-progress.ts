"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { parsePendingAttempts } from "@/features/learning/model/learning-progress";
import { useLocalizedErrorMessage } from "@/i18n/use-localized-error";
import { resolveApiBaseURL } from "@/shared/api/http-client";
import { getLearningProgress, saveLearningAttempt } from "@/shared/api/learning";
import type { LearningAttemptPayload, LearningProgressData } from "@/shared/api/learning-types";
import { useAuthSession } from "@/shared/auth/auth-session-context";
import { createSecureUUID } from "@/shared/lib/secure-id";

export function useLearningProgress() {
  const { accessToken, user, userStatus, refreshUser } = useAuthSession();
  const t = useTranslations("learningLabs.progress");
  const resolveError = useLocalizedErrorMessage();
  const [snapshot, setSnapshot] = React.useState<{ accessToken: string; storageKey: string; data: LearningProgressData } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");
  const [saveError, setSaveError] = React.useState("");
  const [pendingCount, setPendingCount] = React.useState(0);
  const [revision, setRevision] = React.useState(0);
  const queue = React.useRef<LearningAttemptPayload[]>([]);
  const owner = user?.id ?? "";
  const storageKey = owner ? `coursemate.learning.pending:${resolveApiBaseURL()}:${owner}` : "";
  const data = snapshot?.accessToken === accessToken && snapshot.storageKey === storageKey && snapshot.data.accountId === owner ? snapshot.data : null;

  // Queue recovery is scoped to this account, server and tab. The server remains
  // the source of truth; storage is only a retry buffer for interrupted requests.
  React.useEffect(() => {
    if (!storageKey) return;
    try { queue.current = parsePendingAttempts(window.sessionStorage.getItem(storageKey)); }
    catch { queue.current = []; }
    setPendingCount(queue.current.length);
    setSnapshot(null);
    setLoadError("");
    setSaveError("");
  }, [storageKey]);

  React.useEffect(() => {
    if (!storageKey) return;
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setLoadError("");
    void getLearningProgress(accessToken, controller.signal).then((next) => {
      if (!active) return;
      if (next.accountId !== owner) { setLoadError(t("accountChanged")); return; }
      setSnapshot({ accessToken, storageKey, data: next });
    }).catch((error: unknown) => {
      if (active && !controller.signal.aborted) setLoadError(resolveError(error));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; controller.abort(); };
  }, [accessToken, storageKey, revision, resolveError, owner, t]);

  const persistQueue = React.useCallback(() => {
    setPendingCount(queue.current.length);
    try {
      if (queue.current.length) window.sessionStorage.setItem(storageKey, JSON.stringify(queue.current));
      else window.sessionStorage.removeItem(storageKey);
    } catch {
      // Private browsing can disable storage; the visible retry queue still works.
    }
  }, [storageKey]);

  // Serialize submissions so a later correct answer cannot be overwritten by
  // an earlier wrong answer arriving late. Cleanup never removes an unsaved item.
  React.useEffect(() => {
    if (!data || loading || saveError || pendingCount === 0) return;
    let active = true;
    const pending = queue.current[0];
    if (!pending) return;
    void saveLearningAttempt(accessToken, pending).then(() => {
      if (!active) return;
      queue.current = queue.current.filter((item) => item.id !== pending.id);
      persistQueue();
      // Refetch authoritative totals after retry, including responses lost before a reload.
      setRevision((value) => value + 1);
    }).catch((error: unknown) => {
      if (active) setSaveError(resolveError(error));
    });
    return () => { active = false; };
  }, [accessToken, data, loading, saveError, pendingCount, persistQueue, resolveError]);

  const record = React.useCallback((questionId: string, selected: number) => {
    const payload = { id: createSecureUUID(), questionId, selected };
    queue.current.push(payload);
    persistQueue();
    return payload.id;
  }, [persistQueue]);

  const retrySave = React.useCallback(() => setSaveError(""), []);
  const refresh = React.useCallback(() => {
    if (userStatus === "failed") void refreshUser();
    setRevision((value) => value + 1);
  }, [userStatus, refreshUser]);

  return { data, loading, loadError: userStatus === "failed" ? t("accountUnavailable") : loadError, saveError, saving: pendingCount > 0 && !saveError, pendingCount, record, retrySave, refresh };
}
