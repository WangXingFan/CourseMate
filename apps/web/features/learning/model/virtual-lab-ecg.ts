import { ecgValue, movingAverage } from "../../../public/vendor/signal-lab/phase-three.mjs";
import type { LabPlot, LabScene, LabTaskRecord, LabTrial, VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";

export const ECG_STATIONS = ["noise", "shape", "timing"] as const;
export type EcgStation = typeof ECG_STATIONS[number];
export const ECG_EXERCISES = {
  noise: { widths: [10, 20], options: ["flat", "stronger", "unchanged"], answer: "flat" },
  shape: { widths: [20, 80], options: ["short", "long", "equal"], answer: "short" },
  timing: { widths: [20, 80], options: ["before", "at", "after"], answer: "before" },
} as const;
export type EcgObservation = { station: EcgStation; widths: number[]; width: number; startTime: number; time: number; answer: string };

// Steady-state isolated interference: the plotted interval is after the window
// has filled, so full-period cancellation does not include a startup transient.
export function averagedInterference(time: number, widthMs: number) {
  const width = widthMs / 1000, angle = Math.PI * 50 * width;
  return 0.2 * Math.sin(angle) / angle * Math.sin(2 * Math.PI * 50 * (time - width / 2));
}

export function ecgWindow(timeMs: number, widthMs: number) {
  return { start: timeMs - widthMs, center: timeMs - widthMs / 2, end: timeMs, lag: widthMs / 2 };
}

export function ecgPlots(station: EcgStation, widthMs: number): LabPlot[] {
  const noise = station === "noise", range: [number, number] = noise ? [200, 300] : [280, 560];
  const points = (fn: (time: number) => number): [number, number][] => Array.from({ length: 481 }, (_, index) => {
    const ms = range[0] + (range[1] - range[0]) * index / 480;
    return [ms, fn(ms / 1000)];
  });
  const reference = { label: noise ? "零线" : "洁净心电", color: "var(--chart-1)", dash: "7 4", width: 2.5, points: points((time) => noise ? 0 : ecgValue(time, false)) };
  return [
    { key: "ecg-input", title: noise ? "单独观察 50 Hz 干扰" : "处理前", range, xUnit: "ms", xLabel: "t / ms", series: [reference,
      { label: noise ? "50 Hz 干扰" : "含干扰心电", color: "var(--chart-2)", points: points((time) => noise ? 0.2 * Math.sin(2 * Math.PI * 50 * time) : ecgValue(time)) }] },
    { key: "ecg-output", title: "平均后", range, xUnit: "ms", xLabel: "t / ms", series: [reference,
      { label: "平均输出", color: "var(--chart-2)", points: points((time) => noise ? averagedInterference(time, widthMs) : movingAverage(time, widthMs / 1000)) }] },
  ];
}

export function ecgObservationPassed(value: EcgObservation) {
  const exercise = ECG_EXERCISES[value.station];
  return exercise.widths.every((width) => value.widths.includes(width)) && value.answer === exercise.answer
    && (value.station !== "timing" || Math.abs(value.time - value.startTime) >= 10);
}

export function ecgObservationScene(engine: VirtualLabEngine, value: EcgObservation): LabScene {
  const base = engine.scene("L1-4", { ...engine.defaults("L1-4"), kind: "ecg", width: value.width / 1000, time: value.time / 1000 }, {});
  return { ...base, plots: ecgPlots(value.station, value.width), readings: { ...base.readings,
    ecgObservation: { version: 1, ...value, widths: [...value.widths] } } };
}

export function readEcgObservation(trial?: LabTrial): EcgObservation | null {
  const value = trial?.measurements.ecgObservation;
  if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== 1) return null;
  const station = ECG_STATIONS.find((station) => station === value.station);
  if (!station || !Array.isArray(value.widths) || !value.widths.every((width): width is number => typeof width === "number" && ECG_EXERCISES[station].widths.some((allowed) => allowed === width))) return null;
  if (typeof value.width !== "number" || !ECG_EXERCISES[station].widths.some((width) => width === value.width)
    || typeof value.time !== "number" || !Number.isFinite(value.time) || value.time < 380 || value.time > 520
    || typeof value.startTime !== "number" || value.startTime !== 400 || typeof value.answer !== "string"
    || !ECG_EXERCISES[station].options.some((option) => option === value.answer)
    || trial?.params.kind !== "ecg" || trial.params.width !== value.width / 1000 || trial.params.time !== value.time / 1000) return null;
  return { station, widths: value.widths, width: value.width, startTime: value.startTime, time: value.time, answer: value.answer };
}

export function ecgStationPassed(record: LabTaskRecord, station: EcgStation) {
  return record.trials.some((trial) => { const value = readEcgObservation(trial); return value?.station === station && ecgObservationPassed(value); });
}

export function ecgComplete(record: LabTaskRecord) { return ECG_STATIONS.every((station) => ecgStationPassed(record, station)); }
