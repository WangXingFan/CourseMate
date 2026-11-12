"use client";

import { ArrowRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MathFormula } from "@/features/learning/components/shared/math-formula";
import { ECG_EXERCISES, ECG_STATIONS, ecgObservationPassed, ecgObservationScene, ecgStationPassed, readEcgObservation, type EcgObservation, type EcgStation } from "@/features/learning/model/virtual-lab-ecg";
import type { VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";
import { EcgObservationPlot } from "./ecg-observation-plot";

export function NativeLabEcg({ engine }: { engine: VirtualLabEngine }) {
  const t = useTranslations("learning.virtualLab.ecg"), n = useTranslations("learning.virtualLab.native"), a = useTranslations("learning.assessment");
  const record = engine.records.data.tasks["L1-4"];
  const [station, setStation] = useState<EcgStation>(() => ECG_STATIONS.find((station) => !ecgStationPassed(record, station)) ?? "timing");
  const done = ECG_STATIONS.filter((station) => ecgStationPassed(record, station)).length;
  return <div className="space-y-6" data-native-task="L1-4" data-ecg-experiment>
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
      <h1 className="font-display text-3xl font-normal tracking-[-0.015em] md:text-4xl">{t("title")}</h1>
      <select aria-label={n("chooseTask")} value="L1-4" onChange={(event) => { window.location.hash = `task/${event.target.value}`; }} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-auto">{engine.courseIds("L1").map((id, index) => <option key={id} value={id}>{index + 1}. {engine.tasks[id].short || engine.tasks[id].title}</option>)}</select>
    </header>
    <nav aria-label={t("chooseStation")} className="grid gap-2 sm:grid-cols-3">{ECG_STATIONS.map((item, index) => <button key={item} type="button" data-ecg-station={item} aria-current={station === item ? "step" : undefined} onClick={() => setStation(item)} className={`flex min-h-12 items-center justify-between gap-2 rounded-md border px-4 py-3 text-sm ${station === item ? "border-primary bg-accent shadow-[inset_2px_0_0_var(--primary)]" : "border-border hover:bg-accent/60"}`}><span>{index + 1}. {t(`stations.${item}.title`)}</span>{ecgStationPassed(record, item) && <Check aria-label={t("passed")} className="size-4" />}</button>)}</nav>
    <EcgObservationStation key={station} station={station} engine={engine} next={() => setStation(station === "noise" ? "shape" : "timing")} />
    {done === ECG_STATIONS.length && <section className="space-y-4 border-t border-border pt-6" data-ecg-summary><h2 className="font-display text-xl font-normal">{t("connection")}</h2><p className="text-base leading-7">{t("convolution")}</p><MathFormula>{"h_W(t)=\\frac{u(t)-u(t-W)}{W},\\qquad y(t)=(x*h_W)(t)=\\frac{1}{W}\\int_{t-W}^{t}x(\\tau)\\,d\\tau"}</MathFormula><p className="text-base leading-7">{t("takeaway")}</p></section>}
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-5"><p role="status" className="text-sm">{t("progress", { done })}</p><div className="flex flex-wrap gap-3"><Button asChild variant="outline"><a href="/learn/experiments/assessment#L1-4">{a("title")}</a></Button>{done === ECG_STATIONS.length && (record.completion.confirmed ? <Button asChild><a href="#course/L2">{n("next")}<ArrowRight aria-hidden className="size-4" /></a></Button> : <Button data-action="complete" onClick={() => { record.completion = { confirmed: true, confirmedAt: new Date().toISOString() }; engine.records.save(); }}>{t("complete")}</Button>)}</div></footer>
  </div>;
}

function EcgObservationStation({ station, engine, next }: { station: EcgStation; engine: VirtualLabEngine; next: () => void }) {
  const t = useTranslations("learning.virtualLab.ecg");
  const record = engine.records.data.tasks["L1-4"], exercise = ECG_EXERCISES[station];
  const previous = record.trials.map(readEcgObservation).findLast((value) => value?.station === station);
  const [width, setWidth] = useState(previous?.width ?? exercise.widths[0]);
  const [widths, setWidths] = useState<number[]>(previous?.widths ?? [exercise.widths[0]]);
  const [time, setTime] = useState(previous?.time ?? 400);
  const [answer, setAnswer] = useState(previous?.answer ?? "");
  const [submitted, setSubmitted] = useState<EcgObservation | null>(previous ?? null);
  const [error, setError] = useState("");
  const observed = exercise.widths.every((width) => widths.includes(width)) && (station !== "timing" || Math.abs(time - 400) >= 10);
  const passed = submitted && ecgObservationPassed(submitted);
  const submit = () => {
    try {
      const value = { station, width, widths, time, startTime: 400, answer };
      record.params = { ...engine.defaults("L1-4"), kind: "ecg", width: width / 1000, time: time / 1000 };
      record.answers = {};
      engine.records.trial("L1-4", ecgObservationScene(engine, value), null);
      const entry = t("answerRecord", { station: t(`stations.${station}.title`), answer: t(`stations.${station}.options.${answer}`) });
      if (ecgObservationPassed(value) && !record.analysis.includes(entry)) record.analysis = [record.analysis.trim(), entry, t(`stations.${station}.feedback`)].filter(Boolean).join("\n\n");
      engine.records.save(); setSubmitted(value); setError("");
    } catch (error) { setError(error instanceof Error ? error.message : t("saveFailed")); }
  };
  return <section className="space-y-6">
    <p className="text-base leading-7">{t(`stations.${station}.instruction`)}</p>
    <div className="flex flex-wrap items-center gap-3"><span className="text-sm">{t("window")}</span>{exercise.widths.map((item) => <Button key={item} type="button" variant={width === item ? "default" : "outline"} aria-pressed={width === item} data-ecg-width={item} onClick={() => { setWidth(item); setWidths((seen) => seen.includes(item) ? seen : [...seen, item]); }}>{item} ms{widths.includes(item) && <Check aria-label={t("viewed")} className="size-4" />}</Button>)}</div>
    <EcgObservationPlot station={station} widthMs={width} timeMs={time} onTime={setTime} />
    <form className="space-y-4 border-t border-border pt-5" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <fieldset disabled={!observed || submitted !== null} className="space-y-3"><legend className="mb-3 text-base leading-7">{t(`stations.${station}.question`)}</legend>{exercise.options.map((option) => <label key={option} className={`flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 text-sm leading-6 ${answer === option ? "border-primary bg-accent" : "border-border"}`}><input type="radio" name="ecg-answer" value={option} checked={answer === option} onChange={() => setAnswer(option)} className="mt-1 accent-primary" /><span>{t(`stations.${station}.options.${option}`)}</span></label>)}</fieldset>
      {!submitted && <Button type="submit" data-action="check-ecg" disabled={!observed || !answer}>{t("check")}</Button>}
      {!observed && <p role="status" className="text-base leading-7">{t(station === "timing" ? "moveFirst" : "compareFirst")}</p>}
    </form>
    {error && <p role="alert" className="text-base text-destructive">{error}</p>}
    {submitted && <div className="space-y-4 border-l-2 border-seal pl-4" data-ecg-result><p role="status" className="text-base leading-7">{t(passed ? "correct" : "incorrect")} {t(`stations.${station}.feedback`)}</p><div className="flex flex-wrap gap-3">{!passed && <Button variant="outline" data-action="retry-ecg" onClick={() => { setSubmitted(null); setAnswer(""); }}>{t("retry")}</Button>}{passed && station !== "timing" && <Button data-action="next-ecg" onClick={next}>{t("next")}<ArrowRight aria-hidden className="size-4" /></Button>}</div></div>}
  </section>;
}
