import type { LabParameters, LabPlot, VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";

// These are the givens, never solved responses or a student's current settings.
export const LAB_PREDICTION_FORMULAS: Record<string, string[]> = {
  "L1-1": [String.raw`p(t)\;\longrightarrow\;p(t-1)`],
  "L1-2": [String.raw`S_1[x]=2x,\quad S_2[x]=x^2,\quad S_3[x]=t\,x`],
  "L1-3": [String.raw`y'+y=x(t),\quad y(0^-)=2`, `x(t)=u(t)`],
  "L1-4": [String.raw`r(t)=u(t)-u(t-1),\quad y(t)=(r*r)(t)`],
  "L2-1": [String.raw`f_0=10\,\mathrm{Hz},\quad K=1,3,7,15`],
  "L2-2": [String.raw`x(t)=u(t+T/2)-u(t-T/2),\quad T:1\to0.5\,\mathrm{s}`],
  "L2-3": [String.raw`x(t)=\sin(2\pi100t)+0.3\sin(2\pi1000t)`, String.raw`\tau y'+y=x,\quad \tau=1/(2\pi f_c),\quad y(0^-)=0`],
  "L2-4": [String.raw`x(t)=\cos(2\pi10t),\quad f_s=100,25,15\,\mathrm{Hz}`],
  "L3-1": [`x(t)=u(t-1)`],
  "L3-2": [String.raw`y'+y=u(t),\quad y(0^-)=0`],
  "L3-3": [String.raw`y'+y=u(t),\quad y(0^-)=0,\;0.5,\;2`],
  "L3-4": [String.raw`y'+y=x(t),\quad y(0^-)=0`, `x(t)=u(t)-u(t-T)`],
};

export function labPredictionPlot(engine: VirtualLabEngine, id: string): LabPlot | null {
  if (id === "L1-2") return null;
  if (["L1-3", "L3-2", "L3-3"].includes(id)) return {
    key: "given", title: "x(t)", range: [-0.5, 3],
    series: [{ label: "x(t) = u(t)", points: [[-0.5, 0], [0, 0], [0, 1], [3, 1]] }],
  };
  if (id === "L1-4") return {
    key: "given", title: "r(t)", range: [-0.5, 2],
    series: [{ label: "r(t)", points: [[-0.5, 0], [0, 0], [0, 1], [1, 1], [1, 0], [2, 0]], fill: true }],
  };
  const params = engine.defaults(id);
  if (id === "L3-1") { params.mode = "step"; params.T = 1; }
  const source = engine.scene(id, params, engine.defaultAnswers(id)).plots[0];
  const labels: Record<string, string> = {
    "L1-1": "原信号 p(t)", "L2-1": "目标方波", "L2-2": "x(t)",
    "L2-3": "双频输入", "L2-4": "10 Hz 原信号", "L3-1": "x(t)", "L3-4": "单位矩形输入",
  };
  const input = source.series.find((series) => series.label === labels[id]);
  return input ? { ...source, key: "given", title: id === "L1-1" ? "p(t)" : "x(t)", marker: undefined, series: [{ ...input, label: id === "L1-1" ? "p(t)" : "x(t)", dash: undefined }] } : null;
}

export function labObservationPlotKey(id: string, stepKey: string): string {
  if (id === "L2-2") return stepKey === "shift" ? "phase" : "magnitude";
  if (id === "L1-4") return stepKey.startsWith("response") ? "output" : "overlap";
  return "main";
}

export function labAnswerFormulas(id: string, params: LabParameters): string[] {
  if (id === "L3-1") return [params.mode === "pulse" || params.mode === "delayed"
    ? String.raw`X(s)=\frac{c(e^{-d_1s}-e^{-d_2s})}{s+b}`
    : String.raw`X(s)=\frac{c\,e^{-d_1s}}{s+b}`];
  if (id === "L3-2") return [String.raw`H(s)=\frac{1}{s+a_H},\quad X(s)=\frac{b_X}{s}`, String.raw`Y(s)=\frac{C}{s}+\frac{D}{s+1}`];
  if (id === "L3-3") return [`(s+1)Y(s)=X(s)+b_0`, `y(t)=C+D e^{-t}`];
  return [];
}

export function labObservationFormulas(id: string, p: LabParameters): string[] {
  const signals: Record<string, string> = { constant: "1", sin: String.raw`\sin t`, cos: String.raw`\cos(2t)` };
  if (id === "L1-1") {
    if (p.mode === "impulse") return [String.raw`q_\Delta(t)=\frac{u(t)-u(t-\Delta)}{\Delta},\quad \Delta=${p.delta}\,\mathrm{s}`];
    const shift = Number(p.shift), scale = Number(p.a);
    const time = shift === 0 ? "t" : `(t${shift > 0 ? "-" : "+"}${Math.abs(shift)})`;
    const argument = `${scale === 1 ? "" : scale === -1 ? "-" : scale}${time}`;
    return [String.raw`y(t)=${p.A === 1 ? "" : p.A}p\!\left(${argument}\right)`];
  }
  if (id === "L1-2") {
    const system = p.kind === "gain" ? "2x(t)" : p.kind === "square" ? "x^2(t)" : "t x(t)";
    return [`T[x](t)=${system}`, p.test === "linearity"
      ? String.raw`x_1=${signals[p.x1]},\quad x_2=${signals[p.x2]},\quad \alpha=${p.alpha},\;\beta=${p.beta}`
      : String.raw`x(t)=${signals[p.x1]},\quad d=${p.delay}\,\mathrm{s}`,
    p.test === "linearity" ? String.raw`\begin{aligned}A&=T[\alpha x_1+\beta x_2]\\B&=\alpha T[x_1]+\beta T[x_2]\end{aligned}`
      : String.raw`\begin{aligned}A&=T[x(t-d)]\\B&=(T[x])(t-d)\end{aligned}`];
  }
  if (id === "L1-3") return [String.raw`y'+y=${p.enabled === "on" ? `${p.A}u(t)` : "0"},\quad y(0^-)=${p.initial}`];
  if (id === "L1-4") return [`r(t)=u(t)-u(t-1)`, p.kind === "rr"
    ? `y(t)=(r*r)(t)` : String.raw`h(t)=e^{-t}u(t),\quad y(t)=(r*h)(t)`];
  if (id === "L2-2") return [`x(t)=A[u(t-t_0+T/2)-u(t-t_0-T/2)]`, String.raw`A=${p.A},\quad T=${p.T}\,\mathrm{s},\quad t_0=${p.center}\,\mathrm{s}`];
  if (id === "L2-3") return [String.raw`R(f)=\frac{A_{\mathrm{out}}(f)}{A_{\mathrm{in}}(f)}`, String.raw`R(100)\ge0.85,\quad R(1000)\le0.25`];
  if (id === "L3-1") {
    const begin = p.mode === "delayed" ? Number(p.start) : p.mode === "step" ? Number(p.T) : 0;
    return [p.mode === "exp" ? `x(t)=${p.A}e^{-${p.a}t}u(t)` : p.mode === "step"
      ? `x(t)=${p.A}u(t-${begin})`
      : `x(t)=${p.A}[u(t-${begin})-u(t-${begin + Number(p.T)})]`];
  }
  if (id === "L3-2") return LAB_PREDICTION_FORMULAS[id];
  if (id === "L3-3") return [String.raw`y'+y=u(t),\quad y(0^-)=${p.initial}`];
  if (id === "L3-4") return [String.raw`y'+y=u(t)-u(t-${p.T}),\quad y(0^-)=0`];
  return [];
}
