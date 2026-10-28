"use client";

import { useEffect, useRef, useState } from "react";
import { PYTHON_LAB_ROOT, PYTHON_LABS } from "@/features/learning/model/python-labs";

export type PythonOutput = { stdout: string; stderr: string; plots: string[] };
type SandboxMessage = { type: "status" | "result" | "error"; message?: string; result?: PythonOutput; error?: string };

export function useLearningPython(failureMessage: string) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const portRef = useRef<MessagePort | null>(null);
  const completeRef = useRef<((result: PythonOutput) => void) | null>(null);
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => () => {
    portRef.current?.close();
    portRef.current = null;
    completeRef.current = null;
  }, []);

  const initialize = async () => {
    setReady(false);
    setError("");
    portRef.current?.close();
    const channel = new MessageChannel();
    const port = channel.port1;
    portRef.current = port;
    port.onmessage = (event: MessageEvent<SandboxMessage>) => {
      if (portRef.current !== port) return;
      const payload = event.data;
      if (payload.type === "status") {
        setStatus(payload.message ?? "");
        setReady(payload.message === "ready");
      } else if (payload.type === "result" && payload.result) {
        setRunning(false);
        setReady(true);
        setStatus("ready");
        completeRef.current?.(payload.result);
        completeRef.current = null;
      } else if (payload.type === "error") {
        setRunning(false);
        setReady(false);
        setError(payload.error ?? failureMessage);
        completeRef.current = null;
      }
    };
    port.start();
    try {
      const frame = frameRef.current?.contentWindow;
      if (!frame) throw new Error(failureMessage);
      frame.postMessage({ type: "connect" }, "*", [channel.port2]);
      const responses = await Promise.all([
        fetch(`${PYTHON_LAB_ROOT}/python-sandbox.worker.js`, { credentials: "omit" }),
        ...PYTHON_LABS.map((lab) => fetch(`${PYTHON_LAB_ROOT}/${lab.stem}.py`, { credentials: "omit" })),
      ]);
      if (responses.some((response) => !response.ok)) throw new Error(failureMessage);
      const [workerSource, ...modules] = await Promise.all(responses.map((response) => response.text()));
      if (portRef.current !== port) return;
      port.postMessage({ type: "init", workerSource, files: Object.fromEntries(PYTHON_LABS.map((lab, index) => [`${lab.stem}.py`, modules[index]])) });
    } catch (cause) {
      if (portRef.current === port) setError(cause instanceof Error ? cause.message : failureMessage);
    }
  };

  const run = (taskID: string, code: string, onComplete: (result: PythonOutput) => void) => {
    if (!ready || running || !portRef.current) return;
    completeRef.current = onComplete;
    setRunning(true);
    setError("");
    portRef.current.postMessage({ type: "run", taskID, code });
  };
  return { frameRef, ready, running, status, error, initialize, run };
}
