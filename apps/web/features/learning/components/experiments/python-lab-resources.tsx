"use client";

import { Code2, Download, Play, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PYTHON_LAB_ROOT, PYTHON_LAB_STARTERS, PYTHON_LABS } from "@/features/learning/model/python-labs";

const TASKS = PYTHON_LABS.flatMap((lab) => [1, 2, 3, 4].map((task) => `${lab.id}-${task}`));
const PYTHON_SANDBOX_HTML = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net; worker-src blob:; connect-src https://cdn.jsdelivr.net; img-src data: blob:; style-src 'unsafe-inline'"><script>
let worker;
let workerSource = "";
let files = {};
let port;
let ready = false;
let running = false;
let runTimer;
let workerURL;

function publish(message) {
  port?.postMessage(message);
}

function stopWorker() {
  clearTimeout(runTimer);
  worker?.terminate();
  worker = undefined;
  ready = false;
  running = false;
  if (workerURL) URL.revokeObjectURL(workerURL);
  workerURL = undefined;
}

function startWorker() {
  stopWorker();
  workerURL = URL.createObjectURL(new Blob([workerSource], { type: "text/javascript" }));
  worker = new Worker(workerURL);
  worker.onmessage = event => {
    const message = event.data;
    if (message.type === "status" && message.message === "ready") ready = true;
    if (message.type === "status" && message.message === "executing" && running) {
      runTimer = setTimeout(() => {
        stopWorker();
        publish({ type: "error", error: "代码运行超过 30 秒，运行环境已重启。" });
        startWorker();
      }, 30000);
    }
    if (message.type === "result" || message.type === "error") {
      const shouldRestart = running;
      clearTimeout(runTimer);
      running = false;
      if (message.type === "error") {
        publish(message);
        if (shouldRestart) startWorker();
        return;
      }
    }
    publish(message);
  };
  worker.onerror = event => {
    const shouldRestart = running;
    stopWorker();
    publish({ type: "error", error: event.message || "Python worker failed." });
    if (shouldRestart) startWorker();
  };
  worker.postMessage({ type: "init", files });
}

function handleCommand(event) {
  const message = event.data;
  if (message?.type === "init") {
    workerSource = message.workerSource;
    files = message.files || {};
    startWorker();
    return;
  }
  if (message?.type === "run" && ready && !running) {
    running = true;
    worker.postMessage(message);
  }
}

addEventListener("message", event => {
  if (event.source !== parent || event.data?.type !== "connect" || event.ports.length !== 1) return;
  port?.close();
  port = event.ports[0];
  port.onmessage = handleCommand;
  port.start();
});
</script>`;

type PythonRunResult = {
  stdout: string;
  stderr: string;
  plots: string[];
};

type PythonSandboxMessage = {
  type: "status" | "result" | "error";
  message?: string;
  result?: PythonRunResult;
  error?: string;
};

export function PythonLabResources() {
  const t = useTranslations("learning.virtualLab.python");
  const sandboxRef = useRef<HTMLIFrameElement>(null);
  const messagePortRef = useRef<MessagePort | null>(null);
  const [taskID, setTaskID] = useState(TASKS[0]);
  const [source, setSource] = useState(PYTHON_LAB_STARTERS[TASKS[0]]);
  const [running, setRunning] = useState(false);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [sandboxReady, setSandboxReady] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState("");
  const [result, setResult] = useState<PythonRunResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => () => {
    messagePortRef.current?.close();
    messagePortRef.current = null;
  }, []);

  const initializeSandbox = async () => {
    try {
      const frame = sandboxRef.current?.contentWindow;
      if (!frame) throw new Error(t("runtimeFailed"));
      messagePortRef.current?.close();
      const channel = new MessageChannel();
      const port = channel.port1;
      messagePortRef.current = port;
      port.onmessage = (event: MessageEvent<PythonSandboxMessage>) => {
        const payload = event.data;
        if (payload.type === "status") {
          setRuntimeStatus(payload.message ?? "");
          setRuntimeReady(payload.message === "ready");
        } else if (payload.type === "result" && payload.result) {
          setRunning(false);
          setResult(payload.result);
          setError(payload.result.stderr);
        } else if (payload.type === "error") {
          setRunning(false);
          setError(payload.error ?? t("runtimeFailed"));
        }
      };
      port.start();
      frame.postMessage({ type: "connect" }, "*", [channel.port2]);
      const [workerResponse, ...moduleResponses] = await Promise.all([
        fetch(`${PYTHON_LAB_ROOT}/python-sandbox.worker.js`, { credentials: "omit" }),
        ...PYTHON_LABS.map((lab) => fetch(`${PYTHON_LAB_ROOT}/${lab.stem}.py`, { credentials: "omit" })),
      ]);
      if (!workerResponse.ok || moduleResponses.some((response) => !response.ok)) throw new Error(t("runtimeFailed"));
      const [workerSource, ...modules] = await Promise.all([workerResponse.text(), ...moduleResponses.map((response) => response.text())]);
      port.postMessage({
        type: "init",
        workerSource,
        files: Object.fromEntries(PYTHON_LABS.map((lab, index) => [`${lab.stem}.py`, modules[index]])),
      });
      setSandboxReady(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("runtimeFailed"));
    }
  };

  const chooseTask = (value: string) => {
    setTaskID(value);
    setSource(PYTHON_LAB_STARTERS[value]);
    setResult(null);
    setError("");
  };

  const run = () => {
    if (!sandboxReady || !runtimeReady) return;
    setRunning(true);
    setError("");
    setResult(null);
    messagePortRef.current?.postMessage({ type: "run", taskID, code: source });
  };

  const selectedLab = PYTHON_LABS.find((item) => item.id === taskID.slice(0, 2)) ?? PYTHON_LABS[0];

  return (
    <div className="space-y-7" data-python-resources>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <h1 className="flex min-w-0 items-center gap-3 font-display text-2xl font-normal sm:text-3xl">
          <Code2 aria-hidden className="size-6 shrink-0" />
          {t("title")}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline"><a href={`${PYTHON_LAB_ROOT}/${selectedLab.stem}.ipynb`} download><Download aria-hidden className="size-4" />{t("notebook")}</a></Button>
          <Button asChild size="sm" variant="outline"><a href={`${PYTHON_LAB_ROOT}/${selectedLab.stem}.py`} download><Download aria-hidden className="size-4" />{t("script")}</a></Button>
          <Button asChild size="sm" variant="outline"><a href={`${PYTHON_LAB_ROOT}/coursemate-signal-python.zip`} download><Download aria-hidden className="size-4" />{t("bundle")}</a></Button>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <label htmlFor="python-task" className="grid min-w-64 flex-1 gap-2 text-sm font-medium">
          {t("task")}
          <select id="python-task" value={taskID} onChange={(event) => chooseTask(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            {TASKS.map((id) => <option key={id} value={id}>{id} · {t(`labs.${id.slice(0, 2)}`)}</option>)}
          </select>
        </label>
        <Button variant="outline" size="sm" disabled={running} onClick={() => setSource(PYTHON_LAB_STARTERS[taskID])}><RotateCcw aria-hidden className="size-4" />{t("resetCode")}</Button>
        <Button size="sm" disabled={running || !source.trim() || !sandboxReady || !runtimeReady} onClick={run}><Play aria-hidden className="size-4" />{running ? t("running") : t("run")}</Button>
      </div>

      <Textarea
        aria-label={t("editor")}
        value={source}
        onChange={(event) => setSource(event.target.value)}
        spellCheck={false}
        className="min-h-[22rem] resize-y rounded-md bg-muted/25 p-4 font-mono text-sm leading-6"
        disabled={running}
        data-python-editor
      />

      <iframe
        ref={sandboxRef}
        title={t("runtimeFrame")}
        sandbox="allow-scripts"
        srcDoc={PYTHON_SANDBOX_HTML}
        onLoad={() => void initializeSandbox()}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {!runtimeReady || running ? <p role="status" className="text-sm text-muted-foreground">{runtimeStatus ? t(`runtime.${runtimeStatus}`, { defaultMessage: runtimeStatus === "loading_packages" ? t("running") : t("runtimeLoading") }) : t("runtimeLoading")}</p> : null}
      {error ? <pre role="alert" className="max-h-72 overflow-auto rounded-md border border-destructive/30 bg-destructive/5 p-4 font-mono text-sm leading-6 text-destructive">{error}</pre> : null}
      {result?.stdout ? <section aria-label={t("output")}><pre className="max-h-72 overflow-auto rounded-md border border-border bg-muted/30 p-4 font-mono text-sm leading-6">{result.stdout}</pre></section> : null}
      {result?.plots.map((plot, index) => <figure key={`${taskID}-${index}`} className="overflow-hidden border-y border-border py-4"><figcaption className="mb-3 text-sm font-medium">{t("plot", { number: index + 1 })}</figcaption><img src={`data:image/svg+xml;base64,${plot}`} alt={`${taskID} ${t("plot", { number: index + 1 })}`} className="mx-auto h-auto w-full max-w-4xl" /></figure>)}

      <section aria-label={t("downloads")} className="flex flex-wrap gap-2 border-t border-border pt-5">
        <Button asChild size="sm" variant="outline"><a href={`${PYTHON_LAB_ROOT}/README.md`} download><Download aria-hidden className="size-4" />{t("instructions")}</a></Button>
      </section>
    </div>
  );
}
