"use client";

import { ArrowRight, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MathFormula } from "@/features/learning/components/shared/math-formula";
import { RESPONSE_PREDICTIONS, RESPONSE_SOURCES, RESPONSE_TESTS, checkDiagnosis, createDiagnosisCases, diagnosisAssignment, diagnosisCasePassed, diagnosisScene, expectedDiagnosis, readDiagnosisTrial, type DiagnosisAnswers, type DiagnosisCase } from "@/features/learning/model/virtual-lab-response-diagnosis";
import type { VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";
import { ResponseComparisonPlot } from "./response-comparison-plot";

export function NativeLabResponseDiagnosis({ engine }: { engine: VirtualLabEngine }) {
  const record = engine.records.data.tasks["L1-3"];
  const cases = useMemo(() => createDiagnosisCases(record), [record]);
  return <DiagnosisExperiment key={diagnosisAssignment(cases)} engine={engine} cases={cases} />;
}

function DiagnosisExperiment({ engine, cases }: { engine: VirtualLabEngine; cases: DiagnosisCase[] }) {
  const t = useTranslations("learning.virtualLab.responseDiagnosis");
  const n = useTranslations("learning.virtualLab.native");
  const a = useTranslations("learning.assessment");
  const record = engine.records.data.tasks["L1-3"];
  const [selected, setSelected] = useState(() => Math.max(0, cases.findIndex((_, index) => !diagnosisCasePassed(record, cases, index))));
  const done = cases.filter((_, index) => diagnosisCasePassed(record, cases, index)).length;
  return <div className="space-y-6" data-native-task="L1-3" data-response-diagnosis>
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
      <h1 className="font-display text-3xl font-normal tracking-[-0.015em] md:text-4xl">{t("title")}</h1>
      <select aria-label={n("chooseTask")} value="L1-3" onChange={(event) => { window.location.hash = `task/${event.target.value}`; }} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-auto">{engine.courseIds("L1").map((id, index) => <option key={id} value={id}>{index + 1}. {engine.tasks[id].short || engine.tasks[id].title}</option>)}</select>
    </header>
    <p className="text-base leading-7">{t("mission")}</p>
    <p className="text-sm leading-7">{t("scoring")}</p>
    <div className="border-l-2 border-seal pl-4"><MathFormula>{"y'+y=x(t),\\quad x_{\\mathrm{before}}(t)=u(t),\\quad y_{\\mathrm{before}}(0)=2"}</MathFormula></div>
    <nav aria-label={t("chooseCase")} className="grid grid-cols-3 gap-2">{cases.map((_, index) => <button key={index} type="button" data-diagnosis-case={index} aria-current={selected === index ? "step" : undefined} onClick={() => setSelected(index)} className={`flex min-h-12 items-center justify-between gap-2 rounded-md border px-3 py-3 text-sm ${selected === index ? "border-primary bg-accent shadow-[inset_2px_0_0_var(--primary)]" : "border-border hover:bg-accent/60"}`}><span>{t("case", { number: index + 1 })}</span>{diagnosisCasePassed(record, cases, index) && <Check aria-label={t("passed")} className="size-4" />}</button>)}</nav>
    <DiagnosisStation key={selected} engine={engine} cases={cases} index={selected} next={() => setSelected(selected + 1)} />
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-5">
      <p role="status" className="text-sm">{t("progress", { done })}</p>
      <div className="flex flex-wrap gap-3"><Button asChild variant="outline"><a href="/learn/experiments/assessment#L1-3">{a("title")}</a></Button>{done === cases.length && (record.completion.confirmed ? <Button asChild><a href="#task/L1-4">{n("next")}<ArrowRight aria-hidden className="size-4" /></a></Button> : <Button data-action="complete" onClick={() => { record.completion = { confirmed: true, confirmedAt: new Date().toISOString() }; engine.records.save(); }}>{t("complete")}</Button>)}</div>
    </footer>
  </div>;
}

function DiagnosisStation({ engine, cases, index, next }: { engine: VirtualLabEngine; cases: DiagnosisCase[]; index: number; next: () => void }) {
  const t = useTranslations("learning.virtualLab.responseDiagnosis");
  const record = engine.records.data.tasks["L1-3"], item = cases[index];
  const previous = record.trials.map(readDiagnosisTrial).findLast((trial) => trial?.caseIndex === index && diagnosisAssignment(trial.cases) === diagnosisAssignment(cases));
  const [answers, setAnswers] = useState<DiagnosisAnswers>(previous?.answers ?? { source: "", test: "", prediction: "" });
  const [submitted, setSubmitted] = useState<DiagnosisAnswers | null>(previous?.answers ?? null);
  const [error, setError] = useState("");
  const result = submitted ? checkDiagnosis(item, submitted) : null;
  const expected = expectedDiagnosis(item);
  const groups = [
    { key: "source", label: t("sourceQuestion"), values: RESPONSE_SOURCES, namespace: "sources" },
    { key: "test", label: t("testQuestion", { target: t(`targets.${item.target}`) }), values: RESPONSE_TESTS, namespace: "tests" },
    { key: "prediction", label: t("predictionQuestion", { target: t(`targets.${item.target}`) }), values: RESPONSE_PREDICTIONS, namespace: "predictions" },
  ] as const;
  const run = () => {
    try {
      if (record.trials.length >= 200) throw new Error(t("trialLimit"));
      record.params = { ...engine.defaults("L1-3"), enabled: "on", A: item.amplitude, initial: item.initial };
      record.answers = {};
      record.predictionDraft = t("answerRecord", { number: index + 1, source: t(`sources.${answers.source}`), test: t(`tests.${answers.test}`), prediction: t(`predictions.${answers.prediction}`) });
      if (record.predictionDraft !== (record.revisions.at(-1)?.text ?? record.prediction)) engine.records.prediction("L1-3");
      engine.records.trial("L1-3", diagnosisScene(engine, cases, index, answers), null);
      if (!record.analysis.includes(t("principle"))) record.analysis = [record.analysis.trim(), t("principle")].filter(Boolean).join("\n\n");
      engine.records.save();
      setSubmitted({ ...answers }); setError("");
    } catch (error) { setError(error instanceof Error ? error.message : t("saveFailed")); }
  };
  return <section className="space-y-6">
    <ResponseComparisonPlot setup={item} />
    <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); run(); }}>
      {groups.map((group, index) => <fieldset key={group.key} disabled={submitted !== null} className="space-y-3"><legend className="mb-3 text-base leading-7">{index + 1}. {group.label}</legend><div className="grid gap-2 sm:grid-cols-2">{group.values.map((value) => <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 text-sm leading-6 ${answers[group.key] === value ? "border-primary bg-accent" : "border-border"}`}><input type="radio" name={group.key} value={value} checked={answers[group.key] === value} onChange={() => setAnswers({ ...answers, [group.key]: value })} className="mt-1 accent-primary" /><span>{t(`${group.namespace}.${value}`)}</span></label>)}</div></fieldset>)}
      {!submitted && <Button type="submit" data-action="diagnose" disabled={Object.values(answers).some((value) => !value)}>{t("submit")}</Button>}
    </form>
    {error && <p role="alert" className="text-base text-destructive">{error}</p>}
    {result && <section className="space-y-5 border-t border-border pt-5" data-diagnosis-result>
      <ul className="space-y-2 text-base leading-7">{groups.map((group) => <li key={group.key}>{t(`feedback.${group.key}`)}：{t(result[group.key] ? "correct" : "incorrect")}</li>)}</ul>
      {result.test ? <><h3 className="font-display text-xl font-normal">{t("verification")}</h3><p className="text-base leading-7">{t(`tests.${submitted?.test}`)}</p><ResponseComparisonPlot setup={item} test={submitted?.test} /><p className="text-base leading-7">{t("verificationResult", { prediction: t(`predictions.${expected.prediction}`) })}</p></> : <p className="text-base leading-7">{t("wrongTest", { test: t(`tests.${expected.test}`) })}</p>}
      <p className="text-base leading-7">{t("revealed", { initial: item.initial, amplitude: item.amplitude })} {t("principle")}</p>
      <div className="flex flex-wrap gap-3">{!result.passed && <Button variant="outline" data-action="retry-diagnosis" onClick={() => { setSubmitted(null); setAnswers({ source: "", test: "", prediction: "" }); }}>{t("retry")}</Button>}{result.passed && index < cases.length - 1 && <Button data-action="next-diagnosis" onClick={next}>{t("nextCase")}<ArrowRight aria-hidden className="size-4" /></Button>}</div>
    </section>}
  </section>;
}
