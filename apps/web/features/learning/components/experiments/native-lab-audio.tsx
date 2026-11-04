"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { LabParameters, VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";

export function NativeLabAudio({ engine, params }: { engine: VirtualLabEngine; params: LabParameters }) {
  const t = useTranslations("learning.virtualLab.flow");
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState("");
  const signature = JSON.stringify(params);
  useEffect(() => {
    setSupported(typeof globalThis.AudioContext === "function");
    return () => engine.stopAudio();
  }, [engine]);
  useEffect(() => { void signature; engine.stopAudio(); }, [engine, signature]);
  if (!supported) return null;
  const play = async (original: boolean) => {
    try { setError(""); const audio = engine.audioSamples(params, original); await engine.playAudio(audio.samples, audio.sampleRate); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t("audioFailed")); }
  };
  return <div className="space-y-3" data-lab-audio>
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => { void play(true); }}>{t("playOriginal")}</Button>
      <Button variant="outline" onClick={() => { void play(false); }}>{t("playReconstruction")}</Button>
      <Button variant="ghost" onClick={() => engine.stopAudio()}>{t("stopAudio")}</Button>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
