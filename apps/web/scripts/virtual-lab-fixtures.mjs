// Independent symbolic answers for browser flows; numerical tests cover the engine.
export function labAnswers(id, p) {
  if (id === "L1-2") return { evidence: p.test === "linearity" ? `x1=${p.x1}; x2=${p.x2}; alpha=${p.alpha}; beta=${p.beta}` : `x1=${p.x1}; delay=${p.delay}` };
  if (id === "L2-3") return { minOrder: p.filterType === "lowpass" ? "" : "2" };
  if (id === "L3-1") {
    const start = p.mode === "delayed" ? p.start : p.mode === "step" ? p.T : 0;
    return { coefficient: String(p.A), denShift: String(p.mode === "exp" ? p.a : 0), delay1: String(start), delay2: ["exp", "step"].includes(p.mode) ? "" : String(start + p.T) };
  }
  if (id === "L3-2") return { hShift: "1", xGain: "1", C: "1", D: String(Number(p.initial) - 1), b0: String(p.initial) };
  if (id === "L3-3") return { zeroFrequency: String(p.center), poleReal: String(-p.alpha), poleFrequency: String(p.center) };
  return {};
}
