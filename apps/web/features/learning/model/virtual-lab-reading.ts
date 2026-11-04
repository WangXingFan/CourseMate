export function labReadingUnit(reading: string): "s" | "Hz" | "rad" | "" {
  if (["peakTime", "supportEnd", "supportStart", "measureTime", "t90"].includes(reading)) return "s";
  if (["firstZero", "aliasFrequency"].includes(reading)) return "Hz";
  if (reading === "phaseAtQuarter") return "rad";
  return "";
}

// Accept a complete number with an optional matching unit; never silently drop
// trailing text or interpret a frequency as a time.
export function parseLabReading(text: string, reading: string): number | null {
  const match = text.trim().replaceAll("−", "-").match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*([^\d\s]*)$/i);
  if (!match) return null;
  const suffix = match[2].toLowerCase();
  const unit = labReadingUnit(reading);
  const scales: Record<string, Record<string, number>> = {
    s: { s: 1, sec: 1, 秒: 1, ms: 0.001, 毫秒: 0.001 },
    Hz: { hz: 1, 赫兹: 1, khz: 1000, 千赫兹: 1000 },
    rad: { rad: 1, 弧度: 1 },
  };
  const scale = suffix ? scales[unit]?.[suffix] : 1;
  if (scale === undefined) return null;
  const value = Number(match[1]) * scale;
  return Number.isFinite(value) && Math.abs(value) <= 1e9 ? value : null;
}
