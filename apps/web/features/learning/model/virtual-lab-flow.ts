import type { LabMeasurement, LabParameters, LabTaskRecord, LabTrial } from "@/public/vendor/signal-lab/core.mjs";

export type LabStep = { key: string; params: LabParameters; controls?: string[]; initial?: LabParameters; exclude?: LabParameters[];
  observation?: { reading: string; tolerance: number };
  target?: { reading: string; min?: number; max?: number };
};
export type LabFlow = { steps: LabStep[]; derivation?: boolean };

// Each step is a reproducible comparison. Progress is derived from saved trials,
// so existing account records, JSON imports and reports keep the same schema.
export const LAB_FLOWS: Record<string, LabFlow> = {
  "L1-1": { steps: [
    { key: "original", params: { mode: "transform", A: 1, a: 1, shift: 0 }, observation: { reading: "peakTime", tolerance: 0.05 } },
    { key: "shift", params: { mode: "transform", A: 1, a: 1, shift: 1 }, controls: ["shift"], initial: { shift: 0 }, observation: { reading: "peakTime", tolerance: 0.05 } },
    { key: "reverse", params: { mode: "transform", A: 1, a: -1, shift: 0 }, controls: ["a"], initial: { a: 1 }, observation: { reading: "supportStart", tolerance: 0.05 } },
    { key: "compress", params: { mode: "transform", A: 1, a: 2, shift: 0 }, controls: ["a"], initial: { a: 1 }, observation: { reading: "supportEnd", tolerance: 0.05 } },
    { key: "combine", params: { mode: "transform", A: 2, a: 2, shift: 1 }, controls: ["A", "a", "shift"], initial: { A: 1, a: 1, shift: 0 }, observation: { reading: "peakTime", tolerance: 0.05 } },
    ...[0.5, 0.2, 0.1].map((delta, i) => ({ key: `pulse${i}`, params: { mode: "impulse", delta }, controls: ["delta"], initial: { delta: i === 0 ? 0.2 : 0.5 }, observation: { reading: "height", tolerance: 0.05 } })),
  ] },
  "L1-2": { steps: [
    ...["gain", "square", "varying"].map((kind, i) => ({ key: `linear${i}`, params: { kind, test: "linearity", x1: "constant", x2: "constant", alpha: 1, beta: 1 }, observation: { reading: "maxDifference", tolerance: 0.01 } })),
    ...["gain", "square", "varying"].map((kind, i) => ({ key: `shift${i}`, params: { kind, test: "invariance", x1: "constant", delay: 1 }, observation: { reading: "maxDifference", tolerance: 0.01 } })),
  ] },
  "L1-3": { steps: [
    ...[{ key: "zeroInput", enabled: "off", initial: 2 }, { key: "zeroState", enabled: "on", initial: 0 }, { key: "total", enabled: "on", initial: 2 }, { key: "lower", enabled: "on", initial: 0.5 }].map(({ key, enabled, initial }) => ({ key, params: { enabled, A: 1, initial }, observation: { reading: "atTimes.1.total", tolerance: 0.03 } })),
  ] },
  "L1-4": { steps: [
    ...[-0.5, 0.5, 1, 1.5, 2.5].map((time, i) => ({ key: `overlap${i}`, params: { kind: "rr", time }, observation: { reading: "integral", tolerance: 0.03 } })),
    ...[0.5, 1, 1.5, 2].map((time, i) => ({ key: `response${i}`, params: { kind: "rh", time }, observation: { reading: "integral", tolerance: 0.03 } })),
  ] },
  "L2-1": { steps: [1, 3, 7, 15].map((K, i) => ({ key: `harmonic${i}`, params: { K: String(K) }, observation: { reading: "maximum", tolerance: 0.03 } })) },
  "L2-2": { steps: [
    ...[0.5, 1, 2].map((T, i) => ({ key: `width${i}`, params: { A: 1, T, center: 0 }, observation: { reading: "firstZero", tolerance: 0.03 } })),
    { key: "shift", params: { A: 1, T: 1, center: 1 }, observation: { reading: "phaseAtQuarter", tolerance: 0.03 } },
    { key: "amplitude", params: { A: 2, T: 1, center: 0 }, observation: { reading: "zeroFrequency", tolerance: 0.03 } },
  ] },
  "L2-3": { steps: [100, 200, 500].map((fc, i) => ({ key: `cutoff${i}`, params: { fc }, observation: { reading: "passed", tolerance: 0 } })) },
  "L2-4": { steps: [
    ...[100, 25, 15].map((fs, i) => ({ key: `sample${i}`, params: { fs: String(fs) }, observation: { reading: "aliasing", tolerance: 0 } })),
    { key: "candidate", params: { fs: "15" }, controls: ["candidate"], initial: { candidate: 0 }, target: { reading: "sampleDifference", max: 1e-6 } },
  ] },
  "L3-1": { derivation: true, steps: [
    ...[0.5, 1, 2].map((a, i) => ({ key: `exponential${i}`, params: { mode: "exp", A: 1, a } })),
    { key: "step", params: { mode: "step", A: 1, T: 1 } },
    { key: "pulse", params: { mode: "pulse", A: 1, T: 1 } },
    { key: "delayed", params: { mode: "delayed", A: 3, start: 1, T: 2 } },
  ] },
  "L3-2": { derivation: true, steps: [
    { key: "initial", params: { measureTime: 0 } },
    { key: "one", params: { measureTime: 1 } },
    { key: "ninety", params: {}, controls: ["measureTime"], exclude: [{ measureTime: 0 }, { measureTime: 1 }], target: { reading: "yAtTime", min: 0.898, max: 0.902 } },
  ] },
  "L3-3": { derivation: true, steps: [0, 0.5, 2].map((initial, i) => ({ key: `initial${i}`, params: { initial: String(initial), measureTime: 1 } })) },
  "L3-4": { derivation: true, steps: [
    ...[0.5, 1, 2, 3].map((T, i) => ({ key: `width${i}`, params: { T }, observation: { reading: "peak", tolerance: 0.02 } })),
    { key: "refine", params: {}, controls: ["T"], exclude: [0.5, 1, 2, 3].map((T) => ({ T })), target: { reading: "peak", min: 0.8, max: 0.802 } },
  ] },
};

export function matchesLabStep(step: LabStep, trial: Pick<LabTrial, "params" | "answers">): boolean {
  if (!Object.entries(step.params).every(([key, value]) => trial.params[key] === value)) return false;
  if (step.exclude?.some((params) => Object.entries(params).every(([key, value]) => trial.params[key] === value))) return false;
  return Object.entries(trial.answers).every(([key, value]) => value.trim() || (key === "delay2" && ["exp", "step"].includes(String(trial.params.mode))));
}

export function labReading(measurements: Record<string, LabMeasurement>, path: string): number | null {
  let value: LabMeasurement = measurements;
  for (const part of path.split(".")) {
    if (!value || typeof value !== "object") return null;
    value = Array.isArray(value) ? value[Number(part)] : value[part];
  }
  return typeof value === "boolean" ? Number(value) : typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function validLabObservation(step: LabStep, readings: Record<string, LabMeasurement>, text: string): boolean {
  if (!step.observation) return true;
  const expected = labReading(readings, step.observation.reading), value = Number(text);
  return !!text.trim() && expected !== null && Number.isFinite(value) && Math.abs(value - expected) <= step.observation.tolerance + 1e-9;
}

export function hasLabStepEvidence(step: LabStep, trial: Pick<LabTrial, "params" | "answers" | "measurements">): boolean {
  if (!matchesLabStep(step, trial)) return false;
  const statuses = trial.measurements.answerStatus;
  if (Object.keys(trial.answers).length && (!Array.isArray(statuses) || !statuses.length || statuses.some((status) => !status || typeof status !== "object" || Array.isArray(status) || status.status !== "correct"))) return false;
  if (step.target) {
    if (trial.measurements.exerciseStep !== step.key) return false;
    const value = labReading(trial.measurements, step.target.reading);
    if (value === null || value < (step.target.min ?? -Infinity) || value > (step.target.max ?? Infinity)) return false;
    if (step.key === "candidate" && Number(trial.params.candidate) >= Number(trial.params.fs) / 2) return false;
  }
  if (!step.observation) return true;
  const answer = trial.measurements.observation;
  return !!answer && typeof answer === "object" && !Array.isArray(answer) && answer.step === step.key && typeof answer.value === "number" && validLabObservation(step, trial.measurements, String(answer.value));
}

export function resumeLabStep(flow: LabFlow, record: LabTaskRecord): number {
  const missing = firstMissingLabStep(flow, record), pending = flow.steps[missing];
  if (pending?.initial && Object.entries({ ...pending.params, ...pending.initial }).every(([key, value]) => record.params[key] === value)) return missing;
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
