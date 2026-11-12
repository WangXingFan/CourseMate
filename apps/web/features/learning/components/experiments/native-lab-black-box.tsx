"use client";

import { ArrowRight, Check, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LearningHelp } from "@/features/learning/components/shared/learning-help";
import { MathFormula } from "@/features/learning/components/shared/math-formula";
import { BLACK_BOX_PROBES, blackBoxAnswerCorrect, blackBoxChoices, blackBoxEvidence, blackBoxIdentified, blackBoxParams, blackBoxPulse, blackBoxScene, blackBoxTested, createBlackBoxes, readBlackBoxTrial, type BlackBox, type BlackBoxProbe, type BlackBoxReasoning } from "@/features/learning/model/virtual-lab-black-box";
import type { VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";
import { NativeLabPlot } from "./native-lab-plot";

export function NativeLabBlackBox({ engine }: { engine: VirtualLabEngine }) {
  const record = engine.records.data.tasks["L1-2"];
  const boxes = useMemo(() => createBlackBoxes(record), [record]);
  return <BlackBoxExperiment key={boxes[0]?.assignment} engine={engine} boxes={boxes} />;
}

function BlackBoxExperiment({ engine, boxes }: { engine: VirtualLabEngine; boxes: BlackBox[] }) {
  const t = useTranslations("learning.virtualLab.blackBox");
  const n = useTranslations("learning.virtualLab.native");
  const a = useTranslations("learning.assessment");
  const record = engine.records.data.tasks["L1-2"];
  const [selected, setSelected] = useState(() => Math.max(0, boxes.findIndex((box) => !blackBoxIdentified(record, box))));
  const navigation = useRef<HTMLElement>(null);
  const selectBox = (index: number) => { setSelected(index); navigation.current?.scrollIntoView({ block: "start" }); };
  const box = boxes[selected], done = boxes.filter((item) => blackBoxIdentified(record, item)).length;
  const ready = boxes.every((item) => blackBoxIdentified(record, item));
  return <div className="space-y-6" data-native-task="L1-2" data-black-box-lab>
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
      <h1 className="font-display text-3xl font-normal tracking-[-0.015em] md:text-4xl">{t("title")}</h1>
      <select aria-label={n("chooseTask")} value="L1-2" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-auto" onChange={(event) => { window.location.hash = `task/${event.target.value}`; }}>
        {engine.courseIds("L1").map((id, index) => <option key={id} value={id}>{index + 1}. {id === "L1-2" ? t("title") : engine.tasks[id].short || engine.tasks[id].title}</option>)}
      </select>
    </header>
    <div className="flex flex-wrap justify-end gap-3"><LearningHelp title={t("title")} context={JSON.stringify({ task: "L1-2", trials: record.trials.filter((trial) => readBlackBoxTrial(trial)).map((trial) => trial.measurements.blackBox), analysis: record.analysis })} returnHref="/learn/experiments/workspace#task/L1-2" /><Button asChild variant="outline"><a href="/learn/experiments/assessment#L1-2">{a("title")}</a></Button></div>
    <p className="max-w-3xl text-base leading-7">{t("mission")}</p>
    <nav ref={navigation} aria-label={t("chooseBox")} className="grid grid-cols-3 gap-2 border-b border-border pb-5">
      {boxes.map((item, index) => <button type="button" key={item.id} data-box={item.id} aria-current={selected === index ? "step" : undefined} onClick={() => selectBox(index)} className={`flex min-h-12 items-center justify-between gap-2 rounded-md border px-4 py-3 text-sm ${selected === index ? "border-primary bg-accent shadow-[inset_2px_0_0_var(--primary)]" : "border-border hover:bg-accent/60"}`}>
        <span>{t("box", { id: item.id })}</span>{blackBoxIdentified(record, item) && <Check aria-label={t("identified")} className="size-4 shrink-0" />}
      </button>)}
    </nav>
    <BlackBoxStation key={box.id} engine={engine} box={box} next={() => selectBox(Math.min(selected + 1, boxes.length - 1))} />
    {ready && <section className="space-y-4 border-t border-border pt-5" data-black-box-summary><h2 className="font-display text-2xl font-normal">{t("conclusion")}</h2>{boxes.map((item) => <p key={item.id} className="text-base leading-7">{t("analysisRecord", { id: item.id, model: t(`models.${item.kind}`), linear: t(item.linear ? "yes" : "no"), invariant: t(item.invariant ? "yes" : "no") })}</p>)}</section>}
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-5">
      <p role="status" className="text-sm">{t("progress", { done, total: boxes.length })}</p>
      {ready && (record.completion.confirmed ? <Button asChild><a href="#task/L1-3">{n("next")}<ArrowRight aria-hidden className="size-4" /></a></Button> : <Button data-action="complete" onClick={() => { record.completion = { confirmed: true, confirmedAt: new Date().toISOString() }; engine.records.save(); }}>{t("complete")}</Button>)}
    </footer>
  </div>;
}

function BlackBoxStation({ engine, box, next }: { engine: VirtualLabEngine; box: BlackBox; next: () => void }) {
  const t = useTranslations("learning.virtualLab.blackBox");
  const record = engine.records.data.tasks["L1-2"];
  const trials = record.trials.map(readBlackBoxTrial).filter((trial) => trial?.box.id === box.id && trial.box.assignment === box.assignment);
  const previous = trials.at(-1), attempt = trials.findLast((trial) => trial?.guess);
  const choices = blackBoxChoices(box);
  const [probe, setProbe] = useState<BlackBoxProbe | null>(previous?.probe ?? null);
  const [guess, setGuess] = useState(attempt?.guess && choices.some((kind) => kind === attempt.guess) ? attempt.guess : "");
  const [reasoning, setReasoning] = useState<BlackBoxReasoning>(attempt?.reasoning ?? { height: null, shift: null });
  const [message, setMessage] = useState("");
  const identified = blackBoxIdentified(record, box);
  const testedAll = BLACK_BOX_PROBES.every((item) => blackBoxTested(record, box, item));
  const pulse = probe ? blackBoxPulse(box, probe) : null;
  const scene = probe ? blackBoxScene(engine, box, probe) : null;
  const input = scene?.plots[0], output = scene?.plots[1];
  const plot = input && output ? { ...output, title: t("plot"), series: [{ ...output.series[0], label: t("output"), width: 4 }, { ...input.series[0], label: t("input"), fill: false, dash: "7 4", width: 2 }] } : null;
  const run = (test: BlackBoxProbe, choice = "") => {
    try {
      if (record.trials.length >= 200) throw new Error(t("trialLimit"));
      const params = blackBoxParams(engine, box, test);
      record.params = params; record.answers = { evidence: blackBoxEvidence(params) };
      if (choice) {
        record.predictionDraft = `${t("guessRecord", { id: box.id, model: t(`models.${choice}`) })}；${t("reasoningRecord", { height: reasoning.height ?? "—", shift: reasoning.shift ?? "—" })}`;
        if (record.predictionDraft !== (record.revisions.at(-1)?.text ?? record.prediction)) engine.records.prediction("L1-2");
      }
      engine.records.trial("L1-2", blackBoxScene(engine, box, test, choice, choice ? reasoning : undefined), null);
      if (blackBoxAnswerCorrect(box, choice, reasoning)) {
        const conclusion = t("analysisRecord", { id: box.id, model: t(`models.${box.kind}`), linear: t(box.linear ? "yes" : "no"), invariant: t(box.invariant ? "yes" : "no") });
        record.analysis = [record.analysis, `${conclusion} ${t("reasoningRecord", { height: reasoning.height ?? "—", shift: reasoning.shift ?? "—" })}`].filter(Boolean).join("\n");
        engine.records.save();
      }
      setProbe(test);
      setMessage(!choice || blackBoxAnswerCorrect(box, choice, reasoning) ? "" : reasoning.height !== blackBoxPulse(box, "double").outputHeight ? t("retryHeight") : reasoning.shift !== blackBoxPulse(box, "shift").outputStart - blackBoxPulse(box, "baseline").outputStart ? t("retryShift") : t(`choiceFeedback.${choice}`));
    } catch (error) { setMessage(error instanceof Error ? error.message : t("actionFailed")); }
  };
  return <section className="space-y-6" data-black-box-station={box.id}>
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h2 className="font-display text-2xl font-normal">{t("box", { id: box.id })}</h2>
      <span className="font-mono text-sm">{t("tests", { done: BLACK_BOX_PROBES.filter((item) => blackBoxTested(record, box, item)).length })}</span>
    </div>
    <section className="space-y-4">
      <h3 className="text-base font-medium">{t("sendStep")}</h3>
      <p className="text-base leading-7">{t("probeRule")}</p>
      <div className="grid gap-3 sm:grid-cols-3">{BLACK_BOX_PROBES.map((test, index) => <Button key={test} data-probe={test} variant={probe === test || !probe && index === 0 ? "default" : "outline"} disabled={test !== "baseline" && !blackBoxTested(record, box, "baseline")} onClick={() => run(test)}>
        {blackBoxTested(record, box, test) ? <Check aria-hidden className="size-4" /> : <Send aria-hidden className="size-4" />}{t(`probes.${test}`)}
      </Button>)}</div>
    </section>
    <section className="space-y-4" data-black-box-results>
      {plot && pulse ? <>
        <figure><figcaption className="mb-2 text-base">{t("plot")}</figcaption><NativeLabPlot engine={engine} taskID="L1-2" plot={plot} yRange={[-0.5, 4.5]} yTicks={[0, 1, 2, 3, 4]} /></figure>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4" data-black-box-readout>
          {[["inputHeight", pulse.inputHeight], ["outputHeight", pulse.outputHeight], ["outputStart", pulse.outputStart], ["outputWidth", pulse.outputWidth]].map(([key, value]) => <div key={key} className="border-l-2 border-primary pl-3"><dt className="text-sm text-muted-foreground">{t(`readouts.${key}`)}</dt><dd className="mt-1 font-mono text-lg">{value}</dd></div>)}
        </dl>
        <p className="text-base leading-7">{t(`observations.${probe}`, { inputHeight: pulse.inputHeight, inputStart: pulse.inputStart, outputHeight: pulse.outputHeight, outputStart: pulse.outputStart, outputWidth: pulse.outputWidth })}</p>
      </> : <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-border px-6 py-8 text-base leading-7">{t("start")}</div>}
      {probe && <div role="region" aria-label={t("evidence")} className="overflow-x-auto rounded-md border border-border"><table className="w-full min-w-[36rem] text-left text-sm" data-black-box-evidence>
        <caption className="sr-only">{t("evidence")}</caption>
        <thead className="border-b border-border"><tr>{["test", "inputHeight", "inputStart", "outputHeight", "outputStart", "outputWidth"].map((key) => <th key={key} scope="col" className="px-3 py-3 text-xs font-normal">{t(`columns.${key}`)}</th>)}</tr></thead>
        <tbody>{BLACK_BOX_PROBES.map((test) => {
          const values = blackBoxTested(record, box, test) ? blackBoxPulse(box, test) : null;
          return <tr key={test} className={`border-b border-border/50 last:border-0 ${probe === test ? "bg-accent/50" : ""}`}><th scope="row" className="px-3 py-3 font-normal">{t(`probes.${test}`)}</th>{[values?.inputHeight, values?.inputStart, values?.outputHeight, values?.outputStart, values?.outputWidth].map((value, index) => <td key={index} className="px-3 py-3 font-mono">{value ?? "—"}</td>)}</tr>;
        })}</tbody>
      </table></div>}
    </section>
    <section className="space-y-4 border-t border-border pt-5">
      <h3 className="font-display text-xl font-normal">{t("identifyStep")}</h3>
      {testedAll ? <>
        <div className="grid gap-4 sm:grid-cols-2" data-black-box-reasoning>
          <label className="space-y-2 text-base"><span className="block">{t("heightQuestion")}</span><select data-black-box-height value={reasoning.height ?? ""} disabled={identified} onChange={(event) => { setReasoning((value) => ({ ...value, height: event.target.value ? Number(event.target.value) : null })); setMessage(""); }} className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"><option value="">{t("chooseEvidence")}</option>{[2, 4].map((value) => <option key={value} value={value}>{t("heightOption", { value })}</option>)}</select></label>
          <label className="space-y-2 text-base"><span className="block">{t("shiftQuestion")}</span><select data-black-box-shift value={reasoning.shift ?? ""} disabled={identified} onChange={(event) => { setReasoning((value) => ({ ...value, shift: event.target.value ? Number(event.target.value) : null })); setMessage(""); }} className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"><option value="">{t("chooseEvidence")}</option>{[0.5, 1].map((value) => <option key={value} value={value}>{t("shiftOption", { value })}</option>)}</select></label>
        </div>
        <fieldset className="grid gap-3 sm:grid-cols-3" data-black-box-choices><legend className="sr-only">{t("identifyStep")}</legend>{choices.map((kind) => <label key={kind} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-base ${guess === kind ? "border-primary bg-accent" : "border-border"}`}>
          <input type="radio" name={`black-box-${box.id}`} data-model={kind} value={kind} checked={guess === kind} disabled={identified} onChange={() => { setGuess(kind); setMessage(""); }} className="size-4 accent-primary" />{t(`models.${kind}`)}
        </label>)}</fieldset>
        {!identified && <Button data-action="identify" disabled={!guess || reasoning.height === null || reasoning.shift === null} onClick={() => { if (probe) run(probe, guess); }}>{t("checkModel")}<ArrowRight aria-hidden className="size-4" /></Button>}
      </> : <p className="text-base leading-7">{t("needTests")}</p>}
      {message && <p role="alert" className="border-l-2 border-seal pl-4 text-base leading-7">{message}</p>}
    </section>
    {identified && <section className="space-y-4 border-y border-border py-5" data-black-box-identified>
      <h3 className="flex items-center gap-2 font-display text-xl font-normal"><Check aria-hidden className="size-5" />{t("reveal", { id: box.id })}</h3>
      <div className="border-l-2 border-seal pl-4"><MathFormula>{box.formula}</MathFormula></div>
      <p className="text-base leading-7">{t(`explanations.${box.kind}`)}</p>
      <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">{t("linear")}</dt><dd className="mt-1 text-base">{t(box.linear ? "yes" : "no")}</dd></div><div><dt className="text-sm text-muted-foreground">{t("invariant")}</dt><dd className="mt-1 text-base">{t(box.invariant ? "yes" : "no")}</dd></div></dl>
      <p className="text-base leading-7">{t("principle")}</p>
      {box.id !== "C" && <div className="flex justify-end"><Button data-action="next-box" onClick={next}>{t("nextBox")}<ArrowRight aria-hidden className="size-4" /></Button></div>}
    </section>}
  </section>;
}
