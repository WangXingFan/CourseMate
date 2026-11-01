// Independent symbolic answers for browser flows; numerical tests cover the engine.
export function labAnswers(id, p) {
  if (id === "L3-1") {
    const start = p.mode === "delayed" ? p.start : p.mode === "step" ? p.T : 0;
    return { coefficient: String(p.A), denShift: String(p.mode === "exp" ? p.a : 0), delay1: String(start), delay2: ["exp", "step"].includes(p.mode) ? "" : String(start + p.T) };
  }
  if (id === "L3-2") return { hShift: "1", xGain: "1", C: "1", D: "-1" };
  if (id === "L3-3") return { initialTerm: String(p.initial), C: "1", D: String(Number(p.initial) - 1) };
  return {};
}
