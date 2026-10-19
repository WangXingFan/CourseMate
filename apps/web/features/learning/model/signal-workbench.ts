export const SIGNAL_KINDS = ["step", "impulse", "rectangle", "exponential", "sine"] as const;
export const SIGNAL_OPERATIONS = ["a", "b", "add", "subtract", "multiply", "convolve"] as const;
export type SignalKind = typeof SIGNAL_KINDS[number];
export type SignalOperation = typeof SIGNAL_OPERATIONS[number];
export type SignalPoint = readonly [number, number];
export type SignalSource = {
  kind: SignalKind;
  amplitude: number;
  shift: number;
  scale: number;
  reversed: boolean;
  width: number;
  decay: number;
  frequency: number;
};
export const SAMPLE_DT = 0.025;
export const SAMPLE_MIN = -8;
export const SAMPLE_MAX = 8;
export const DEFAULT_SOURCE: SignalSource = { kind: "rectangle", amplitude: 1, shift: 0, scale: 1, reversed: false, width: 2, decay: 1, frequency: 1 };

export function validateSource(source: SignalSource): void {
  const limits: [number, number, number][] = [[source.amplitude, -3, 3], [source.shift, -4, 4], [source.scale, 0.1, 4], [source.width, 0.05, 4], [source.decay, 0.1, 3], [source.frequency, 0.1, 3]];
  if (!SIGNAL_KINDS.some((kind) => kind === source.kind) || limits.some(([value, min, max]) => !Number.isFinite(value) || value < min || value > max)) throw new RangeError("Invalid signal parameters");
}

function baseValue(source: SignalSource, time: number): number {
  // Snap floating point noise at discontinuities; pulses use a half-open interval.
  const t = Math.round(time * 1e10) / 1e10;
  switch (source.kind) {
    case "step": return t >= 0 ? source.amplitude : 0;
    case "impulse": return t >= -source.width / 2 && t < source.width / 2 ? source.amplitude / source.width : 0;
    case "rectangle": return t >= -source.width / 2 && t < source.width / 2 ? source.amplitude : 0;
    case "exponential": return t >= 0 ? source.amplitude * Math.exp(-source.decay * t) : 0;
    case "sine": return source.amplitude * Math.sin(2 * Math.PI * source.frequency * t);
  }
}

export function signalValue(source: SignalSource, time: number): number {
  validateSource(source);
  if (!Number.isFinite(time)) throw new RangeError("Invalid sample time");
  return baseValue(source, (source.reversed ? -1 : 1) * (time - source.shift) / source.scale);
}

export function sampleSignal(source: SignalSource): SignalPoint[] {
  validateSource(source);
  return Array.from({ length: Math.round((SAMPLE_MAX - SAMPLE_MIN) / SAMPLE_DT) + 1 }, (_, index) => {
    const time = SAMPLE_MIN + index * SAMPLE_DT;
    return [time, baseValue(source, (source.reversed ? -1 : 1) * (time - source.shift) / source.scale)];
  });
}

export function combineSignals(a: readonly SignalPoint[], b: readonly SignalPoint[], operation: SignalOperation): SignalPoint[] {
  if (!a.length || a.length !== b.length || a.some(([t, y], i) => !Number.isFinite(t) || !Number.isFinite(y) || !Number.isFinite(b[i][0]) || !Number.isFinite(b[i][1]) || Math.abs(t - b[i][0]) > 1e-9 || (i > 0 && Math.abs(t - a[i - 1][0] - SAMPLE_DT) > 1e-9))) throw new RangeError("Invalid sampling grid");
  if (operation === "a") return a.map(([t, y]) => [t, y]);
  if (operation === "b") return b.map(([t, y]) => [t, y]);
  if (operation === "convolve") {
    const values = new Array<number>(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++) {
      if (a[i][1] === 0) continue;
      for (let j = 0; j < b.length; j++) values[i + j] += a[i][1] * b[j][1] * SAMPLE_DT;
    }
    return values.map((y, index) => [a[0][0] + b[0][0] + index * SAMPLE_DT, y]);
  }
  return a.map(([t, y], i) => [t, operation === "add" ? y + b[i][1] : operation === "subtract" ? y - b[i][1] : y * b[i][1]]);
}

export function signalYDomain(series: readonly (readonly SignalPoint[])[]): readonly [number, number] {
  let low = 0, high = 0;
  for (const points of series) for (const [, value] of points) {
    if (Number.isFinite(value)) { low = Math.min(low, value); high = Math.max(high, value); }
  }
  const padding = Math.max((high - low) * 0.12, 0.2);
  return [low - padding, high + padding];
}
