"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useLearningVirtualLab } from "@/features/learning/hooks/use-learning-virtual-lab";
import { createVirtualLabEngine, type LabParameters, type VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";

export function useLearningNativeLab() {
  const sync = useLearningVirtualLab();
  const { snapshot, user, record, start, failRestore } = sync;
  const [runtime, setRuntime] = useState<{ key: string; engine: VirtualLabEngine } | null>(null);
  const [version, setVersion] = useState(0);
  const active = useRef<VirtualLabEngine | null>(null);
  const refreshView = useCallback(() => setVersion((value) => value + 1), []);
  const identity = useRef({ name: "", number: "" });
  const username = user?.username ?? "";
  const displayName = user?.displayName || username;

  useEffect(() => {
    identity.current = { name: displayName.slice(0, 100), number: username.slice(0, 100) };
  }, [displayName, username]);

  useEffect(() => {
    if (!snapshot?.available) return;
    let mounted = true, restoring = true;
    const engine = createVirtualLabEngine(() => {
      if (!mounted || restoring) return;
      Object.assign(engine.records.data.student, identity.current);
      record(JSON.stringify(engine.records.data));
      setVersion((value) => value + 1);
    });
    try {
      if (snapshot.document) engine.records.import(JSON.parse(snapshot.document));
      Object.assign(engine.records.data.student, identity.current);
      active.current = engine;
      setRuntime({ key: snapshot.nonce, engine });
      restoring = false;
      start(JSON.stringify(engine.records.data));
    } catch {
      active.current = null;
      setRuntime(null);
      failRestore();
    }
    return () => {
      mounted = false;
      if (active.current === engine) active.current = null;
    };
  }, [snapshot?.nonce, snapshot?.available, snapshot?.document, record, start, failRestore]);

  const engine = runtime?.key === snapshot?.nonce ? runtime?.engine ?? null : null;
  const updateParams = (id: string, partial: LabParameters) => {
    if (!engine || active.current !== engine) return false;
    const next = { ...engine.records.data.tasks[id].params, ...partial };
    if (!engine.validParams(id, next)) return false;
    engine.records.data.tasks[id].params = next;
    engine.records.data.tasks[id].completion = { confirmed: false, confirmedAt: null };
    engine.records.save();
    return true;
  };
  const importFile = async (file: File) => {
    if (!engine || active.current !== engine) return;
    if (file.size > 20 * 1024 * 1024) throw new Error("记录文件不能超过 20 MB。");
    const text = await file.text();
    if (active.current !== engine) return;
    engine.records.import(JSON.parse(text));
  };
  return { ...sync, engine, version, refreshView, updateParams, importFile };
}

export type NativeLabModel = ReturnType<typeof useLearningNativeLab>;
