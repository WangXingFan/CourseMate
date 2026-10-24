"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useLearningVirtualLab } from "@/features/learning/hooks/use-learning-virtual-lab";

export function VirtualLabWorkspace({ initialRoute = "home" }: { initialRoute?: string }) {
  const t = useTranslations("learning.virtualLab");
  const { user, snapshot, record, retry, reload, backup, failRestore, start } = useLearningVirtualLab();
  const frame = useRef<HTMLIFrameElement>(null);
  const available = !!snapshot?.available;
  const nonce = snapshot?.nonce;
  const document = snapshot?.document;
  const sendInit = useCallback(() => {
    if (!user || !available || !nonce) return;
    frame.current?.contentWindow?.postMessage({
      channel: "coursemate-lab", type: "init", nonce, document,
      identity: { name: user.displayName || user.username, number: user.username },
    }, "*");
  }, [user, available, nonce, document]);
  useEffect(() => {
    const navigate = () => {
      const route = window.location.hash.slice(1) || initialRoute;
      frame.current?.contentWindow?.postMessage({ channel: "coursemate-lab", type: "navigate", nonce, route }, "*");
    };
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== "null") return;
      const msg: unknown = event.data;
      if (typeof msg !== "object" || !msg || !("channel" in msg) || msg.channel !== "coursemate-lab" || !("type" in msg)) return;
      if (msg.type === "ready") { sendInit(); return; }
      if (!("nonce" in msg) || msg.nonce !== nonce) return;
      if (msg.type === "loaded" && "document" in msg && typeof msg.document === "string") { start(msg.document); navigate(); }
      if (msg.type === "error") failRestore();
      if (msg.type === "change" && "document" in msg && typeof msg.document === "string") record(msg.document);
    };
    window.addEventListener("message", receive);
    window.addEventListener("hashchange", navigate);
    return () => {
      window.removeEventListener("message", receive);
      window.removeEventListener("hashchange", navigate);
    };
  }, [nonce, sendInit, record, failRestore, start, initialRoute]);
  const status = snapshot?.status ?? "loading";
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <Link href="/learn/experiments" className="text-xs underline underline-offset-4">{t("back")}</Link>
        <h1 className="text-sm font-medium">{t("title")}</h1>
        <span className="text-xs text-muted-foreground">{user?.displayName || user?.username} · {user?.username}</span>
        <span role="status" className="text-xs text-muted-foreground">{t(`status.${status}`)}</span>
        {status === "error" && <Button size="sm" variant="outline" onClick={retry}>{t("retry")}</Button>}
        {available && <Button size="sm" variant="outline" onClick={backup}>{t("backup")}</Button>}
      </header>
      {(status === "conflict" || status === "invalid") && (
        <div role="alert" className="border-b border-border bg-muted p-4 text-xs leading-6">
          <p>{t(status === "conflict" ? "conflictNote" : "invalidNote")}</p>
          <Button className="mt-2" size="sm" variant="outline" onClick={reload}>{t("reload")}</Button>
        </div>
      )}
      {snapshot?.localWarning && <p role="alert" className="p-3 text-xs">{t("localWarning")}</p>}
      {available ? (
        <iframe key={nonce} ref={frame} title={t("frameTitle")} src="/vendor/signal-lab/index.html"
          sandbox="allow-scripts allow-downloads allow-modals" referrerPolicy="origin"
          onLoad={sendInit} className="min-h-0 w-full flex-1 border-0 bg-white" />
      ) : (
        <p className="p-6 text-sm text-muted-foreground">{t(status === "error" ? "loadFailed" : "status.loading")}</p>
      )}
    </div>
  );
}
