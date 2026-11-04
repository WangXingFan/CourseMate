"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { LabParameter, LabValue } from "@/public/vendor/signal-lab/core.mjs";

const inputClass = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-invalid:border-destructive";

export function NativeLabParameter({ spec, value, onChange, taskID }: { spec: LabParameter; value: LabValue; onChange: (value: LabValue) => boolean; taskID: string }) {
  const t = useTranslations("learning.virtualLab.native");
  const [text, setText] = useState(String(value));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { setText(String(value)); setInvalid(false); }, [value]);
  const id = `param-${spec.key}`;
  return <div className="space-y-2">
    <label htmlFor={id} className="flex items-center justify-between gap-2 text-sm"><span>{spec.label}</span><span className="font-mono text-sm text-muted-foreground">{spec.unit}</span></label>
    {spec.type === "select" ? <select id={id} value={value} className={inputClass} onChange={(event) => onChange(event.target.value)}>{spec.options?.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select> : <>
      <input id={id} type="number" min={spec.min} max={spec.max} step={spec.step} value={text} aria-invalid={invalid} aria-label={t("parameterExact", { label: spec.label })} className={inputClass}
        onChange={(event) => { const next = event.target.value; setText(next); setInvalid(!next.trim() || !onChange(Number(next))); }} />
      <input type="range" min={spec.min} max={spec.max} step={spec.step} value={value} aria-label={t("parameterSlider", { label: spec.label })} className="h-1.5 w-full cursor-pointer accent-primary"
        onChange={(event) => { let next = Number(event.target.value); if (taskID === "L1-1" && spec.key === "a" && Math.abs(next) < 0.25) next = Number(value) > 0 ? -0.25 : 0.25; if (onChange(next)) { setText(String(next)); setInvalid(false); } }} />
      {invalid && <p role="alert" className="text-sm leading-6 text-destructive">{t("invalidParameter")}</p>}
    </>}
  </div>;
}

