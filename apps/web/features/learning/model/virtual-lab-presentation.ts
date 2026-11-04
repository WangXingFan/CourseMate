import type { LabParameters, LabPlot, VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";

// These are the givens, never solved responses or a student's current settings.
export const LAB_PREDICTION_FORMULAS: Record<string, string[]> = {
  "L1-1": [String.raw`f(t)\;\longrightarrow\;f(t-1)`],
  "L1-2": [String.raw`x+1,\quad x(2t),\quad x(t-1),\quad \int_{-\infty}^t x(\tau)d\tau,\quad x^2`],
  "L1-3": [String.raw`y'+y=x(t),\quad y(0^-)=2`, `x(t)=u(t)`],
  "L1-4": [String.raw`r(t)=u(t)-u(t-1),\quad y(t)=(r*r)(t)`, String.raw`x(t)=x_{ECG}(t)+0.2\sin(2\pi50t),\quad h_W(t)=\frac{u(t)-u(t-W)}{W}`],
  "L2-1": [String.raw`f_0=10\,\mathrm{Hz},\quad K=3,7,15`],
  "L2-2": [String.raw`x(t)=u(t+T/2)-u(t-T/2),\quad T=0.5,2\,\mathrm{s}`],
  "L2-3": [String.raw`x(t)=x_{ECG}(t)+0.2\sin(2\pi50t)`, String.raw`H(s)=\frac{s^2+\omega_0^2}{(s+\alpha)^2+\omega_0^2},\quad R(10)\ge0.95,\ R(50)\le0.05`],
  "L2-4": [String.raw`x(t)=\cos(2\pi10t),\quad f_s=100,15\,\mathrm{Hz}`],
  "L3-1": [`x(t)=u(t-1)`],
  "L3-2": [String.raw`y'+y=u(t),\quad y(0^-)=0`],
  "L3-3": [String.raw`H(s)=\frac{s^2+\omega_0^2}{(s+\alpha)^2+\omega_0^2},\quad \omega_0=2\pi f_0`],
  "L3-4": [String.raw`y'+y=x(t),\quad y(0^-)=0`, `x(t)=u(t)-u(t-T)`],
};

export function labPredictionPlot(engine: VirtualLabEngine, id: string, current?: LabParameters): LabPlot | null {
  if (id === "L1-1" && current?.mode === "impulse") {
    const baseline = engine.scene(id, { ...engine.defaults(id), mode: "impulse", delta: 0.5 }, engine.defaultAnswers(id)).plots[0];
    return { ...baseline, key: "given", marker: undefined };
  }
  if (id === "L1-2" && !current) return null;
  if (id === "L1-2" && current) {
    const sample = (kind: string): [number, number][] => Array.from({ length: 401 }, (_, i) => {
      const time = -1 + i * 0.015;
      return [time, time < 0 ? 0 : kind === "step" ? 1 : kind === "pulse" ? Number(time < 1) : kind === "exp" ? Math.exp(-time) : Math.sin(time)];
    });
    return { key: "given", title: "x(t)", range: [-1, 5], series: current.test === "linearity"
      ? [{ label: "x₁(t)", points: sample(String(current.x1)) }, { label: "x₂(t)", points: sample(String(current.x2)), dash: "7 4" }]
      : [{ label: "x(t)", points: sample(String(current.x1)) }] };
  }
  if (["L1-3", "L3-2"].includes(id)) return {
    key: "given", title: "x(t)", range: [-0.5, 3],
    series: [{ label: "x(t)", points: [[-0.5, 0], [0, 0], [0, current?.enabled === "off" ? 0 : Number(current?.A ?? 1)], [3, current?.enabled === "off" ? 0 : Number(current?.A ?? 1)]] }],
  };
  if (id === "L1-4" && current?.kind !== "ecg") return {
    key: "given", title: "r(t)", range: [-0.5, 2],
    series: [{ label: "r(t)", points: [[-0.5, 0], [0, 0], [0, 1], [1, 1], [1, 0], [2, 0]], fill: true }],
  };
  const params = { ...engine.defaults(id), ...current };
  if (id === "L1-1") Object.assign(params, { mode: "transform", A: 1, a: 1, shift: 0 });
  if (id === "L3-1") { params.mode = "step"; params.T = 1; }
  const plots = engine.scene(id, params, engine.defaultAnswers(id)).plots;
  const source = id === "L1-4" && params.kind === "ecg" ? plots.find((plot) => plot.key === "output") ?? plots[0] : plots[0];
  const labels: Record<string, string> = {
    "L1-1": "原信号 f(t)", "L1-4": "含工频心电", "L2-1": "目标方波", "L2-2": "x(t)",
    "L2-3": "含工频心电", "L3-3": "含工频心电", "L2-4": "10 Hz 原信号", "L3-1": "x(t)", "L3-4": "单位矩形输入",
  };
  if (id === "L2-4" && params.mode === "audio") labels[id] = "3 kHz 输入";
  const input = source.series.find((series) => series.label === labels[id]);
  return input ? { ...source, key: "given", title: id === "L1-1" ? "f(t)" : "x(t)", marker: undefined, series: [{ ...input, label: id === "L1-1" ? "f(t)" : "x(t)", dash: undefined }] } : null;
}

export function labObservationPlotKey(id: string, stepKey: string): string {
  if (id === "L2-2") return stepKey === "shift" ? "phase" : "magnitude";
  if (id === "L1-4") return stepKey.startsWith("response") ? "output" : "overlap";
  if (id === "L3-3" && stepKey === "frequency") return "frequency";
  return "main";
}

export function labAnswerFormulas(id: string, params: LabParameters): string[] {
  if (id === "L3-1") return [params.mode === "pulse" || params.mode === "delayed"
    ? String.raw`X(s)=\frac{c(e^{-d_1s}-e^{-d_2s})}{s+b}`
    : String.raw`X(s)=\frac{c\,e^{-d_1s}}{s+b}`];
  if (id === "L1-2") return [String.raw`x_1,\ x_2,\ \alpha,\ \beta\quad\text{or}\quad x,\ d`];
  if (id === "L2-3") return [String.raw`n_{\min}=?`];
  if (id === "L3-2") return [String.raw`H(s)=\frac{1}{s+a_H},\quad X(s)=\frac{b_X}{s}`, String.raw`(s+1)Y=X+b_0,\quad Y(s)=\frac{C}{s}+\frac{D}{s+1}`];
  if (id === "L3-3") return [String.raw`z_{1,2}=\pm j2\pi f_0,\quad p_{1,2}=-\alpha\pm j2\pi f_0`];
  return [];
}

export function labObservationFormulas(id: string, p: LabParameters): string[] {
  const signals: Record<string, string> = { step: "u(t)", pulse: "u(t)-u(t-1)", exp: "e^{-t}u(t)", sin: String.raw`\sin(t)u(t)` };
  if (id === "L1-1") {
    if (p.mode === "impulse") return [String.raw`q_\Delta(t)=\frac{u(t)-u(t-\Delta)}{\Delta},\quad \Delta=${p.delta}\,\mathrm{s}`];
    const shift = Number(p.shift), scale = Number(p.a);
    const time = shift === 0 ? "t" : `(t${shift > 0 ? "-" : "+"}${Math.abs(shift)})`;
    const argument = `${scale === 1 ? "" : scale === -1 ? "-" : scale}${time}`;
    return [String.raw`y(t)=${p.A === 1 ? "" : p.A}f\!\left(${argument}\right)`];
  }
  if (id === "L1-2") {
    const system = ({ affine: "x(t)+1", square: "x^2(t)", timescale: "x(2t)", delay: "x(t-1)", integrator: String.raw`\int_{-\infty}^t x(\tau)d\tau` })[p.kind];
    return [`T[x](t)=${system}`, p.test === "linearity"
      ? String.raw`x_1=${signals[p.x1]},\quad x_2=${signals[p.x2]},\quad \alpha=${p.alpha},\;\beta=${p.beta}`
      : String.raw`x(t)=${signals[p.x1]},\quad d=${p.delay}\,\mathrm{s}`,
    p.test === "linearity" ? String.raw`\begin{aligned}A&=T[\alpha x_1+\beta x_2]\\B&=\alpha T[x_1]+\beta T[x_2]\end{aligned}`
      : String.raw`\begin{aligned}A&=T[x(t-d)]\\B&=(T[x])(t-d)\end{aligned}`];
  }
  if (id === "L1-3") return [String.raw`y'+y=${p.enabled === "on" ? `${p.A}u(t)` : "0"},\quad y(0^-)=${p.initial}`];
  if (id === "L1-4") return [p.kind === "rr" ? `r(t)=u(t)-u(t-1)` : String.raw`x(t)=x_{ECG}(t)+0.2\sin(2\pi50t)`, p.kind === "rr"
    ? `y(t)=(r*r)(t)` : String.raw`h_W(t)=\frac{u(t)-u(t-W)}{W},\quad y(t)=(x_{ECG+50Hz}*h_W)(t),\quad W=${p.width}\,\mathrm{s}`];
  if (id === "L2-2") return [`x(t)=A[u(t-t_0+T/2)-u(t-t_0-T/2)]`, String.raw`A=${p.A},\quad T=${p.T}\,\mathrm{s},\quad t_0=${p.center}\,\mathrm{s}`];
  if (id === "L2-3") return [String.raw`R(f)=\frac{A_{\mathrm{out}}(f)}{A_{\mathrm{in}}(f)}`, String.raw`R(10)\ge0.95,\quad R(50)\le0.05`, p.filterType === "lowpass" ? String.raw`H(s)=\frac{2\pi f_c}{s+2\pi f_c},\quad f_c=${p.fc}\,\mathrm{Hz}` : String.raw`H(s)=\frac{s^2+(2\pi f_0)^2}{(s+\alpha)^2+(2\pi f_0)^2},\quad f_0=${p.center},\quad\alpha=${p.alpha}`];
  if (id === "L2-4" && p.mode === "audio") return [String.raw`f_0=3000\,\mathrm{Hz},\quad f_s=4000\,\mathrm{Hz}`];
  if (id === "L3-1") {
    const begin = p.mode === "delayed" ? Number(p.start) : p.mode === "step" ? Number(p.T) : 0;
    return [p.mode === "exp" ? `x(t)=${p.A}e^{-${p.a}t}u(t)` : p.mode === "step"
      ? `x(t)=${p.A}u(t-${begin})`
      : `x(t)=${p.A}[u(t-${begin})-u(t-${begin + Number(p.T)})]`];
  }
  if (id === "L3-2") return [String.raw`y'+y=u(t),\quad y(0^-)=${p.initial}`];
  if (id === "L3-3") return [...LAB_PREDICTION_FORMULAS[id], String.raw`f_0=${p.center}\,\mathrm{Hz},\quad\alpha=${p.alpha}\,\mathrm{s}^{-1}`];
  if (id === "L3-4") return [String.raw`y'+y=u(t)-u(t-${p.T}),\quad y(0^-)=0`];
  return [];
}
