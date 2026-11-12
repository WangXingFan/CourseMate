import { parseLabReading } from "./virtual-lab-reading.ts";
import { blackBoxComplete, readBlackBoxTrial } from "./virtual-lab-black-box.ts";
import { diagnosisComplete } from "./virtual-lab-response-diagnosis.ts";
import { ecgComplete } from "./virtual-lab-ecg.ts";
import type { LabMeasurement, LabParameters, LabTaskRecord, LabTrial } from "@/public/vendor/signal-lab/core.mjs";

export type LabStep = { key: string; params: LabParameters; controls?: string[]; initial?: LabParameters; exclude?: LabParameters[];
  hiddenMetrics?: string[]; predictedReadingKey?: string; answers?: string[];
  observation?: { reading: string; tolerance: number };
  target?: { reading: string; min?: number; max?: number };
};
export type LabFlow = { steps: LabStep[]; derivation?: boolean };

// Each step is a reproducible comparison. Progress is derived from saved trials,
// so existing account records, JSON imports and reports remain compatible.
export const LAB_FLOWS: Record<string, LabFlow> = {
  "L1-1": { steps: [
    { key: "original", params: { mode: "transform", A: 1, a: 1, shift: 0 }, hiddenMetrics: ["峰值时刻"], predictedReadingKey: "peakTime", observation: { reading: "peakTime", tolerance: 0.05 } },
    { key: "compress", params: { mode: "transform", A: 1, a: 2, shift: 0 }, controls: ["a"], initial: { a: 1 }, hiddenMetrics: ["支撑终点"], predictedReadingKey: "supportEnd", observation: { reading: "supportEnd", tolerance: 0.05 } },
    { key: "combine", params: { mode: "transform", A: 2, a: 2, shift: 1 }, controls: ["A", "a", "shift"], initial: { A: 1, a: 1, shift: 0 }, hiddenMetrics: ["峰值时刻"], predictedReadingKey: "peakTime", observation: { reading: "peakTime", tolerance: 0.05 } },
    { key: "pulse1", params: { mode: "impulse", delta: 0.2 }, controls: ["delta"], initial: { delta: 0.5 }, hiddenMetrics: ["脉冲高度"], predictedReadingKey: "height", observation: { reading: "height", tolerance: 0.05 } },
  ] },
  "L1-2": { steps: [
    ...["affine", "square"].map((kind) => ({ key: kind, params: { kind, test: "linearity" }, controls: ["x1", "x2", "alpha", "beta"], hiddenMetrics: ["最大绝对差", "本组试验"], predictedReadingKey: "counterexample", observation: { reading: "counterexample", tolerance: 0 } })),
    { key: "timescale", params: { kind: "timescale", test: "invariance" }, controls: ["x1", "delay"], hiddenMetrics: ["最大绝对差", "本组试验"], predictedReadingKey: "counterexample", observation: { reading: "counterexample", tolerance: 0 } },
    ...["delay", "integrator"].map((kind) => ({ key: kind, params: { kind, test: "invariance" }, controls: ["x1", "delay"], hiddenMetrics: ["最大绝对差", "本组试验"], predictedReadingKey: "counterexample", observation: { reading: "counterexample", tolerance: 0 } })),
  ] },
  "L1-3": { steps: [
    { key: "zeroInput", params: { enabled: "off", initial: 2 }, controls: ["enabled", "A", "initial"], initial: { enabled: "on", A: 1, initial: 2 } },
    { key: "zeroState", params: { enabled: "on", A: 1, initial: 0 }, controls: ["enabled", "A", "initial"], initial: { enabled: "off", A: 1, initial: 2 } },
    { key: "total", params: { enabled: "on", A: 1, initial: 2 }, controls: ["enabled", "A", "initial"], initial: { enabled: "on", A: 1, initial: 0 } },
    { key: "lower", params: { enabled: "on", A: 1, initial: 0.5 }, controls: ["enabled", "A", "initial"], initial: { enabled: "on", A: 1, initial: 2 } },
    { key: "amplitude", params: { enabled: "on", A: 2, initial: 0.5 }, controls: ["enabled", "A", "initial"], initial: { enabled: "on", A: 1, initial: 0.5 } },
  ] },
  "L1-4": { steps: [
    ...[{ key: "overlap1", time: 0.5 }, { key: "overlap2", time: 1 }, { key: "overlap4", time: 2.5 }].map(({ key, time }) => ({ key, params: { kind: "rr", time }, hiddenMetrics: ["乘积积分值"], predictedReadingKey: "integral", observation: { reading: "integral", tolerance: 0.03 } })),
    ...[{ key: "response1", time: 0.41, width: 0.02 }, { key: "response3", time: 0.44, width: 0.08 }].map(({ key, time, width }) => ({ key, params: { kind: "ecg", time, width }, hiddenMetrics: ["乘积积分值"], predictedReadingKey: "integral", observation: { reading: "integral", tolerance: 0.03 } })),
  ] },
  "L2-1": { steps: [3, 7, 15].map((K, i) => ({ key: `harmonic${i + 1}`, params: { K: String(K) }, hiddenMetrics: ["合成最大值"], predictedReadingKey: "maximum", observation: { reading: "maximum", tolerance: 0.03 } })) },
  "L2-2": { steps: [
    ...[{ key: "width0", T: 0.5 }, { key: "width2", T: 2 }].map(({ key, T }) => ({ key, params: { A: 1, T, center: 0 }, hiddenMetrics: ["第一正零点"], predictedReadingKey: "firstZero", observation: { reading: "firstZero", tolerance: 0.03 } })),
    { key: "shift", params: { A: 1, T: 1, center: 1 }, hiddenMetrics: ["f=0.25 Hz 相位"], predictedReadingKey: "phaseAtQuarter", observation: { reading: "phaseAtQuarter", tolerance: 0.03 } },
    { key: "amplitude", params: { A: 2, T: 1, center: 0 }, hiddenMetrics: ["X(0)"], predictedReadingKey: "zeroFrequency", observation: { reading: "zeroFrequency", tolerance: 0.03 } },
  ] },
  "L2-3": { steps: [
    ...[2, 40].map((fc, i) => ({ key: `first${i}`, params: { fc, filterType: "lowpass" }, answers: [], hiddenMetrics: ["10 Hz 幅度比", "50 Hz 幅度比", "双项指标"], predictedReadingKey: "passed", observation: { reading: "passed", tolerance: 0 } })),
    { key: "design", params: { filterType: "notch" }, controls: ["center", "alpha"], initial: { center: 48, alpha: 10 }, hiddenMetrics: ["双项指标"], predictedReadingKey: "passed", observation: { reading: "passed", tolerance: 0 }, target: { reading: "passed", min: 1 } },
    { key: "higher", params: { filterType: "notch", center: 50, alpha: 60 }, predictedReadingKey: "passed", observation: { reading: "passed", tolerance: 0 }, hiddenMetrics: ["双项指标"] },
  ] },
  "L2-4": { steps: [
    { key: "sample0", params: { mode: "base", fs: "100" }, predictedReadingKey: "aliasing", observation: { reading: "aliasing", tolerance: 0 } },
    { key: "sample2", params: { mode: "base", fs: "15" }, predictedReadingKey: "aliasing", observation: { reading: "aliasing", tolerance: 0 } },
    { key: "candidate", params: { mode: "base", fs: "15" }, controls: ["candidate"], initial: { candidate: 0 }, target: { reading: "sampleDifference", max: 1e-6 } },
    { key: "audio", params: { mode: "audio", fs: "4000", antiAlias: "off" }, hiddenMetrics: ["混叠频率"], predictedReadingKey: "aliasFrequency", observation: { reading: "aliasFrequency", tolerance: 10 } },
    { key: "filtered", params: { mode: "audio", fs: "4000", antiAlias: "on" }, controls: ["filterOrder", "filterCutoff"], hiddenMetrics: ["混叠幅度"], predictedReadingKey: "aliasedAmplitude", observation: { reading: "aliasedAmplitude", tolerance: 0.002 }, target: { reading: "aliasedAmplitude", max: 0.05 } },
  ] },
  "L3-1": { derivation: true, steps: [
    { key: "exponential1", params: { mode: "exp", A: 1, a: 1 } },
    { key: "pulse", params: { mode: "pulse", A: 1, T: 1 } },
    { key: "delayed", params: { mode: "delayed", A: 3, start: 1, T: 2 } },
  ] },
  "L3-2": { derivation: true, steps: [
    { key: "initial", params: { initial: "0", measureTime: 0 } },
    { key: "one", params: { initial: "0", measureTime: 1 } },
    { key: "ninety", params: { initial: "0" }, controls: ["measureTime"], exclude: [{ measureTime: 0 }, { measureTime: 1 }], hiddenMetrics: ["数值 t90"], target: { reading: "yAtTime", min: 0.898, max: 0.902 } },
    { key: "initial1", params: { initial: "0.5", measureTime: 1 } },
    { key: "initial2", params: { initial: "2", measureTime: 1 } },
  ] },
  "L3-3": { derivation: true, steps: [
    { key: "under", params: { center: 50, alpha: 5 }, predictedReadingKey: "components.1.ratio", observation: { reading: "components.1.ratio", tolerance: 0.005 }, hiddenMetrics: ["50 Hz 幅度比"] },
    { key: "over", params: { center: 50, alpha: 60 } },
    { key: "unstable", params: { center: 50, alpha: -10 }, predictedReadingKey: "stable", observation: { reading: "stable", tolerance: 0 }, hiddenMetrics: ["稳定性"] },
    { key: "design", params: {}, controls: ["center", "alpha"], target: { reading: "passed", min: 1 } },
    { key: "frequency", params: {}, target: { reading: "passed", min: 1 } },
  ] },
  "L3-4": { derivation: true, steps: [
    ...[{ key: "width0", T: 0.5 }, { key: "width2", T: 2 }].map(({ key, T }) => ({ key, params: { T }, hiddenMetrics: ["测量峰值", "理论峰值", "测量峰时"], predictedReadingKey: "peak", observation: { reading: "peak", tolerance: 0.02 } })),
    { key: "refine", params: {}, controls: ["T"], exclude: [0.5, 1, 2, 3].map((T) => ({ T })), target: { reading: "peak", min: 0.8, max: 0.802 } },
  ] },
};

export function matchesLabStep(step: LabStep, trial: Pick<LabTrial, "params" | "answers">): boolean {
  if (!Object.entries(step.params).every(([key, value]) => trial.params[key] === value)) return false;
  if (step.exclude?.some((params) => Object.entries(params).every(([key, value]) => trial.params[key] === value))) return false;
  return (step.answers ?? Object.keys(trial.answers)).every((key) => trial.answers[key]?.trim() || (key === "delay2" && ["exp", "step"].includes(String(trial.params.mode))));
}

export function labMeasurementAt(measurements: Record<string, LabMeasurement>, path: string): LabMeasurement | null {
  let value: LabMeasurement = measurements;
  for (const part of path.split(".")) {
    if (!value || typeof value !== "object") return null;
    value = Array.isArray(value) ? value[Number(part)] : value[part];
  }
  return value ?? null;
}

export function labReading(measurements: Record<string, LabMeasurement>, path: string): number | null {
  const value = labMeasurementAt(measurements, path);
  return typeof value === "boolean" ? Number(value) : typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function labPredictionDiffers(predicted: LabMeasurement, measured: LabMeasurement): boolean {
  if (typeof predicted === "boolean") predicted = Number(predicted);
  if (typeof measured === "boolean") measured = Number(measured);
  if (typeof predicted !== "number" || !Number.isFinite(predicted) || typeof measured !== "number" || !Number.isFinite(measured)) return false;
  return measured === 0 ? Math.abs(predicted) > 1e-9 : Math.abs(predicted - measured) / Math.abs(measured) > 0.2;
}

export function labTrialPrediction(step: LabStep, trial?: Pick<LabTrial, "measurements">): { predictedValue: number | boolean; value: number } | null {
  const observation = trial?.measurements.observation;
  if (!observation || typeof observation !== "object" || Array.isArray(observation) || observation.step !== step.key) return null;
  if (step.predictedReadingKey === "counterexample" && observation.reading === "maxDifference") {
    const comparison = trial?.measurements.comparison;
    if (comparison !== "counterexample" && comparison !== "equal-for-this-input") return null;
    return { predictedValue: typeof observation.predictedValue === "number" ? observation.predictedValue > 1e-6 : comparison === "counterexample", value: Number(comparison === "counterexample") };
  }
  const { predictedValue, value } = observation;
  if (typeof predictedValue !== "boolean" && !(typeof predictedValue === "number" && Number.isFinite(predictedValue) && Math.abs(predictedValue) <= 1e9)) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return { predictedValue, value };
}

export function validLabObservation(step: LabStep, readings: Record<string, LabMeasurement>, text: string): boolean {
  if (!step.observation) return true;
  const expected = labReading(readings, step.observation.reading), value = parseLabReading(text, step.observation.reading);
  return !!text.trim() && expected !== null && value !== null && Math.abs(value - expected) <= step.observation.tolerance + 1e-9;
}

export function hasLabStepEvidence(step: LabStep, trial: Pick<LabTrial, "params" | "answers" | "measurements">): boolean {
  if (!matchesLabStep(step, trial)) return false;
  const statuses = trial.measurements.answerStatus;
  if ((step.answers ?? Object.keys(trial.answers)).length && (!Array.isArray(statuses) || !statuses.length || statuses.some((status) => !status || typeof status !== "object" || Array.isArray(status) || status.status !== "correct"))) return false;
  if (step.target) {
    if (trial.measurements.exerciseStep !== step.key) return false;
    const value = labReading(trial.measurements, step.target.reading);
    if (value === null || value < (step.target.min ?? -Infinity) || value > (step.target.max ?? Infinity)) return false;
    if (step.key === "candidate" && Number(trial.params.candidate) >= Number(trial.params.fs) / 2) return false;
  }
  if (!step.observation) return true;
  const answer = trial.measurements.observation;
  if (step.observation.reading === "counterexample" && answer && typeof answer === "object" && !Array.isArray(answer)
    && answer.step === step.key && answer.reading === "maxDifference" && typeof answer.value === "number") {
    const maximumDifference = labReading(trial.measurements, "maxDifference");
    return maximumDifference !== null && Math.abs(answer.value - maximumDifference) <= 0.01;
  }
  return !!answer && typeof answer === "object" && !Array.isArray(answer) && answer.step === step.key && typeof answer.value === "number" && validLabObservation(step, trial.measurements, String(answer.value));
}

export function resumeLabStep(flow: LabFlow, record: LabTaskRecord): number {
  const missing = firstMissingLabStep(flow, record), pending = flow.steps[missing];
  if (pending && Object.entries({ ...pending.params, ...pending.initial }).every(([key, value]) => record.params[key] === value) && !pending.exclude?.some((params) => Object.entries(params).every(([key, value]) => record.params[key] === value))) return missing;
  const matching = flow.steps.map((step, index) => ({ step, index })).filter(({ step }) => Object.entries(step.params).every(([key, value]) => record.params[key] === value));
  matching.sort((a, b) => Object.keys(b.step.params).length - Object.keys(a.step.params).length);
  return matching[0]?.index ?? Math.max(0, firstMissingLabStep(flow, record));
}

export function labStepTrials(flow: LabFlow, record: LabTaskRecord): (LabTrial | undefined)[] {
  const used = new Set<number>();
  // Match constrained steps first; free exploration must have its own record.
  const matches: (LabTrial | undefined)[] = Array.from({ length: flow.steps.length });
  const ordered = flow.steps.map((step, index) => ({ step, index })).sort((a, b) => Object.keys(b.step.params).length - Object.keys(a.step.params).length);
  for (const { step, index } of ordered) {
    const found = record.trials.findLastIndex((trial, i) => !used.has(i) && hasLabStepEvidence(step, trial));
    if (found >= 0) { matches[index] = record.trials[found]; used.add(found); }
  }
  return matches;
}

export function firstMissingLabStep(flow: LabFlow, record: LabTaskRecord): number {
  return labStepTrials(flow, record).findIndex((trial) => !trial);
}

export function labMissingWork(id: string, record: LabTaskRecord): string[] {
  if (id === "L1-4") return ecgComplete(record) ? [] : ["continueComparisons"];
  if (id === "L1-3") return diagnosisComplete(record) ? [] : ["continueComparisons"];
  if (id === "L1-2" && (!record.completion.confirmed || record.trials.some((trial) => readBlackBoxTrial(trial)))) return blackBoxComplete(record) ? [] : ["continueComparisons"];
  const flow = LAB_FLOWS[id], missing: string[] = [];
  if (!record.prediction.trim()) missing.push("enterPrediction");
  if (firstMissingLabStep(flow, record) >= 0) missing.push("continueComparisons");
  if (!record.analysis.trim()) missing.push("conclusionMissing");
  if (flow.derivation && !record.derivation.trim()) missing.push("derivationMissing");
  return missing;
}

export function labTaskComplete(id: string, record: LabTaskRecord): boolean {
  return record.completion.confirmed && labMissingWork(id, record).length === 0;
}
