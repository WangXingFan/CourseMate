"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, resolveApiBaseURL } from "@/shared/api/http-client";
import { getLearningVirtualLab, saveLearningVirtualLab } from "@/shared/api/learning-virtual-lab";
import { useAuthSession } from "@/shared/auth/auth-session-context";
import { createSecureUUID } from "@/shared/lib/secure-id";

type Status = "loading" | "ready" | "saving" | "saved" | "error" | "conflict" | "invalid";
type Snapshot = { key: string; document: string; nonce: string; status: Status; localWarning: boolean; available: boolean };
type Draft = { document: string; revision: number };
type Session = {
  key: string; document: string; revision: number; pending: string | null;
  stopped: boolean; persist: () => void; flush: () => void; start: (document: string) => void; retry: () => void;
};

function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null;
  const draft: unknown = JSON.parse(raw);
  if (typeof draft !== "object" || !draft || !("document" in draft) || !("revision" in draft)) return null;
  if (typeof draft.document !== "string" || draft.document.length > 20 * 1024 * 1024 ||
      typeof draft.revision !== "number" || !Number.isSafeInteger(draft.revision) || draft.revision < 0) return null;
  return { document: draft.document, revision: draft.revision };
}

export function useLearningVirtualLab() {
  const { user, accessToken } = useAuthSession();
  const accountId = user?.id;
  const storageKey = user ? `coursemate.virtual-lab:${resolveApiBaseURL()}:${user.id}` : "";
  const key = `${storageKey}:${accessToken}`;
  const [generation, setGeneration] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const current = useRef<Session | null>(null);

  useEffect(() => {
    if (!accountId || !accessToken) return;
    const controller = new AbortController();
    let active = true, saving = false, failed = false, initialized = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = (patch: Partial<Snapshot>) => {
      if (active) setSnapshot((s) => s?.key === key ? { ...s, ...patch } : s);
    };
    const session: Session = {
      key, document: "", revision: 0, pending: null, stopped: false,
      start(document) {
        session.document = document;
        if (session.pending !== null) { session.pending = document; session.persist(); }
        initialized = true;
        session.flush();
      },
      retry() { failed = false; session.flush(); },
      persist() {
        if (!active) return;
        try {
          if (session.pending === null) window.sessionStorage.removeItem(storageKey);
          else window.sessionStorage.setItem(storageKey, JSON.stringify({ document: session.pending, revision: session.revision }));
        } catch { update({ localWarning: true }); }
      },
      flush() {
        if (!active || !initialized || saving || failed || session.stopped || session.pending === null) return;
        update({ status: "saving" });
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          if (!active || session.stopped || session.pending === null) return;
          const document = session.pending;
          saving = true;
          update({ status: "saving" });
          void saveLearningVirtualLab(accessToken, { revision: session.revision, document }, controller.signal).then((result) => {
            if (!active) return;
            if (result.accountId !== accountId || result.document !== document) throw new Error("Account or document changed");
            session.revision = result.revision;
            if (session.pending === document) session.pending = null;
            session.persist();
            update({ status: session.pending === null ? "saved" : "saving" });
          }).catch((error: unknown) => {
            if (!active || controller.signal.aborted) return;
            failed = true;
            if (error instanceof ApiError && error.status === 409) {
              session.stopped = true;
              update({ status: "conflict" });
            } else update({ status: "error" });
          }).finally(() => {
            saving = false;
            if (active && !failed) session.flush();
          });
        }, 450);
      },
    };
    current.current = session;
    setSnapshot({ key, document: "", nonce: createSecureUUID(), status: "loading", localWarning: false, available: false });
    void getLearningVirtualLab(accessToken, controller.signal).then((result) => {
      if (!active) return;
      if (result.accountId !== accountId) throw new Error("Account changed");
      let draft: Draft | null = null, localWarning = false;
      try { draft = parseDraft(window.sessionStorage.getItem(storageKey)); } catch { localWarning = true; }
      session.revision = result.revision;
      session.document = result.document;
      let status: Status = "ready";
      if (draft && draft.document !== result.document) {
        session.pending = draft.document;
        session.document = draft.document;
        session.stopped = draft.revision !== result.revision;
        // Preserve the draft's base revision until the user chooses to reload.
        if (session.stopped) session.revision = draft.revision;
        status = session.stopped ? "conflict" : "saving";
      } else if (draft) session.persist();
      update({ document: session.document, status, localWarning, available: true });
    }).catch(() => {
      if (active && !controller.signal.aborted) { failed = true; update({ status: "error" }); }
    });
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (session.pending !== null || saving) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      active = false;
      controller.abort();
      if (timer) clearTimeout(timer);
      window.removeEventListener("beforeunload", beforeUnload);
      if (current.current === session) current.current = null;
    };
  }, [accessToken, accountId, storageKey, key, generation]);

  const record = useCallback((document: string) => {
    const session = current.current;
    if (!session || session.key !== key) return;
    session.document = document;
    session.pending = document;
    session.persist();
    session.flush();
  }, [key]);
  const retry = useCallback(() => {
    if (current.current?.key !== key) return;
    if (current.current.pending === null) setGeneration((v) => v + 1);
    else current.current.retry();
  }, [key]);
  const reload = useCallback(() => {
    if (current.current?.key !== key) return;
    try { window.sessionStorage.removeItem(storageKey); } catch { /* Reload remains available without browser storage. */ }
    setGeneration((v) => v + 1);
  }, [key, storageKey]);
  const backup = useCallback(() => {
    const session = current.current;
    if (!session || session.key !== key || !session.document) return;
    const url = URL.createObjectURL(new Blob([session.document], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = `课知伴-experiments-${user?.username}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [key, user?.username]);
  const failRestore = useCallback(() => {
    if (current.current?.key !== key) return;
    current.current.stopped = true;
    setSnapshot((s) => s?.key === key ? { ...s, status: "invalid" } : s);
  }, [key]);
  const start = useCallback((document: string) => {
    if (current.current?.key === key) current.current.start(document);
  }, [key]);
  return { user, snapshot: snapshot?.key === key ? snapshot : null, record, retry, reload, backup, failRestore, start };
}
