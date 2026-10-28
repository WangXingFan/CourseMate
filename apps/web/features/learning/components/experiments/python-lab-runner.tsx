"use client";

import { Download, Play, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLearningPython } from "@/features/learning/hooks/use-learning-python";
import { PYTHON_SANDBOX_HTML } from "@/features/learning/model/python-sandbox";
import { downloadLabBlob, labParameterText } from "@/features/learning/model/virtual-lab-native";
import type { LabParameters, LabPythonRun, VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";

export function PythonLabResult({ taskID, result, engine }: { taskID: string; result: LabPythonRun; engine?: VirtualLabEngine }) {
  const t = useTranslations("learning.virtualLab.python");
  return <div className="space-y-4" data-python-result>
    <p className="text-sm text-muted-foreground">{t("lastRun")} · {new Date(result.time).toLocaleString()}</p>
    {engine && <p className="text-sm leading-6">{t("workspaceSnapshot")}：{labParameterText(engine, taskID, result.params)}</p>}
    {result.stderr && <pre role="alert" className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border border-destructive/30 p-4 font-mono text-sm leading-6 text-destructive">{result.stderr}</pre>}
    {result.stdout && <section aria-label={t("output")}><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/30 p-4 font-mono text-sm leading-6">{result.stdout}</pre></section>}
    {result.plots.map((chunks, index) => <figure key={`${result.time}-${index}`} className="overflow-hidden border-y border-border py-4"><figcaption className="mb-3 text-sm font-medium">{t("plot", { number: index + 1 })}</figcaption><img src={`data:image/png;base64,${chunks.join("")}`} alt={`${taskID} ${t("plot", { number: index + 1 })}`} className="mx-auto h-auto max-h-[60svh] w-full max-w-4xl object-contain" /></figure>)}
  </div>;
}

export function PythonLabRunner({ taskID, source, onSourceChange, starter, params, result, onResult, engine }: {
  taskID: string; source: string; onSourceChange: (source: string) => void; starter: string; params: LabParameters;
  result: LabPythonRun | null; onResult: (result: LabPythonRun) => void; engine?: VirtualLabEngine;
}) {
  const t = useTranslations("learning.virtualLab.python");
  const runtime = useLearningPython(t("runtimeFailed"));
  const [resetting, setResetting] = useState(false);
  const stale = result && (result.code !== source || JSON.stringify(result.params) !== JSON.stringify(params));
  return <div className="space-y-5" data-python-runner>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" disabled={runtime.running} onClick={() => setResetting(true)}><RotateCcw aria-hidden className="size-4" />{engine ? t("loadParameters") : t("resetCode")}</Button>
      <Button variant="outline" size="sm" onClick={() => downloadLabBlob(new Blob([source], { type: "text/x-python;charset=utf-8" }), `${taskID}.py`)}><Download aria-hidden className="size-4" />{t("downloadCode")}</Button>
      <Button size="sm" disabled={runtime.running || !runtime.ready || !source.trim()} onClick={() => {
        const code = source, snapshot = { ...params };
        runtime.run(taskID, code, (output) => onResult({ code, params: snapshot, time: new Date().toISOString(), stdout: output.stdout.slice(0, 12000), stderr: output.stderr.slice(0, 12000), plots: output.plots.map((plot) => plot.match(/.{1,12000}/g) ?? []) }));
      }}><Play aria-hidden className="size-4" />{runtime.running ? t("running") : t("run")}</Button>
    </div>
    <Textarea aria-label={t("editor")} value={source} onChange={(event) => onSourceChange(event.target.value)} maxLength={12000} spellCheck={false} className="min-h-[22rem] resize-y rounded-md bg-muted/25 p-4 font-mono text-sm leading-6" disabled={runtime.running} data-python-editor />
    <iframe ref={runtime.frameRef} title={t("runtimeFrame")} sandbox="allow-scripts" srcDoc={PYTHON_SANDBOX_HTML} onLoad={() => void runtime.initialize()} className="hidden" aria-hidden="true" tabIndex={-1} />
    {!runtime.ready || runtime.running ? <p role="status" className="text-sm text-muted-foreground">{runtime.status ? t(`runtime.${runtime.status}`) : t("runtimeLoading")}</p> : null}
    {runtime.error && <div role="alert" className="space-y-3 text-sm text-destructive"><p>{runtime.error}</p><Button variant="outline" size="sm" onClick={() => void runtime.initialize()}>{t("retryRuntime")}</Button></div>}
    {stale && <p role="status" className="text-sm text-muted-foreground">{t("staleResult")}</p>}
    {result && !runtime.running && <PythonLabResult taskID={taskID} result={result} engine={engine} />}
    <AlertDialog open={resetting} onOpenChange={setResetting}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{engine ? t("loadParameters") : t("resetCode")}</AlertDialogTitle><AlertDialogDescription>{t("replaceCodeWarning")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => onSourceChange(starter)}>{t("replaceCode")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
