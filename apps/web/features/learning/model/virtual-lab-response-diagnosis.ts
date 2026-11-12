import type { LabPlot, LabScene, LabTaskRecord, LabTrial, VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";

export const RESPONSE_SOURCES = ["initial", "input", "both", "neither"] as const;
export const RESPONSE_TESTS = ["inputOff", "resetInitial", "clearBoth", "repeat"] as const;
export const RESPONSE_PREDICTIONS = ["overlap", "different"] as const;
export type ResponseSetup = { initial: number; amplitude: number };
export type DiagnosisCase = ResponseSetup & { target: "initial" | "input" };
export type ResponseTest = typeof RESPONSE_TESTS[number];
export type DiagnosisAnswers = { source: string; test: string; prediction: string };
export const RESPONSE_BASELINE: ResponseSetup = { initial: 2, amplitude: 1 };
const initialValues = [0.5, 1, 1.5, 2.5];
const amplitudeValues = [0.5, 1.5, 2];

export function responseValue(setup: ResponseSetup, time: number) {
  return setup.amplitude + (setup.initial - setup.amplitude) * Math.exp(-time);
}

export function responsePoints(setup: ResponseSetup) {
  return Array.from({ length: 161 }, (_, index) => ({ x: index / 20, y: responseValue(setup, index / 20) }));
}

export function responseSetupFromPoints(points: { x: number; y: number }[]): ResponseSetup | null {
  const first = points[0], last = points.at(-1);
  if (!first || !last || first.x !== 0 || last.x <= 0) return null;
  const decay = Math.exp(-last.x);
  return { initial: first.y, amplitude: (last.y - first.y * decay) / (1 - decay) };
}

export function applyResponseTest(setup: ResponseSetup, test: string): ResponseSetup {
  if (test === "inputOff") return { ...setup, amplitude: 0 };
  if (test === "resetInitial") return { ...setup, initial: 0 };
  if (test === "clearBoth") return { amplitude: 0, initial: 0 };
  return setup;
}

export function expectedDiagnosis(item: DiagnosisCase) {
  const initialChanged = item.initial !== RESPONSE_BASELINE.initial;
  const inputChanged = item.amplitude !== RESPONSE_BASELINE.amplitude;
  return {
    source: initialChanged ? inputChanged ? "both" : "initial" : inputChanged ? "input" : "neither",
    test: item.target === "initial" ? "inputOff" : "resetInitial",
    prediction: (item.target === "initial" ? initialChanged : inputChanged) ? "different" : "overlap",
  };
}

export function checkDiagnosis(item: DiagnosisCase, answers: DiagnosisAnswers) {
  const expected = expectedDiagnosis(item);
  const source = answers.source === expected.source, test = answers.test === expected.test, prediction = answers.prediction === expected.prediction;
  return { source, test, prediction, passed: source && test && prediction };
}

export function diagnosisAssignment(cases: DiagnosisCase[]) { return JSON.stringify(cases); }

export function createDiagnosisCases(record: LabTaskRecord, random = Math.random): DiagnosisCase[] {
  const saved = record.trials.map(readDiagnosisTrial).findLast((trial) => trial !== null);
  if (saved) return saved.cases;
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  return Array.from({ length: 3 }, () => {
    // Independent cases can repeat; the last answer cannot be deduced by elimination.
    const source = pick(RESPONSE_SOURCES);
    return { initial: source === "initial" || source === "both" ? pick(initialValues) : 2,
      amplitude: source === "input" || source === "both" ? pick(amplitudeValues) : 1,
      target: pick(["initial", "input"] as const) };
  });
}

export function diagnosisPlot(item: ResponseSetup, test?: string): LabPlot {
  const setups = [RESPONSE_BASELINE, item].map((setup) => test ? applyResponseTest(setup, test) : setup);
  return { key: test ? "response-verification" : "response-comparison", title: "y(t)", range: [0, 8],
    series: setups.map((setup, index) => ({ label: index === 0 ? "调整前" : "调整后", color: `var(--chart-${index + 1})`,
      dash: index === 0 ? "7 4" : undefined, width: index === 0 ? 4 : 2.25, points: responsePoints(setup).map(({ x, y }) => [x, y]) })) };
}

export function diagnosisScene(engine: VirtualLabEngine, cases: DiagnosisCase[], caseIndex: number, answers: DiagnosisAnswers): LabScene {
  const item = cases[caseIndex];
  const base = engine.scene("L1-3", { ...engine.defaults("L1-3"), enabled: "on", initial: item.initial, A: item.amplitude }, {});
  return { ...base, plots: [diagnosisPlot(item), ...(checkDiagnosis(item, answers).test ? [diagnosisPlot(item, answers.test)] : [])],
    readings: { ...base.readings, responseDiagnosis: { version: 1, cases: cases.map((item) => ({ ...item })), caseIndex, ...answers } } };
}

export function readDiagnosisTrial(trial?: LabTrial) {
  const value = trial?.measurements.responseDiagnosis;
  if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== 1 || !Array.isArray(value.cases) || value.cases.length !== 3) return null;
  const cases: DiagnosisCase[] = [];
  for (const item of value.cases) {
    if (!item || typeof item !== "object" || Array.isArray(item) || typeof item.initial !== "number" || typeof item.amplitude !== "number"
      || ![2, ...initialValues].includes(item.initial) || ![1, ...amplitudeValues].includes(item.amplitude) || item.target !== "initial" && item.target !== "input") return null;
    cases.push({ initial: item.initial, amplitude: item.amplitude, target: item.target });
  }
  if (typeof value.caseIndex !== "number" || !Number.isInteger(value.caseIndex) || value.caseIndex < 0 || value.caseIndex >= cases.length) return null;
  const item = cases[value.caseIndex];
  const source = RESPONSE_SOURCES.find((source) => source === value.source), test = RESPONSE_TESTS.find((test) => test === value.test), prediction = RESPONSE_PREDICTIONS.find((prediction) => prediction === value.prediction);
  if (!source || !test || !prediction || trial?.params.initial !== item.initial || trial.params.A !== item.amplitude || trial.params.enabled !== "on") return null;
  const answers = { source, test, prediction };
  return { cases, caseIndex: value.caseIndex, item, answers, result: checkDiagnosis(item, answers) };
}

export function diagnosisCasePassed(record: LabTaskRecord, cases: DiagnosisCase[], index: number) {
  return record.trials.some((trial) => {
    const saved = readDiagnosisTrial(trial);
    return saved?.caseIndex === index && diagnosisAssignment(saved.cases) === diagnosisAssignment(cases) && saved.result.passed;
  });
}

export function diagnosisComplete(record: LabTaskRecord) {
  const last = record.trials.map(readDiagnosisTrial).findLast((trial) => trial !== null);
  return !!last && last.cases.every((_, index) => diagnosisCasePassed(record, last.cases, index));
}
