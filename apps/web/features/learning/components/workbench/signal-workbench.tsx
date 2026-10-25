"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { LessonPanel, LessonShell, Readout } from "@/features/learning/components/shared/lesson-shell";
import { SignalPlot } from "@/features/learning/components/shared/signal-plot";
import { combineSignals, DEFAULT_SOURCE, SAMPLE_DT, sampleSignal, SIGNAL_KINDS, SIGNAL_OPERATIONS, signalYDomain, type SignalOperation, type SignalSource } from "@/features/learning/model/signal-workbench";
import { isOneOf } from "@/shared/lib/type-guards";

const isKind = isOneOf(SIGNAL_KINDS);
const isOperation = isOneOf(SIGNAL_OPERATIONS);
const controls = [
  { key: "amplitude", min: -3, max: 3, step: 0.1 },
  { key: "shift", min: -4, max: 4, step: 0.1 },
  { key: "scale", min: 0.1, max: 4, step: 0.1 },
  { key: "width", min: 0.05, max: 4, step: 0.05 },
  { key: "decay", min: 0.1, max: 3, step: 0.1 },
  { key: "frequency", min: 0.1, max: 3, step: 0.1 },
] as const;

export function SignalWorkbench() {
  const t = useTranslations("learningLabs.workbench");
  const [a, setA] = React.useState<SignalSource>(DEFAULT_SOURCE);
  const [b, setB] = React.useState<SignalSource>({ ...DEFAULT_SOURCE, width: 1 });
  const [operation, setOperation] = React.useState<SignalOperation>("convolve");
  const inputA = React.useMemo(() => sampleSignal(a), [a]);
  const inputB = React.useMemo(() => sampleSignal(b), [b]);
  const output = React.useMemo(() => combineSignals(inputA, inputB, operation), [inputA, inputB, operation]);
  const yDomain = signalYDomain([inputA, inputB, output]);
  const xDomain: readonly [number, number] = operation === "convolve" ? [-16, 16] : [-8, 8];
  const underResolved = [a, b].some((source) => ((source.kind === "impulse" || source.kind === "rectangle") && source.width * source.scale < 4 * SAMPLE_DT) || (source.kind === "sine" && source.frequency / source.scale > 1 / (4 * SAMPLE_DT)));

  function reset() { setA({ ...DEFAULT_SOURCE }); setB({ ...DEFAULT_SOURCE, width: 1 }); setOperation("convolve"); }

  return <LessonShell title={t("title")} formula={String.raw`y(t)=x\!\left(\frac{r(t-s)}{a}\right),\quad r\in\{-1,1\},\;a>0`}>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><Button size="sm" variant="outline" onClick={reset}><RotateCcw className="size-3.5" />{t("reset")}</Button></div>
      <div className="grid gap-4 lg:grid-cols-2"><SourceControls id="A" source={a} onChange={setA} /><SourceControls id="B" source={b} onChange={setB} /></div>
      <LessonPanel title={t("combine")}>
        <div role="group" aria-label={t("combine")} className="flex flex-wrap gap-2">{SIGNAL_OPERATIONS.map((item) => <Button key={item} size="sm" variant={operation === item ? "default" : "outline"} aria-pressed={operation === item} onClick={() => { if (isOperation(item)) setOperation(item); }}>{t(`operations.${item}`)}</Button>)}</div>
        <div className="mt-4 rounded-lg border border-border/50 bg-background p-2 sm:p-4"><SignalPlot xDomain={xDomain} yDomain={yDomain} xLabel="t (s)" yLabel="x(t)" height={340} series={[
          { id: "a", label: t("source", { id: "A" }), points: inputA, color: "var(--chart-1)", width: 1.5, dashed: true },
          { id: "b", label: t("source", { id: "B" }), points: inputB, color: "var(--chart-2)", width: 1.5, dashed: true },
          { id: "output", label: t("output"), points: output, color: "var(--chart-3)", width: 2.5 },
        ]} /></div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"><Readout label={t("range")} value={`[${xDomain[0]}, ${xDomain[1]}] s`} /><Readout label={t("sampling")} value={`Δt = ${SAMPLE_DT} s`} /><Readout label={t("samples")} value={output.length} /></div>

        {underResolved ? <p role="status" className="mt-2 text-sm leading-6 text-primary dark:text-primary">{t("resolutionWarning")}</p> : null}
      </LessonPanel>
    </div>
  </LessonShell>;
}

function SourceControls({ id, source, onChange }: { id: string; source: SignalSource; onChange: (source: SignalSource) => void }) {
  const t = useTranslations("learningLabs.workbench");
  return <LessonPanel title={t("source", { id })}>
    <label className="flex items-center justify-between gap-3 text-sm" htmlFor={`signal-${id}-kind`}>{t("kind")}<select id={`signal-${id}-kind`} className="max-w-48 rounded-md border border-border bg-background px-2 py-1.5" value={source.kind} onChange={(event) => { if (isKind(event.target.value)) onChange({ ...source, kind: event.target.value }); }}>{SIGNAL_KINDS.map((kind) => <option key={kind} value={kind}>{t(`kinds.${kind}`)}</option>)}</select></label>
    <div className="mt-4 space-y-4">{controls.filter(({ key }) => key !== "width" || source.kind === "rectangle" || source.kind === "impulse").filter(({ key }) => key !== "decay" || source.kind === "exponential").filter(({ key }) => key !== "frequency" || source.kind === "sine").map(({ key, min, max, step }) => <div key={key}>
      <label htmlFor={`signal-${id}-${key}`} className="flex justify-between gap-2 text-sm"><span>{t(`parameters.${key}`)}</span><span className="font-mono tabular-nums">{source[key].toFixed(2)}</span></label>
      <input id={`signal-${id}-${key}`} type="range" className="mt-2 w-full accent-primary" min={min} max={max} step={step} value={source[key]} onChange={(event) => onChange({ ...source, [key]: Number(event.target.value) })} />
    </div>)}</div>
    <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" className="accent-primary" checked={source.reversed} onChange={(event) => onChange({ ...source, reversed: event.target.checked })} />{t("reversed")}</label>

  </LessonPanel>;
}
