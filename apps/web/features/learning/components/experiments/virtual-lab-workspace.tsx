"use client";

import { ArrowLeft, Download, FlaskConical, Upload } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { SpinnerLabel } from "@/components/ui/spinner";
import { useLearningNativeLab } from "@/features/learning/hooks/use-learning-native-lab";
import { type LabRoute, parseLabRoute } from "@/features/learning/model/virtual-lab-native";
import { NativeLabHelp, NativeLabOverview } from "./native-lab-overview";
import { NativeLabRecords, NativeLabReport } from "./native-lab-records";
import { NativeLabTask } from "./native-lab-task";

export function VirtualLabWorkspace({ initialRoute = "home" }: { initialRoute?: string }) {
  const t = useTranslations("learning.virtualLab");
  const n = useTranslations("learning.virtualLab.native");
  const model = useLearningNativeLab();
  const { engine, snapshot, retry, reload, backup } = model;
  const [route, setRoute] = useState<LabRoute>(() => parseLabRoute("", initialRoute));
  const [printState, setPrintState] = useState<{ key: string; course: string } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [importError, setImportError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const closeReport = useCallback(() => setPrintState(null), []);
  useEffect(() => { setPendingFile(null); setImportError(""); }, [snapshot?.nonce]);
  useEffect(() => {
    const navigate = () => setRoute(parseLabRoute(window.location.hash, initialRoute));
    navigate();
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, [initialRoute]);
  const status = snapshot?.status ?? "loading";
  const onPrint = (course: string) => { if (snapshot) setPrintState({ key: snapshot.nonce, course }); };
  const links = [{ href: "#home", label: n("overview"), active: route.page === "home" }, ...(engine?.courses ?? []).map((course) => ({ href: `#course/${course.id}`, label: `${course.number} · ${course.short}`, active: ["course", "task"].includes(route.page) && route.id.startsWith(course.id) })), { href: "#records/L1", label: n("records"), active: route.page === "records" }, { href: "#help", label: n("help"), active: route.page === "help" }];
  return <main className="h-full min-h-0 min-w-0 flex-1 overflow-y-auto bg-background" data-native-lab>
    <div className="mx-auto w-full max-w-7xl px-4 py-5 md:px-7 md:py-7">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"><div className="min-w-0"><Link href="/learn/experiments" className="mb-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft aria-hidden className="size-4" />{t("back")}</Link>{!["task", "home"].includes(route.page) && <p className="flex items-center gap-2 text-sm font-medium"><FlaskConical aria-hidden className="size-4 text-primary" />{t("title")}</p>}</div><div className="flex flex-wrap items-center gap-2"><span role="status" className={`mr-1 rounded-md border px-2.5 py-1 text-sm ${status === "saved" ? "border-primary/20 text-primary dark:text-primary" : "border-border text-muted-foreground"}`}>{t(`status.${status}`)}</span>{status === "error" && <Button size="sm" variant="outline" onClick={retry}>{t("retry")}</Button>}<details key={`${route.page}/${route.id}`} className="relative" data-record-tools><summary className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm">{n("records")}</summary><div className="absolute right-0 z-20 mt-2 grid min-w-64 gap-2 rounded-lg border border-border bg-card p-3 shadow-sm"><Button asChild size="sm" variant="ghost"><a href={`#records/${route.id.slice(0, 2)}`}>{n("records")}</a></Button>{snapshot?.available && <Button size="sm" variant="outline" onClick={backup}><Download aria-hidden className="size-4" />{t("backup")}</Button>}{engine && <Button size="sm" variant="ghost" onClick={() => fileInput.current?.click()}><Upload aria-hidden className="size-4" />{n("import")}</Button>}</div></details></div></header>
      {(status === "conflict" || status === "invalid") && <div role="alert" className="mb-5 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm leading-7"><p>{t(status === "conflict" ? "conflictNote" : "invalidNote")}</p><Button className="mt-2" size="sm" variant="outline" onClick={reload}>{t("reload")}</Button></div>}
      {snapshot?.localWarning && <p role="alert" className="mb-4 text-sm text-destructive">{t("localWarning")}</p>}
      {importError && <p role="alert" className="mb-4 text-sm text-destructive">{importError}</p>}
      {engine ? <><nav hidden={route.page === "task"} aria-label={n("navigation")} className="mb-7 flex flex-wrap gap-1 rounded-lg border border-border/60 bg-card p-1.5">{links.map((link) => <a key={link.href} href={link.href} aria-current={link.active ? "page" : undefined} className={`rounded-lg px-3 py-2 text-sm leading-5 transition-colors ${link.active ? "bg-accent font-medium text-primary shadow-[inset_2px_0_0_var(--primary)]" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>{link.label}</a>)}</nav><div id="main" data-lab-route={`${route.page}/${route.id}`}>
        {route.page === "task" ? <NativeLabTask key={`${snapshot?.nonce}-${route.id}`} model={model} engine={engine} taskID={route.id} /> : route.page === "records" ? <NativeLabRecords key={snapshot?.nonce} engine={engine} courseID={route.id} onPrint={onPrint} /> : route.page === "help" ? <NativeLabHelp /> : <NativeLabOverview engine={engine} courseID={route.page === "course" ? route.id : undefined} />}
      </div></> : status !== "invalid" && <div className="flex min-h-80 items-center justify-center text-sm text-muted-foreground">{status === "error" ? t("loadFailed") : <SpinnerLabel>{t("status.loading")}</SpinnerLabel>}</div>}
    </div>
    <input ref={fileInput} id="import-file" type="file" accept=".json,application/json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) setPendingFile(file); event.target.value = ""; }} />
    <AlertDialog open={!!pendingFile} onOpenChange={(open) => { if (!open) setPendingFile(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{n("import")}</AlertDialogTitle><AlertDialogDescription>{n("importWarning")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{n("cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => { if (pendingFile) void model.importFile(pendingFile).then(() => setImportError("")).catch((error: unknown) => setImportError(error instanceof Error ? error.message : n("actionFailed"))); }}>{n("confirm")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    {engine && printState && printState.key === snapshot?.nonce && <NativeLabReport engine={engine} courseID={printState.course} onClose={closeReport} />}
  </main>;
}
