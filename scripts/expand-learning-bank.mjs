// Authored November 2026 expansion: 80 skills, two base questions per skill,
// and two matched variants per base. Preserve 79 original groups and replace
// the one group outside the published handouts with new IDs.
// Answer verification lives separately in learning-expansion-calculations.mjs.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { questionSources } from "./learning-bank-sources.mjs";

const path = new URL("../backend/internal/domain/learning/content/quick-questions.json", import.meta.url);
const bank = JSON.parse(readFileSync(path, "utf8"));
const original = bank.questions.filter((q) => !q.id.startsWith("ext-"));
assert.equal(original.length, 80);
const additions = [];
const fmt = (n) => String(Number(n.toFixed(6)));
const six = (fn) => Array.from({ length: 6 }, (_, i) => fn(i + 1));
let families = 0;

// The handouts cover characteristic roots, but not the overshoot/damping-ratio
// formulas of the retired "damping" question. Use new IDs for changed meaning.
const replacementID = "second-order-mode-decay";
const replacementItems = [0, 1, 2].map((index) => {
  const a = 2*(index+1), b = a+1, t = 0.25*(index+1);
  const value = Math.exp(-a*t), answer = [1, 0, 3][index];
  const options = [Math.exp(a*t), 1-value, Math.exp(-b*t)].map(fmt);
  options.splice(answer, 0, fmt(value));
  return {
    id: index ? `${replacementID}-v${index}` : replacementID,
    ...(index ? { baseQuestionID: replacementID } : {}), answer,
    zh: { prompt: `非零自由响应对应特征根 −${a}±j${b}。${t} s 后的振幅包络是初始包络的多少倍？（选最接近值。）`, options, explanation: `共轭根产生 e^(−${a}t)(Ccos${b}t+Dsin${b}t)，包络比 e^(−${a}×${t})≈${fmt(value)}。` },
    en: { prompt: `A nonzero natural response has roots −${a}±j${b}. What is its amplitude-envelope ratio after ${t} s relative to the initial envelope? Choose the closest value.`, options, explanation: `The conjugate roots give e^(−${a}t)(Ccos${b}t+Dsin${b}t), with envelope ratio e^(−${a}×${t})≈${fmt(value)}.` },
    check: { kind: "expanded:complex-root-envelope", parameters: [a, b, t], unit: "" },
  };
});
const replacementIndex = original.findIndex((q) => ["damping", replacementID].includes(q.id));
assert.ok(replacementIndex >= 0);
original[replacementIndex] = { ...replacementItems[0], chapterID: "2", topic: "second-order", lesson: "/learn/knowledge?lesson=ss-2-1", misconceptions: Object.fromEntries([0, 2, 3].map((i) => [String(i), `${replacementID}-option-${i}`])), variants: replacementItems.slice(1) };

function add(chapter, topic, lesson, skill, rows, build) {
  assert.equal(rows.length, 6, skill);
  const family = families++;
  for (let group = 0; group < 2; group++) {
    const id = `ext-${skill}-${group + 1}`;
    const items = rows.slice(group * 3, group * 3 + 3).map((parameters, offset) => {
      const { value, wrong, prompt, explanation, unit = "" } = build(...parameters);
      assert.ok(Number.isFinite(value), id);
      const key = fmt(value);
      const distractors = [...new Set(wrong.map(fmt))].filter((v) => v !== key).slice(0, 3);
      assert.equal(distractors.length, 3, `${id}: distinct distractors`);
      const answer = (family + group * 3 + offset) % 4;
      const options = [...distractors];
      options.splice(answer, 0, key);
      const rounded = Math.abs(Number(key) - value) > 1e-10;
      return {
        id: offset === 0 ? id : `${id}-v${offset}`,
        ...(offset === 0 ? {} : { baseQuestionID: id }),
        answer,
        zh: { prompt: prompt[0] + (rounded ? "（选最接近值。）" : ""), options: options.map((o) => o + unit), explanation: `${explanation[0]}代入得 ${key}${unit}。` },
        en: { prompt: prompt[1] + (rounded ? " Choose the closest value." : ""), options: options.map((o) => o + unit), explanation: `${explanation[1]} Substitution gives ${key}${unit}.` },
        check: { kind: `expanded:${skill}`, parameters, unit },
      };
    });
    const [base, ...variants] = items;
    additions.push({ ...base, chapterID: String(chapter), topic, lesson: `/learn/${lesson}`, misconceptions: Object.fromEntries([0, 1, 2, 3].filter((i) => i !== base.answer).map((i) => [String(i), `${id}-option-${i}`])), variants });
  }
}

const basics = "experiments/signal-basics";
add(1, "signal-classification", basics, "dc-sine-power", six((n) => [n, n + 2, n + 1]), (d, a, w) => ({
  value: d*d+a*a/2, wrong: [d+a*a/2, (d+a)**2/2, d*d+a*a, 0],
  prompt: [`连续信号 x(t)=${d}+${a}cos(${w}t) 的平均功率是多少？`, `What is the average power of the continuous signal x(t)=${d}+${a}cos(${w}t)?`],
  explanation: ["常数与余弦的交叉项平均为零，P=D²+A²/2。", "The DC–cosine cross term averages to zero: P=D²+A²/2."],
}));
add(1, "signal-classification", basics, "two-tone-power", six((n) => [n + 1, n + 3, n + 2]), (a, b, f) => ({
  value: (a*a+b*b)/2, wrong: [(a+b)**2/2, a*a+b*b, (a+b)/2, 0],
  prompt: [`x(t)=${a}cos(2π·${f}t)+${b}sin(2π·${2*f}t)，平均功率是多少？`, `What is the average power of x(t)=${a}cos(2π·${f}t)+${b}sin(2π·${2*f}t)?`],
  explanation: ["不同整数次谐波在共同周期内正交，P=(A²+B²)/2。", "Distinct integer harmonics are orthogonal over a common period: P=(A²+B²)/2."],
}));
add(1, "signal-classification", basics, "duty-power", six((n) => [n + 1, n, 3*n + 1]), (a, width, period) => ({
  value: a*a*width/period, wrong: [a*width/period, a*a, a*a*period/width, 0],
  prompt: [`周期矩形脉冲每周期前 ${width} s 为 ${a}，其余为 0，周期 ${period} s。平均功率是多少？`, `A periodic pulse is ${a} for the first ${width} s of each ${period} s period and zero otherwise. What is its average power?`],
  explanation: ["周期功率是一个周期内的平方积分除以周期：P=A²τ/T。", "Average power is the integral of the squared signal over one period divided by T: P=A²τ/T."],
}));
add(1, "signal-classification", basics, "pulse-amplitude", six((n) => [(n + 1)**2*(n + 2), n + 2]), (energy, width) => ({
  value: Math.sqrt(energy/width), wrong: [energy/width, energy, Math.sqrt(energy), 0],
  prompt: [`单个矩形脉冲宽 ${width} s、总能量 ${energy}，幅度 A>0。A 是多少？`, `A single rectangular pulse has width ${width} s, energy ${energy}, and amplitude A>0. What is A?`],
  explanation: ["E=A²T，取正幅度 A=√(E/T)。", "Since E=A²T and A is positive, A=√(E/T)."],
}));
add(1, "signal-classification", basics, "triangle-energy", six((n) => [n + 1, n + 2]), (a, t) => ({
  value: 2*a*a*t/3, wrong: [a*a*t, 2*a*a*t, a*a*t/3, a*t],
  prompt: [`x(t)=${a}(1−|t|/${t})（|t|≤${t}），其余为零。总能量是多少？`, `x(t)=${a}(1−|t|/${t}) for |t|≤${t}, and zero otherwise. What is its energy?`],
  explanation: ["利用偶对称，E=2A²∫₀ᵀ(1−t/T)²dt=2A²T/3。", "By even symmetry, E=2A²∫₀ᵀ(1−t/T)²dt=2A²T/3."],
}));
add(1, "signal-classification", basics, "ramp-energy", six((n) => [n + 1, n + 2]), (k, t) => ({
  value: k*k*t**3/3, wrong: [k*k*t*t/2, k*t*t/2, k*k*t**3, 0],
  prompt: [`x(t)=${k}t（0≤t≤${t}），区间外为零。总能量是多少？`, `x(t)=${k}t for 0≤t≤${t}, and zero elsewhere. What is its energy?`],
  explanation: ["能量积分的是幅度平方：E=∫₀ᵀk²t²dt=k²T³/3。", "Energy integrates squared amplitude: E=∫₀ᵀk²t²dt=k²T³/3."],
}));
add(1, "signal-classification", basics, "bilateral-exp-energy", six((n) => [n + 1, n + 2]), (a, decay) => ({
  value: a*a/decay, wrong: [a*a/(2*decay), 2*a*a/decay, a/decay, 0],
  prompt: [`双边信号 x(t)=${a}e^(−${decay}|t|) 的总能量是多少？`, `What is the energy of the two-sided signal x(t)=${a}e^(−${decay}|t|)?`],
  explanation: ["正负时间各贡献 A²/(2a)，故 E=A²/a。", "Each half-line contributes A²/(2a), so E=A²/a."],
}));
add(1, "signal-classification", basics, "geometric-energy", six((n) => [n + 1, [0.2, 0.25, 0.4, 0.5, 0.6, 0.75][n-1]]), (a, r) => ({
  value: a*a/(1-r*r), wrong: [a*a/(1-r), a/(1-r*r), a*a, 0],
  prompt: [`离散信号 x[n]=${a}·(${r})^n u[n]（u[n]=1 当 n≥0），能量 Σ|x[n]|² 是多少？`, `For x[n]=${a}·(${r})^n u[n], with u[n]=1 for n≥0, what is the discrete energy Σ|x[n]|²?`],
  explanation: ["平方后公比为 r²，等比求和 E=A²/(1−r²)。", "After squaring, the geometric ratio is r²: E=A²/(1−r²)."],
}));
add(1, "signal-classification", basics, "finite-sequence-energy", six((n) => [n, -n-1, n+2]), (a, b, c) => ({
  value: a*a+b*b+c*c, wrong: [a+b+c, (a+b+c)**2, Math.abs(a)+Math.abs(b)+Math.abs(c), 0],
  prompt: [`离散信号仅三个非零样本，值为 ${a}、${b}、${c}。总能量是多少？`, `A discrete signal has only three nonzero samples, with values ${a}, ${b}, ${c}. What is its energy?`],
  explanation: ["离散能量为各样本绝对值平方之和，不是样本和的平方。", "Discrete energy is the sum of squared sample magnitudes, not the square of their sum."],
}));
add(1, "signal-transformation", basics, "even-component", six((n) => [2*n+3, -n-1, n]), (positive, negative, t) => ({
  value: (positive+negative)/2, wrong: [(positive-negative)/2, positive+negative, positive-negative, 0],
  prompt: [`已知 x(${t})=${positive}、x(−${t})=${negative}，偶分量 xₑ(${t}) 是多少？`, `Given x(${t})=${positive} and x(−${t})=${negative}, what is the even component xₑ(${t})?`],
  explanation: ["偶分量定义为 xₑ(t)=[x(t)+x(−t)]/2。", "The even component is xₑ(t)=[x(t)+x(−t)]/2."],
}));
add(1, "signal-transformation", basics, "odd-component", six((n) => [3*n+2, n-2, n+1]), (positive, negative, t) => ({
  value: (positive-negative)/2, wrong: [(positive+negative)/2, positive-negative, negative-positive, 0],
  prompt: [`已知 x(${t})=${positive}、x(−${t})=${negative}，奇分量 xₒ(${t}) 是多少？`, `Given x(${t})=${positive} and x(−${t})=${negative}, what is the odd component xₒ(${t})?`],
  explanation: ["奇分量定义为 xₒ(t)=[x(t)−x(−t)]/2。", "The odd component is xₒ(t)=[x(t)−x(−t)]/2."],
}));
add(1, "signal-transformation", basics, "reversed-support", six((n) => [n, n+4, n+2, n+1]), (left, right, shift, scale) => ({
  value: (shift-right)/scale, wrong: [(shift-left)/scale, (right-shift)/scale, shift-right, left+shift], unit: " s",
  prompt: [`x(t) 的支撑为 [${left},${right}] s，y(t)=x(${shift}−${scale}t)。y 的支撑左端点是多少？`, `The support of x(t) is [${left},${right}] s and y(t)=x(${shift}−${scale}t). What is the left endpoint of y's support?`],
  explanation: ["解 L≤b−at≤R（a>0）得 (b−R)/a≤t≤(b−L)/a，反转后左右端点交换。", "Solving L≤b−at≤R with a>0 gives (b−R)/a≤t≤(b−L)/a; time reversal swaps the endpoints."],
}));
add(1, "signal-transformation", basics, "scaled-signal-energy", six((n) => [n+2, n+1, n+3]), (energy, gain, scale) => ({
  value: gain*gain*energy/scale, wrong: [gain*energy/scale, gain*gain*energy*scale, energy/scale, 0],
  prompt: [`x(t) 能量为 ${energy}，y(t)=${gain}x(−${scale}t)。y(t) 的能量是多少？`, `x(t) has energy ${energy}, and y(t)=${gain}x(−${scale}t). What is the energy of y(t)?`],
  explanation: ["幅度乘 k 使能量乘 k²，时间缩放使能量除以 |a|，反转不改变能量。", "Amplitude gain k multiplies energy by k²; time scaling divides it by |a|. Reversal preserves energy."],
}));
add(1, "frequency-units", basics, "commensurate-period", six((n) => [2*n, 3*n]), (f1, f2) => ({
  value: 2/f1, wrong: [1/f1, 1/f2, 1/(f1+f2), 1/(2*(f2-f1))], unit: " s",
  prompt: [`x(t)=cos(2π·${f1}t)+cos(2π·${f2}t)，基本周期是多少？`, `What is the fundamental period of x(t)=cos(2π·${f1}t)+cos(2π·${f2}t)?`],
  explanation: ["两项非零，基本频率为两个整数频率的最大公约数，T₀=1/gcd(f₁,f₂)。", "Both components are nonzero; the fundamental frequency is gcd(f₁,f₂), so T₀=1/gcd(f₁,f₂)."],
}));
add(1, "frequency-units", basics, "discrete-period", [[2,5],[3,8],[4,9],[5,12],[5,16],[7,18]], (p, q) => ({
  value: q, wrong: [p, q/p, 2*q, q-p],
  prompt: [`x[n]=cos(2π·${p}n/${q})，最小正整数周期 N 是多少？`, `For x[n]=cos(2π·${p}n/${q}), what is the smallest positive integer period N?`],
  explanation: ["周期须满足 pN/q 为整数，故 N=q/gcd(p,q)；本题分子分母互质。", "A period requires pN/q to be an integer, so N=q/gcd(p,q). Here p and q are coprime."],
}));
add(1, "impulse", basics, "affine-impulse-area", six((n) => [n+3, -(n+1), n]), (a, scale, shift) => ({
  value: a/Math.abs(scale), wrong: [a*scale, a/scale, a*Math.abs(scale), a],
  prompt: [`积分 ∫₋∞∞ ${a}δ(${scale}t−${shift})dt 等于多少？`, `Evaluate ∫₋∞∞ ${a}δ(${scale}t−${shift})dt.`],
  explanation: ["δ(at−b) 的面积为 1/|a|，平移不改变面积，外部系数仍需乘入。", "The area of δ(at−b) is 1/|a|. Translation preserves area, and the external multiplier remains."],
}));
add(1, "impulse", basics, "affine-impulse-sift", six((n) => [n+1, 2*(n+1), n+2, n]), (a, b, c, d) => ({
  value: (c*b/a+d)/a, wrong: [c*b/a+d, (c*b+d)/a, (c*a/b+d)/a, 0],
  prompt: [`积分 ∫₋∞∞ (${c}t+${d})δ(${a}t−${b})dt 等于多少？`, `Evaluate ∫₋∞∞ (${c}t+${d})δ(${a}t−${b})dt.`],
  explanation: ["冲激位于 t=b/a，还要乘尺度权重 1/|a|，结果为 (cb/a+d)/|a|。", "The impulse is at t=b/a and has weight 1/|a|, giving (cb/a+d)/|a|."],
}));
add(1, "impulse", basics, "step-window-area", six((n) => [n+1, n, 3*n+2]), (a, left, right) => ({
  value: a*(right-left), wrong: [a*(right+left), right-left, a*a*(right-left), 0],
  prompt: [`x(t)=${a}[u(t−${left})−u(t−${right})]，全时间积分（面积）是多少？`, `What is the integral over all time (area) of x(t)=${a}[u(t−${left})−u(t−${right})]?`],
  explanation: ["两个阶跃之差形成宽 R−L、高 A 的矩形，面积为 A(R−L)。", "The step difference is a rectangle of width R−L and height A, so its area is A(R−L)."],
}));
add(1, "system-properties", basics, "differentiator-amplitude", six((n) => [n+2, n+3]), (a, w) => ({
  value: a*w, wrong: [a/w, a, w, a*w*w],
  prompt: [`理想微分器 y(t)=dx(t)/dt，输入 x(t)=${a}sin(${w}t)。输出正弦分量的幅度是多少？`, `An ideal differentiator y(t)=dx(t)/dt receives x(t)=${a}sin(${w}t). What is the output sinusoid's amplitude?`],
  explanation: ["对正弦求导得 Aωcos(ωt)，幅度为 Aω；此结论只针对题给正弦输入。", "Differentiation gives Aωcos(ωt), with amplitude Aω, for the stated sinusoidal input."],
}));
add(1, "system-model", basics, "difference-equation-order", six((n) => [n, n+1]), (lead, lag) => ({
  value: lead+lag, wrong: [lead, lag, Math.abs(lead-lag), 0],
  prompt: [`差分方程 y[k+${lead}]+2y[k−${lag}]=x[k] 中，输出序列最高与最低序号都具有非零系数。方程阶数是多少？`, `In y[k+${lead}]+2y[k−${lag}]=x[k], both extreme output indices have nonzero coefficients. What is the equation's order?`],
  explanation: ["差分方程阶数是未知输出序列最高序号与最低序号之差。", "The order is the difference between the highest and lowest indices of the unknown output sequence."],
}));

add(2, "convolution", "convolution", "unequal-exponential-convolution", six((n) => [n, n+1, 0.2*n]), (a, b, t) => ({
  value: (Math.exp(-a*t)-Math.exp(-b*t))/(b-a), wrong: [Math.exp(-(a+b)*t), Math.exp(-a*t)+Math.exp(-b*t), t*Math.exp(-a*t), 0],
  prompt: [`x(t)=e^(−${a}t)u(t)，h(t)=e^(−${b}t)u(t)。卷积 (x*h)(${fmt(t)}) 是多少？`, `Let x(t)=e^(−${a}t)u(t) and h(t)=e^(−${b}t)u(t). What is (x*h)(${fmt(t)})?`],
  explanation: ["对 0≤τ≤t 积分，(x*h)(t)=[e^(−at)−e^(−bt)]/(b−a)，a≠b。", "Integrating over 0≤τ≤t gives (x*h)(t)=[e^(−at)−e^(−bt)]/(b−a), for a≠b."],
}));
add(2, "step-response", "first-order", "first-order-step-sample", six((n) => [n+1, n, 0.1*(n+1)]), (k, a, t) => ({
  value: k/a*(1-Math.exp(-a*t)), wrong: [k*(1-Math.exp(-a*t)), k/a*Math.exp(-a*t), k/a, 0],
  prompt: [`因果 LTI 系统 h(t)=${k}e^(−${a}t)u(t)，零初始状态下输入 u(t)。y(${fmt(t)}) 是多少？`, `A causal LTI system has h(t)=${k}e^(−${a}t)u(t), starts at rest, and receives u(t). What is y(${fmt(t)})?`],
  explanation: ["阶跃响应是 h 的积分，y(t)=(K/a)[1−e^(−at)]（t≥0）。", "The step response integrates h: y(t)=(K/a)[1−e^(−at)] for t≥0."],
}));
add(2, "zero-input", "first-order", "natural-response-sample", six((n) => [n+2, n+1, 0.1*n]), (initial, a, t) => ({
  value: initial*Math.exp(-a*t), wrong: [initial*(1-Math.exp(-a*t)), initial*Math.exp(a*t), Math.exp(-a*t), 0],
  prompt: [`t≥0 时 y′+${a}y=0，y(0⁺)=${initial}。y(${fmt(t)}) 是多少？`, `For t≥0, y′+${a}y=0 and y(0⁺)=${initial}. What is y(${fmt(t)})?`],
  explanation: ["一阶齐次方程的解为 y(t)=y(0⁺)e^(−at)，由初值确定系数。", "The homogeneous solution is y(t)=y(0⁺)e^(−at), with its coefficient fixed by the initial value."],
}));
add(2, "zero-state", "first-order", "total-response-sample", six((n) => [n+3, n+1, 2*n+1, 0.1*n]), (initial, a, b, t) => ({
  value: b/a+(initial-b/a)*Math.exp(-a*t), wrong: [b/a*(1-Math.exp(-a*t)), initial*Math.exp(-a*t), b/a, initial+b/a],
  prompt: [`t≥0 时 y′+${a}y=${b}，y(0⁺)=${initial}。全响应 y(${fmt(t)}) 是多少？`, `For t≥0, y′+${a}y=${b} and y(0⁺)=${initial}. What is the total response y(${fmt(t)})?`],
  explanation: ["全响应为稳态值加暂态：y(t)=B/a+[y(0⁺)−B/a]e^(−at)。", "The total response is steady state plus transient: y(t)=B/a+[y(0⁺)−B/a]e^(−at)."],
}));
add(2, "convolution", "first-order", "pulse-response-after-end", six((n) => [n+1, 0.1*n]), (a, width) => ({
  value: (1-Math.exp(-a*width))*Math.exp(-a*width), wrong: [1-Math.exp(-2*a*width), Math.exp(-a*width), 1-Math.exp(-a*width), 0],
  prompt: [`零状态系统 h(t)=${a}e^(−${a}t)u(t)，输入 u(t)−u(t−${fmt(width)})。y(${fmt(2*width)}) 是多少？`, `A zero-state system has h(t)=${a}e^(−${a}t)u(t) and input u(t)−u(t−${fmt(width)}). What is y(${fmt(2*width)})?`],
  explanation: ["脉冲输入是两个错位阶跃之差；在 t=2T，y=(1−e^(−aT))e^(−aT)。", "Subtract the delayed step response from the first; at t=2T, y=(1−e^(−aT))e^(−aT)."],
}));
add(2, "convolution", "convolution", "rectangle-convolution-sample", six((n) => [n+1, n+2, n+2, n+4, 2*n+3]), (a, b, t1, t2, t) => ({
  value: a*b*Math.max(0,Math.min(t1,t)-Math.max(0,t-t2)), wrong: [a*b*Math.min(t1,t2), a*b*(t1+t2), Math.min(t1,t2), 0],
  prompt: [`x(t) 在 [0,${t1}] 为 ${a}，h(t) 在 [0,${t2}] 为 ${b}，两者区间外均为零。(x*h)(${t}) 是多少？`, `x(t) is ${a} on [0,${t1}] and h(t) is ${b} on [0,${t2}], both zero elsewhere. What is (x*h)(${t})?`],
  explanation: ["重叠长度为 max(0,min(T₁,t)−max(0,t−T₂))，再乘两个幅度 AB。", "The overlap length is max(0,min(T₁,t)−max(0,t−T₂)); multiply by both amplitudes AB."],
}));
add(2, "convolution", "convolution", "shifted-convolution-end", six((n) => [n, n+2, n+1, n+4]), (l1, r1, l2, r2) => ({
  value: r1+r2, wrong: [l1+l2, Math.max(r1,r2), r1+r2-l1-l2, r1-r2], unit: " s",
  prompt: [`两个矩形信号分别在 [${l1},${r1}] s 和 [${l2},${r2}] s 内恒为 1，外部为零。卷积支撑的右端点是多少？`, `Two rectangular signals equal 1 on [${l1},${r1}] s and [${l2},${r2}] s respectively, and zero elsewhere. What is the right endpoint of their convolution support?`],
  explanation: ["两个非负矩形的卷积支撑为 [L₁+L₂,R₁+R₂]，右端点是两右端点相加。", "The convolution support is [L₁+L₂,R₁+R₂]; its right endpoint is the sum of the right endpoints."],
}));
add(2, "convolution", "convolution", "convolution-total-area", six((n) => [n+2, n+1, n+4, n+3]), (a, alpha, b, beta) => ({
  value: a*b/(alpha*beta), wrong: [a/alpha+b/beta, a*b/(alpha+beta), a*b, 0],
  prompt: [`x(t)=${a}e^(−${alpha}t)u(t)，h(t)=${b}e^(−${beta}t)u(t)。∫₋∞∞(x*h)(t)dt 是多少？`, `For x(t)=${a}e^(−${alpha}t)u(t) and h(t)=${b}e^(−${beta}t)u(t), what is ∫₋∞∞(x*h)(t)dt?`],
  explanation: ["绝对可积信号的卷积面积等于两信号面积之积：(A/α)(B/β)。", "For integrable signals, the area of a convolution is the product of the areas: (A/α)(B/β)."],
}));
add(2, "convolution", "convolution", "discrete-convolution-middle", six((n) => [n, n+1, n+2, n+4]), (a, b, c, d) => ({
  value: a*d+b*c, wrong: [a*c+b*d, a*c, b*d, a+b+c+d],
  prompt: [`x[0]=${a}, x[1]=${b}, h[0]=${c}, h[1]=${d}，其余样本均为零。线性卷积 y[1] 是多少？`, `x[0]=${a}, x[1]=${b}, h[0]=${c}, h[1]=${d}, with all other samples zero. What is the linear convolution y[1]?`],
  explanation: ["由 y[n]=Σₖx[k]h[n−k]，y[1]=x[0]h[1]+x[1]h[0]。", "Using y[n]=Σₖx[k]h[n−k], y[1]=x[0]h[1]+x[1]h[0]."],
}));
add(2, "convolution", "convolution", "ramp-step-convolution", six((n) => [n+1, n+2]), (a, t) => ({
  value: a*t*t/2, wrong: [a*t, a*t*t, t*t/2, 0],
  prompt: [`x(t)=${a}t u(t)，h(t)=u(t)。连续卷积 y(${t}) 是多少？`, `x(t)=${a}t u(t) and h(t)=u(t). What is the continuous convolution y(${t})?`],
  explanation: ["与单位阶跃卷积相当于积分：y(t)=∫₀ᵗAτ dτ=At²/2（t≥0）。", "Convolution with the unit step integrates the signal: y(t)=∫₀ᵗAτ dτ=At²/2 for t≥0."],
}));

add(2, "convolution", "convolution", "two-impulse-response", six((n) => [n+1, n+2, n, 0.1*n]), (a, b, decay, delay) => ({
  value: a*Math.exp(-2*decay*delay)+b*Math.exp(-decay*delay), wrong: [(a+b)*Math.exp(-2*decay*delay), a*Math.exp(-2*decay*delay), b*Math.exp(-decay*delay), a+b],
  prompt: [`零状态系统 h(t)=e^(−${decay}t)u(t)，输入 ${a}δ(t)+${b}δ(t−${fmt(delay)})。y(${fmt(2*delay)}) 是多少？`, `A zero-state system has h(t)=e^(−${decay}t)u(t) and input ${a}δ(t)+${b}δ(t−${fmt(delay)}). What is y(${fmt(2*delay)})?`],
  explanation: ["冲激卷积只产生移位与增益：y(t)=Ah(t)+Bh(t−T)，在 t=2T 代入。", "Impulse convolution shifts and scales h: y(t)=Ah(t)+Bh(t−T). Evaluate at t=2T."],
}));
add(2, "step-response", "first-order", "repeated-pole-step-final", six((n) => [n+3, n+1]), (k, a) => ({
  value: k/(a*a), wrong: [k/a, k*a, 1/a, 0],
  prompt: [`稳定因果系统 h(t)=${k}t e^(−${a}t)u(t)，单位阶跃零状态响应的终值是多少？`, `A stable causal system has h(t)=${k}t e^(−${a}t)u(t). What is the final value of its zero-state unit-step response?`],
  explanation: ["阶跃终值等于冲激响应面积，∫₀∞Kt e^(−at)dt=K/a²。", "The final step value is the area of h: ∫₀∞Kt e^(−at)dt=K/a²."],
}));
add(2, "initial-values", "second-order", "second-order-impulse-jump", six((n) => [n+1, n+2, 3*n+4]), (mass, damping, impulse) => ({
  value: impulse/mass, wrong: [impulse, impulse/damping, mass/impulse, 0],
  prompt: [`系统 ${mass}y″+${damping}y′+y=${impulse}δ(t)，初始静止，y 在 0 处连续。y′(0⁺) 是多少？`, `The system ${mass}y″+${damping}y′+y=${impulse}δ(t) is initially at rest, and y is continuous at 0. What is y′(0⁺)?`],
  explanation: ["在冲激两侧积分，m[y′(0⁺)−y′(0⁻)]=J；初始静止，故 y′(0⁺)=J/m。", "Integrating across the impulse gives m[y′(0⁺)−y′(0⁻)]=J. Initial rest gives y′(0⁺)=J/m."],
}));
add(2, "initial-values", "first-order", "first-order-initial-slope", six((n) => [n+1, n+2, n]), (a, input, initial) => ({
  value: input-a*initial, wrong: [input+a*initial, input/a, -a*initial, input],
  prompt: [`t>0 时 y′+${a}y=${input}，y(0⁺)=${initial}。右侧初始斜率 y′(0⁺) 是多少？`, `For t>0, y′+${a}y=${input} and y(0⁺)=${initial}. What is the right-hand initial slope y′(0⁺)?`],
  explanation: ["把右侧初值直接代入微分方程：y′(0⁺)=B−ay(0⁺)。", "Substitute the right-hand initial value into the ODE: y′(0⁺)=B−ay(0⁺)."],
}));
add(2, "second-order", "second-order", "complex-root-frequency", six((n) => [n+1, n+3]), (a, b) => ({
  value: b, wrong: [a, a*a+b*b, 2*b, 0], unit: " rad/s",
  prompt: [`齐次方程 y″+${2*a}y′+${a*a+b*b}y=0 的特征根为 −${a}±j${b}。非零自由响应的振荡角频率是多少？`, `The homogeneous ODE y″+${2*a}y′+${a*a+b*b}y=0 has roots −${a}±j${b}. What is the oscillation angular frequency of a nonzero natural response?`],
  explanation: ["共轭根 α±jβ 对应 e^(αt)(Ccosβt+Dsinβt)，角频率是虚部的绝对值 |β|。", "Roots α±jβ give e^(αt)(Ccosβt+Dsinβt), with angular frequency |β|."],
}));
add(2, "second-order", "second-order", "complex-root-envelope", six((n) => [n+1, n+3, 0.1*n]), (a, b, t) => ({
  value: Math.exp(-a*t), wrong: [Math.exp(-b*t), Math.exp(a*t), 1-Math.exp(-a*t), 1],
  prompt: [`非零自由响应由特征根 −${a}±j${b} 产生。t=${fmt(t)} s 时振幅包络与 t=0 时的比值是多少？`, `A nonzero natural response comes from roots −${a}±j${b}. What is its amplitude-envelope ratio at t=${fmt(t)} s relative to t=0?`],
  explanation: ["特征根的实部控制振幅包络，包络比为 e^(−at)，虚部只控制振荡频率。", "The real part controls the amplitude envelope, whose ratio is e^(−at); the imaginary part controls oscillation frequency."],
}));

add(2, "second-order", "second-order", "second-order-step-gain", six((n) => [n+3, n+2, n+5]), (k, b, c) => ({
  value: k/c, wrong: [k/b, c/k, k, 0],
  prompt: [`稳定因果系统 H(s)=${k}/(s²+${b}s+${c})，初始静止。单位阶跃输出的终值是多少？`, `A stable causal system H(s)=${k}/(s²+${b}s+${c}) starts at rest. What is its final unit-step output?`],
  explanation: ["二阶分母各系数为正，极点在左半平面；阶跃终值为直流增益 H(0)=K/c。", "The positive second-order denominator coefficients place its poles in the left half-plane. The final step value is H(0)=K/c."],
}));
add(2, "second-order", "second-order", "critical-pole", six((n) => [n+1]), (a) => ({
  value: -a, wrong: [a, -2*a, -a*a, 0], unit: " s⁻¹",
  prompt: [`特征方程 s²+${2*a}s+${a*a}=0，其重根是多少？`, `The characteristic equation is s²+${2*a}s+${a*a}=0. What is its repeated root?`],
  explanation: ["特征多项式是 (s+a)²，重根为 s=−a。", "The characteristic polynomial is (s+a)², whose repeated root is s=−a."],
}));
add(2, "correlation", "convolution", "rectangle-autocorrelation", six((n) => [n+1, n+4, -(n+1)]), (a, width, lag) => ({
  value: a*a*(width-Math.abs(lag)), wrong: [a*(width-Math.abs(lag)), a*a*width, a*a*(width+Math.abs(lag)), 0],
  prompt: [`实信号 x(t) 在 [0,${width}] 为 ${a}，其余为零。按 Rxx(τ)=∫x(t)x(t−τ)dt，Rxx(${lag}) 是多少？`, `A real signal x(t) is ${a} on [0,${width}] and zero elsewhere. With Rxx(τ)=∫x(t)x(t−τ)dt, what is Rxx(${lag})?`],
  explanation: ["矩形自相关为 A²max(T−|τ|,0)，由两个矩形的重叠长度得到。", "Rectangle autocorrelation is A²max(T−|τ|,0), obtained from the overlap length."],
}));
add(2, "correlation", "convolution", "crosscorrelation-peak", six((n) => [n, 3*n+1]), (a, b) => ({
  value: a-b, wrong: [b-a, a+b, b, 0], unit: " s",
  prompt: [`p(t) 是 [0,1] 上的单位矩形，x(t)=p(t−${a})，y(t)=p(t−${b})。Rxy(τ)=∫x(t)y(t−τ)dt 在哪个 τ 达到最大？`, `p(t) is a unit rectangle on [0,1], x(t)=p(t−${a}), and y(t)=p(t−${b}). At what τ does Rxy(τ)=∫x(t)y(t−τ)dt reach its maximum?`],
  explanation: ["最大值对应完全重叠：y(t−τ)=p(t−τ−b) 与 p(t−a) 对齐，故 τ=a−b。", "The maximum occurs at complete overlap: p(t−τ−b) aligns with p(t−a), so τ=a−b."],
}));

add(3, "fourier-series", "fourier-series", "period-ms-frequency", six((n) => [2*n+1]), (period) => ({
  value: 1000/period, wrong: [1/period, period/1000, 2/period, 1000*period], unit: " Hz",
  prompt: [`周期信号基本周期 T₀=${period} ms，基频 f₀ 是多少 Hz？`, `A periodic signal has fundamental period T₀=${period} ms. What is its fundamental frequency f₀ in Hz?`],
  explanation: ["先将毫秒换算成秒，再用 f₀=1/T₀，即 f₀=1000/T₀(ms)。", "Convert milliseconds to seconds before applying f₀=1/T₀: f₀=1000/T₀(ms)."],
}));
add(3, "fourier-series", "fourier-series", "sine-series-imaginary", six((n) => [n+2, n+1]), (a, w) => ({
  value: -a/2, wrong: [a/2, -a, a, 0],
  prompt: [`采用 x(t)=ΣCₖe^(jkω₀t)。x(t)=${a}sin(${w}t)，ω₀=${w}。C₁ 的虚部是多少？`, `Use x(t)=ΣCₖe^(jkω₀t). For x(t)=${a}sin(${w}t) with ω₀=${w}, what is Im(C₁)?`],
  explanation: ["sin(ω₀t)=(e^(jω₀t)−e^(−jω₀t))/(2j)，因此 C₁=A/(2j)=−jA/2。", "sin(ω₀t)=(e^(jω₀t)−e^(−jω₀t))/(2j), hence C₁=A/(2j)=−jA/2."],
}));
add(3, "fourier-series", "fourier-series", "cosine-series-real", [[2,60],[3,120],[4,180],[5,240],[6,0],[8,90]], (a, degrees) => ({
  value: a*Math.cos(degrees*Math.PI/180)/2, wrong: [a*Math.cos(degrees*Math.PI/180), a, -a, a/3, 0],
  prompt: [`采用 x(t)=ΣCₖe^(jkt)。x(t)=${a}cos(t+${degrees}°)，C₁ 的实部是多少？`, `Use x(t)=ΣCₖe^(jkt). For x(t)=${a}cos(t+${degrees}°), what is Re(C₁)?`],
  explanation: ["正频率系数为 C₁=(A/2)e^(jφ)，实部为 (A/2)cosφ；相位角按度换算。", "The positive-frequency coefficient is C₁=(A/2)e^(jφ), so Re(C₁)=(A/2)cosφ, with φ converted from degrees."],
}));
add(3, "fourier-series", "fourier-series", "series-parseval-power", six((n) => [n, n+1, n+2]), (dc, real, imaginary) => ({
  value: dc*dc+2*(real*real+imaginary*imaginary), wrong: [dc*dc+real*real+imaginary*imaginary, dc+2*(real+imaginary), (dc+2*real)**2, 0],
  prompt: [`指数傅里叶级数仅 C₀=${dc}、C₁=${real}+j${imaginary}、C₋₁=${real}−j${imaginary} 非零。信号平均功率是多少？`, `Only C₀=${dc}, C₁=${real}+j${imaginary}, and C₋₁=${real}−j${imaginary} are nonzero in an exponential Fourier series. What is the average power?`],
  explanation: ["帕塞瓦尔关系 P=Σ|Cₖ|²；正负频率各贡献一次，P=C₀²+2(Re(C₁)²+Im(C₁)²)。", "Parseval gives P=Σ|Cₖ|²; count both positive and negative frequencies: P=C₀²+2(Re(C₁)²+Im(C₁)²)."],
}));
add(3, "fourier-transform", "fourier-transform", "derivative-spectrum", six((n) => [n+2, n+3]), (w, magnitude) => ({
  value: w*magnitude, wrong: [magnitude/w, w/magnitude, magnitude, w*w*magnitude],
  prompt: [`采用 X(ω)=∫x(t)e^(−jωt)dt，x 满足微分性质条件。已知 |X(${w})|=${magnitude}。y=dx/dt，则 |Y(${w})| 是多少？`, `Use X(ω)=∫x(t)e^(−jωt)dt and assume the differentiation property applies. If |X(${w})|=${magnitude} and y=dx/dt, what is |Y(${w})|?`],
  explanation: ["时域微分对应 Y(ω)=jωX(ω)，幅度为 |ω|·|X(ω)|。", "Time differentiation gives Y(ω)=jωX(ω), so |Y(ω)|=|ω|·|X(ω)|."],
}));
add(3, "fourier-transform", "fourier-transform", "scaled-transform-area", six((n) => [n+4, n+2, n+1]), (area, gain, scale) => ({
  value: gain*area/scale, wrong: [gain*area*scale, gain*gain*area/scale, area/scale, 0],
  prompt: [`可积信号 x(t) 满足 ∫x(t)dt=${area}。y(t)=${gain}x(−${scale}t)，采用 Y(ω)=∫y(t)e^(−jωt)dt。Y(0) 是多少？`, `An integrable x(t) has ∫x(t)dt=${area}. Let y(t)=${gain}x(−${scale}t), with Y(ω)=∫y(t)e^(−jωt)dt. What is Y(0)?`],
  explanation: ["零频值是面积，幅度因子只乘一次：Y(0)=kX(0)/|a|，不同于能量中的 k²。", "The zero-frequency value is area: Y(0)=kX(0)/|a|. The amplitude multiplier appears once, unlike k² in energy."],
}));
add(3, "fourier-transform", "fourier-transform", "exponential-spectrum-magnitude", [[2,3,4],[3,4,3],[4,5,12],[5,12,5],[6,8,15],[7,15,8]], (a, decay, w) => ({
  value: a/Math.hypot(decay,w), wrong: [a/(decay+w), a/decay, a/w, a],
  prompt: [`x(t)=${a}e^(−${decay}t)u(t)，X(ω)=∫x(t)e^(−jωt)dt。|X(${w})| 是多少？`, `x(t)=${a}e^(−${decay}t)u(t), with X(ω)=∫x(t)e^(−jωt)dt. What is |X(${w})|?`],
  explanation: ["X(ω)=A/(a+jω)，分母模为 √(a²+ω²)，故 |X|=A/√(a²+ω²)。", "X(ω)=A/(a+jω), whose denominator has magnitude √(a²+ω²), so |X|=A/√(a²+ω²)."],
}));
add(3, "fourier-transform", "fourier-transform", "bilateral-exponential-dc", six((n) => [n+1, n+2]), (a, decay) => ({
  value: 2*a/decay, wrong: [a/decay, a*a/decay, 2*a*decay, 0],
  prompt: [`x(t)=${a}e^(−${decay}|t|)，X(ω)=∫x(t)e^(−jωt)dt。X(0) 是多少？`, `For x(t)=${a}e^(−${decay}|t|) and X(ω)=∫x(t)e^(−jωt)dt, what is X(0)?`],
  explanation: ["X(0) 等于信号面积；两侧各为 A/a，总面积为 2A/a。", "X(0) is the signal area; each half contributes A/a, giving 2A/a."],
}));
add(3, "fourier-transform", "fourier-transform", "rectangle-spectrum-sample", six((n) => [n+1, 2*n]), (a, width) => ({
  value: 2*a*width/Math.PI, wrong: [a*width, a*width/Math.PI, 2*a/Math.PI, 0],
  prompt: [`x(t) 在 |t|≤${width}/2 内为 ${a}，外部为零。X(ω)=∫x(t)e^(−jωt)dt，X(π/${width}) 是多少？`, `x(t) is ${a} for |t|≤${width}/2 and zero elsewhere. With X(ω)=∫x(t)e^(−jωt)dt, what is X(π/${width})?`],
  explanation: ["对称矩形变换为 X(ω)=2A sin(ωT/2)/ω；代入 ω=π/T 得 2AT/π。", "The centered rectangle has X(ω)=2A sin(ωT/2)/ω; at ω=π/T this is 2AT/π."],
}));
add(3, "frequency-response", "fourier-transform", "delay-phase-degrees", six((n) => [10*(n+1), 5*n]), (f, milliseconds) => ({
  value: -360*f*milliseconds/1000, wrong: [360*f*milliseconds/1000, -f*milliseconds/1000, -360*f*milliseconds, 0], unit: "°",
  prompt: [`纯延时系统 y(t)=x(t−${milliseconds}/1000)，时间单位 s。在 ${f} Hz 处，按 φ(f)=−360fT 的未折叠相位是多少度？`, `A pure delay is y(t)=x(t−${milliseconds}/1000), with time in seconds. At ${f} Hz, what is its unwrapped phase in degrees using φ(f)=−360fT?`],
  explanation: ["延时的频率响应为 e^(−j2πfT)，相位为 −360fT 度，本题不折叠到主值区间。", "A delay has response e^(−j2πfT), with phase −360fT degrees. Do not wrap it to the principal interval."],
}));
add(3, "frequency-response", "fourier-transform", "delay-difference-notch", six((n) => [n+1]), (milliseconds) => ({
  value: 1000/milliseconds, wrong: [500/milliseconds, 1/milliseconds, milliseconds/1000, 0], unit: " Hz",
  prompt: [`系统 y(t)=x(t)−x(t−${milliseconds}/1000)，时间单位 s。除直流外，幅频响应的第一个正频率零点是多少 Hz？`, `A system is y(t)=x(t)−x(t−${milliseconds}/1000), with time in seconds. Excluding DC, what is the first positive-frequency zero of its magnitude response in Hz?`],
  explanation: ["H(f)=1−e^(−j2πfT)，零点满足 fT 为整数；首个正频率为 1/T。", "H(f)=1−e^(−j2πfT) is zero when fT is an integer. The first positive zero is 1/T."],
}));
add(3, "frequency-response", "fourier-transform", "ideal-lowpass-output-power", six((n) => [n+1, n+3, n+2, 10*n]), (a, b, gain, low) => ({
  value: gain*gain*a*a/2, wrong: [gain*a*a/2, gain*gain*(a*a+b*b)/2, a*a/2, 0],
  prompt: [`理想低通在 |f|<${2*low} Hz 时 H(f)=${gain}，其余为零。输入 ${a}cos(2π·${low}t)+${b}cos(2π·${3*low}t)，稳态输出功率是多少？`, `An ideal low-pass has H(f)=${gain} for |f|<${2*low} Hz and zero otherwise. Its input is ${a}cos(2π·${low}t)+${b}cos(2π·${3*low}t). What is the steady-state output power?`],
  explanation: ["只保留低频分量，输出幅度为 GA，正弦平均功率为 (GA)²/2。", "Only the low-frequency component passes, with amplitude GA. Its average power is (GA)²/2."],
}));
add(3, "frequency-response", "fourier-transform", "lowpass-sinusoid-amplitude", six((n) => [n+2, n+1, 0.1*n, n+3]), (a, gain, tau, w) => ({
  value: a*gain/Math.sqrt(1+(w*tau)**2), wrong: [a*gain, a*gain/(1+w*tau), a/Math.sqrt(1+(w*tau)**2), 0],
  prompt: [`稳定一阶低通 H(jω)=${gain}/(1+jω·${fmt(tau)})，输入 ${a}cos(${w}t)。稳态输出幅度是多少？`, `A stable first-order low-pass has H(jω)=${gain}/(1+jω·${fmt(tau)}), with input ${a}cos(${w}t). What is the steady-state output amplitude?`],
  explanation: ["输出幅度为输入幅度乘 |H(jω)|：AK/√(1+(ωτ)²)。", "Multiply the input amplitude by |H(jω)|: AK/√(1+(ωτ)²)."],
}));
add(3, "frequency-response", "fourier-transform", "highpass-sinusoid-amplitude", [[2,3,4],[3,4,3],[4,5,12],[5,12,5],[6,8,15],[7,15,8]], (a, pole, w) => ({
  value: a*w/Math.hypot(pole,w), wrong: [a*pole/Math.hypot(pole,w), a*w/(pole+w), a, 0],
  prompt: [`稳定高通 H(jω)=jω/(${pole}+jω)，输入 ${a}cos(${w}t)。稳态输出幅度是多少？`, `A stable high-pass has H(jω)=jω/(${pole}+jω), with input ${a}cos(${w}t). What is its steady-state output amplitude?`],
  explanation: ["|H(jω)|=|ω|/√(a²+ω²)，再乘输入幅度。", "|H(jω)|=|ω|/√(a²+ω²); multiply this by the input amplitude."],
}));
add(3, "sampling", "sampling", "multiple-zone-alias", six((n) => [100*(n+2), (n+2)*100*(n+2)+30*n]), (fs, f) => ({
  value: Math.abs(f-Math.round(f/fs)*fs), wrong: [f%fs+fs/2, f, Math.abs(f-fs), fs], unit: " Hz",
  prompt: [`频率 ${f} Hz 的实余弦按 fs=${fs} Hz 采样，折叠到 [0,${fs/2}] Hz 后的频率是多少？`, `A real cosine at ${f} Hz is sampled at fs=${fs} Hz. What is its alias frequency in [0,${fs/2}] Hz?`],
  explanation: ["采样后相差整数倍 fs 的频率等价，实余弦还可折叠负频率：fa=|f−round(f/fs)fs|。", "Sampled frequencies differing by an integer multiple of fs are equivalent; real cosines also fold negative frequencies: fa=|f−round(f/fs)fs|."],
}));
add(3, "sampling", "sampling", "normalized-cycles", six((n) => [100*n, 1000*(n+1)]), (f, fs) => ({
  value: f/fs, wrong: [fs/f, 2*f/fs, f/(2*fs), f], unit: " cycles/sample",
  prompt: [`模拟正弦频率 ${f} Hz，采样率 ${fs} Hz。归一化频率是多少周期/样本（不是 rad/sample）？`, `An analog sinusoid is ${f} Hz and the sampling rate is ${fs} Hz. What is its normalized frequency in cycles/sample (not rad/sample)?`],
  explanation: ["每个样本间隔内经历 f/fs 个周期；若用 rad/sample 才需再乘 2π。", "Each sample interval spans f/fs cycles. Multiplication by 2π is only needed for rad/sample."],
}));
add(3, "sampling", "sampling", "finite-record-samples", six((n) => [200*(n+1), 0.1*n]), (fs, duration) => ({
  value: Math.round(fs*duration), wrong: [Math.round(fs*duration)+1, Math.round(fs*duration)-1, fs/duration, fs],
  prompt: [`从 t=0 开始以 ${fs} Hz 采样，仅保留 0≤t<${fmt(duration)} s 的样本。样本数 N 是多少？`, `Sampling starts at t=0 at ${fs} Hz, retaining only samples with 0≤t<${fmt(duration)} s. How many samples N are retained?`],
  explanation: ["采样时刻为 n/fs，本题 fsT 为整数且不含右端点，n=0,…,fsT−1，共 fsT 个。", "Sample times are n/fs. Here fsT is an integer and the right endpoint is excluded, so n=0,…,fsT−1 gives fsT samples."],
}));
add(3, "sampling", "sampling", "dft-coherent-cosine", six((n) => [n+1, 16*(n+1), n+2]), (a, size, k) => ({
  value: a*size/2, wrong: [a/2, a*size, a, size/2],
  prompt: [`x[n]=${a}cos(2π·${k}n/${size})，n=0,…,${size-1}。采用未归一化 DFT：X[k]=Σx[n]e^(−j2πkn/${size})，|X[${k}]| 是多少？`, `x[n]=${a}cos(2π·${k}n/${size}), n=0,…,${size-1}. Using the unnormalized DFT X[k]=Σx[n]e^(−j2πkn/${size}), what is |X[${k}]|?`],
  explanation: ["相干采样且频点不是直流或奈奎斯特点，余弦能量分布在两个频点，每个 DFT 幅值为 AN/2。", "With coherent sampling away from DC and Nyquist, the cosine occupies two bins; each has DFT magnitude AN/2."],
}));
add(3, "modulation", "modulation", "am-sideband-amplitude", six((n) => [n+2, 0.1*n, 100*n]), (carrier, mu, message) => ({
  value: carrier*mu/2, wrong: [carrier*mu, carrier/2, carrier*(1+mu), 0],
  prompt: [`AM 信号 s(t)=${carrier}[1+${fmt(mu)}cos(2π·${message}t)]cos(2π·${10*message}t)。上边带余弦分量的幅度是多少？`, `An AM signal is s(t)=${carrier}[1+${fmt(mu)}cos(2π·${message}t)]cos(2π·${10*message}t). What is the upper-sideband cosine amplitude?`],
  explanation: ["利用 cosαcosβ=[cos(α+β)+cos(α−β)]/2，每个边带幅度为 Acμ/2。", "Using cosαcosβ=[cos(α+β)+cos(α−β)]/2, each sideband has amplitude Acμ/2."],
}));
add(3, "modulation", "modulation", "mixer-difference-frequency", six((n) => [100+10*n, 80+5*n]), (rf, lo) => ({
  value: rf-lo, wrong: [rf+lo, rf, lo, 2*(rf-lo)], unit: " kHz",
  prompt: [`${rf} kHz 余弦与 ${lo} kHz 本振余弦相乘。理想低通只保留差频项，输出频率是多少？`, `A ${rf} kHz cosine is multiplied by a ${lo} kHz local-oscillator cosine. An ideal low-pass retains only the difference-frequency term. What is the output frequency?`],
  explanation: ["两余弦乘积产生和频与差频，低通保留 |fRF−fLO|。", "Multiplying two cosines produces sum and difference frequencies. The low-pass retains |fRF−fLO|."],
}));

add(4, "laplace-properties", "laplace", "laplace-exponential-value", six((n) => [n+2, n+1, n+3]), (a, decay, s) => ({
  value: a/(s+decay), wrong: [a/(s-decay), a/decay, a/(s+decay)**2, 0],
  prompt: [`x(t)=${a}e^(−${decay}t)u(t)，求单边拉氏变换 X(${s})。`, `For x(t)=${a}e^(−${decay}t)u(t), what is the unilateral Laplace transform X(${s})?`],
  explanation: ["X(s)=A/(s+a)，给定 s 在 Re(s)>−a 的收敛域内。", "X(s)=A/(s+a), and the specified s is in the ROC Re(s)>−a."],
}));
add(4, "laplace-properties", "laplace", "laplace-polynomial-value", six((n) => [n, 2]), (power, s) => ({
  value: Array.from({length:power},(_,i)=>i+1).reduce((a,b)=>a*b,1)/s**(power+1), wrong: [1/s**(power+1), power/s**power, s**(power+1), 0],
  prompt: [`x(t)=t^${power}u(t)，求单边拉氏变换 X(${s})。`, `For x(t)=t^${power}u(t), what is the unilateral Laplace transform X(${s})?`],
  explanation: ["L[tⁿu(t)]=n!/s^(n+1)，注意分子是阶乘，Re(s)>0。", "L[tⁿu(t)]=n!/s^(n+1), with the factorial in the numerator and Re(s)>0."],
}));
add(4, "laplace-properties", "laplace", "delayed-step-transform", six((n) => [n+1, 0.1*n, n+1]), (a, delay, s) => ({
  value: a*Math.exp(-s*delay)/s, wrong: [a/s, a*Math.exp(s*delay)/s, a*Math.exp(-s*delay), 0],
  prompt: [`x(t)=${a}u(t−${fmt(delay)})，求单边拉氏变换 X(${s})。`, `For x(t)=${a}u(t−${fmt(delay)}), what is the unilateral Laplace transform X(${s})?`],
  explanation: ["延迟 T 的阶跃变换为 Ae^(−sT)/s，延迟因子不能遗漏。", "A step delayed by T has transform Ae^(−sT)/s; retain the delay factor."],
}));
add(4, "laplace-roc", "laplace", "shifted-roc-boundary", six((n) => [n+1, 2*n+3]), (decay, shift) => ({
  value: shift-decay, wrong: [-decay, -shift, -(shift+decay), shift+decay],
  prompt: [`x(t)=e^(${shift}t)e^(−${decay}t)u(t)。双边拉氏收敛域为 Re(s)>b，b 是多少？`, `x(t)=e^(${shift}t)e^(−${decay}t)u(t). Its bilateral Laplace ROC is Re(s)>b. What is b?`],
  explanation: ["合并指数得到 e^((c−a)t)u(t)，或将原 ROC 右移 c，边界为 c−a。", "Combining exponents gives e^((c−a)t)u(t), or shifts the original ROC right by c. The boundary is c−a."],
}));
add(4, "laplace-properties", "laplace", "unilateral-second-derivative", six((n) => [n+1, n+3, n, n+2]), (s, transform, initial, slope) => ({
  value: s*s*transform-s*initial-slope, wrong: [s*s*transform, s*s*transform+s*initial+slope, s*transform-initial, 0],
  prompt: [`采用从 0⁻ 开始的单边变换。F(${s})=${transform}，f(0⁻)=${initial}，f′(0⁻)=${slope}。L[f″] 在 s=${s} 处等于多少？`, `Use the unilateral transform starting at 0⁻. F(${s})=${transform}, f(0⁻)=${initial}, and f′(0⁻)=${slope}. What is L[f″] at s=${s}?`],
  explanation: ["二阶微分要减去两个初始项：L[f″]=s²F(s)−sf(0⁻)−f′(0⁻)。", "The second derivative subtracts two initial terms: L[f″]=s²F(s)−sf(0⁻)−f′(0⁻)."],
}));
add(4, "laplace-properties", "laplace", "time-weighted-transform", six((n) => [n+2, n+1, n+3]), (a, decay, s) => ({
  value: a/(s+decay)**2, wrong: [a/(s+decay), -a/(s+decay)**2, a/(s*s+decay), 0],
  prompt: [`x(t)=${a}e^(−${decay}t)u(t)，y(t)=t x(t)。单边拉氏变换 Y(${s}) 是多少？`, `Let x(t)=${a}e^(−${decay}t)u(t) and y(t)=t x(t). What is the unilateral Laplace transform Y(${s})?`],
  explanation: ["时域乘 t 对应 −dX/ds。X=A/(s+a)，所以 Y=A/(s+a)²。", "Multiplication by t corresponds to −dX/ds. For X=A/(s+a), Y=A/(s+a)²."],
}));
add(4, "laplace-properties", "laplace", "integrated-transform", six((n) => [n+2, n+1, n+3]), (a, decay, s) => ({
  value: a/(s*(s+decay)), wrong: [a/(s+decay), a*s/(s+decay), a/(s+decay)**2, 0],
  prompt: [`x(t)=${a}e^(−${decay}t)u(t)，y(t)=∫₀⁻ᵗx(τ)dτ。单边拉氏变换 Y(${s}) 是多少？`, `Let x(t)=${a}e^(−${decay}t)u(t) and y(t)=∫₀⁻ᵗx(τ)dτ. What is the unilateral Laplace transform Y(${s})?`],
  explanation: ["零初始积分对应 Y(s)=X(s)/s=A/[s(s+a)]。", "Integration with zero initial integral gives Y(s)=X(s)/s=A/[s(s+a)]."],
}));
add(4, "laplace-properties", "laplace", "rational-initial-value", six((n) => [n+2, n+1, n+3, n+4]), (b, c, a, d) => ({
  value: b, wrong: [c/(a*d), c, b+c, 0],
  prompt: [`因果 F(s)=(${b}s+${c})/[(s+${a})(s+${d})]，f 不含冲激。f(0⁺) 是多少？`, `For causal F(s)=(${b}s+${c})/[(s+${a})(s+${d})], f contains no impulses. What is f(0⁺)?`],
  explanation: ["初值定理 f(0⁺)=lim(s→∞)sF(s)，由最高次项的系数得到分子的一次项系数。", "The initial-value theorem gives f(0⁺)=lim(s→∞)sF(s), determined by the leading coefficients."],
}));
add(4, "laplace-properties", "laplace", "two-pole-final-value", six((n) => [n+4, n+1, n+2]), (k, a, b) => ({
  value: k/(a*b), wrong: [k/(a+b), k/a, k/b, 0],
  prompt: [`因果 F(s)=${k}/[s(s+${a})(s+${b})]。f(t) 的终值是多少？`, `For causal F(s)=${k}/[s(s+${a})(s+${b})], what is the final value of f(t)?`],
  explanation: ["sF 的极点均严格在左半平面，终值定理适用：lim(t→∞)f(t)=lim(s→0)sF(s)=K/(ab)。", "All poles of sF lie strictly in the left half-plane, so the final-value theorem gives lim(t→∞)f(t)=lim(s→0)sF(s)=K/(ab)."],
}));
add(4, "laplace-inverse", "laplace", "inverse-damped-sine", six((n) => [n+3, n+1, n+2]), (k, decay, w) => ({
  value: k/w, wrong: [k, k*w, k/decay, 0],
  prompt: [`因果 F(s)=${k}/[(s+${decay})²+${w*w}]，f(t)=A e^(−${decay}t)sin(${w}t)u(t)。A 是多少？`, `For causal F(s)=${k}/[(s+${decay})²+${w*w}], write f(t)=A e^(−${decay}t)sin(${w}t)u(t). What is A?`],
  explanation: ["L[e^(−at)sin(ωt)u(t)]=ω/[(s+a)²+ω²]，分子匹配要求 A=K/ω。", "L[e^(−at)sin(ωt)u(t)]=ω/[(s+a)²+ω²]. Matching the numerator gives A=K/ω."],
}));
add(4, "laplace-inverse", "laplace", "numerator-residue", six((n) => [n+1, n+4, n, n+2]), (k, zero, a, b) => ({
  value: k*(zero-a)/(b-a), wrong: [k*(zero+a)/(b+a), k/(b-a), k*(zero-b)/(a-b), 0],
  prompt: [`F(s)=${k}(s+${zero})/[(s+${a})(s+${b})]。部分分式中 1/(s+${a}) 的系数是多少？`, `F(s)=${k}(s+${zero})/[(s+${a})(s+${b})]. What is the coefficient of 1/(s+${a}) in its partial fractions?`],
  explanation: ["单极点留数为 lim(s→−a)(s+a)F(s)=K(z−a)/(b−a)。", "The simple-pole residue is lim(s→−a)(s+a)F(s)=K(z−a)/(b−a)."],
}));
add(4, "laplace-inverse", "laplace", "direct-impulse-coefficient", six((n) => [n+2, n+1, n+4, n+3]), (b, a, c, d) => ({
  value: b/a, wrong: [b, c/d, a/b, 0],
  prompt: [`因果系统 H(s)=(${b}s+${c})/(${a}s+${d})。冲激响应中 δ(t) 的系数是多少？`, `A causal system has H(s)=(${b}s+${c})/(${a}s+${d}). What is the coefficient of δ(t) in its impulse response?`],
  explanation: ["分子分母同阶，先长除；商为最高次项系数比 b/a，对应冲激直接项。", "Equal numerator and denominator degrees require polynomial division. The quotient b/a is the direct impulse coefficient."],
}));
add(4, "circuit-model", "laplace", "capacitor-initial-current-term", six((n) => [0.1*n, n+2]), (c, voltage) => ({
  value: -c*voltage, wrong: [c*voltage, -voltage/c, voltage/c, 0],
  prompt: [`被动参考方向电容 C=${fmt(c)} F，v(0⁻)=${voltage} V。单边变换 I(s)=sCV(s)+q，常数项 q 的数值是多少？`, `A capacitor in the passive sign convention has C=${fmt(c)} F and v(0⁻)=${voltage} V. In the unilateral transform I(s)=sCV(s)+q, what is the numerical constant q?`],
  explanation: ["由 i=C dv/dt，单边变换得到 I=sCV−Cv(0⁻)，初始项为负号。", "From i=C dv/dt, the unilateral transform is I=sCV−Cv(0⁻); the initial term has a minus sign."],
}));
add(4, "circuit-model", "laplace", "inductor-s-impedance", six((n) => [n+1, n+2]), (l, s) => ({
  value: l*s, wrong: [l/s, s/l, 1/(l*s), l], unit: " Ω",
  prompt: [`零初始电流的理想电感 L=${l} H，在 s=${s} s⁻¹ 处的 s 域阻抗是多少？`, `An ideal inductor with zero initial current has L=${l} H. What is its s-domain impedance at s=${s} s⁻¹?`],
  explanation: ["零初始状态下电感满足 V(s)=sLI(s)，故 ZL(s)=sL。", "With zero initial state, V(s)=sLI(s), so ZL(s)=sL."],
}));
add(4, "stability", "laplace", "routh-stable-bound", six((n) => [n+2, n+3]), (a, b) => ({
  value: a*b, wrong: [a+b, b/a, a/b, 0],
  prompt: [`因果系统 H(s)=1/(s³+${a}s²+${b}s+k)，k>0。BIBO 稳定区间为 0<k<K，严格上界 K 是多少？`, `For causal H(s)=1/(s³+${a}s²+${b}s+k), k>0, the BIBO-stable interval is 0<k<K. What is the strict upper bound K?`],
  explanation: ["三阶劳斯首列为 1、a、(ab−k)/a、k。严格稳定要求全为正，故 0<k<ab；等号不稳定。", "The cubic Routh first column is 1, a, (ab−k)/a, k. All must be positive, giving 0<k<ab; equality is not BIBO stable."],
}));
add(4, "stability", "laplace", "routh-first-column", six((n) => [n+2, n+3, n+1]), (a, b, c) => ({
  value: (a*b-c)/a, wrong: [(a*b+c)/a, a*b-c, c/a, 0],
  prompt: [`多项式 D(s)=s³+${a}s²+${b}s+${c}。按标准劳斯表计算，s¹ 行首列元素是多少？`, `For D(s)=s³+${a}s²+${b}s+${c}, what is the first element of the s¹ row in the standard Routh table?`],
  explanation: ["前两行为 [1,b]、[a,c]，第三行首项为 (ab−c)/a。", "The first two rows are [1,b] and [a,c], so the next leading entry is (ab−c)/a."],
}));
add(4, "block-diagrams", "laplace", "negative-feedback-gain", six((n) => [n+1, 0.1*n]), (g, h) => ({
  value: g/(1+g*h), wrong: [g/(1-g*h), g*h, g, 0],
  prompt: [`静态负反馈框图满足 e=r−${fmt(h)}y，y=${g}e。闭环增益 y/r 是多少？`, `A static negative-feedback diagram satisfies e=r−${fmt(h)}y and y=${g}e. What is the closed-loop gain y/r?`],
  explanation: ["联立 y=G(r−Hy)，得 (1+GH)y=Gr，所以 T=G/(1+GH)。", "Substitute to get y=G(r−Hy), hence (1+GH)y=Gr and T=G/(1+GH)."],
}));
add(4, "block-diagrams", "laplace", "mason-touching-loops", six((n) => [0.05*n, -0.1*(n+1)]), (l1, l2) => ({
  value: 1-l1-l2, wrong: [1-l1-l2+l1*l2, 1+l1+l2, l1*l2, 0],
  prompt: [`信号流图恰有两个回路 L₁=${fmt(l1)}、L₂=${fmt(l2)}，两回路共享节点。梅森特征式 Δ 是多少？`, `A signal-flow graph has exactly two loops, L₁=${fmt(l1)} and L₂=${fmt(l2)}, sharing a node. What is Mason's determinant Δ?`],
  explanation: ["接触回路不能形成乘积项，只有 Δ=1−L₁−L₂；回路增益保留各自符号。", "Touching loops contribute no product term, so Δ=1−L₁−L₂, retaining each loop gain's sign."],
}));
add(4, "realization", "laplace", "cascade-dc-gain", six((n) => [n+2, n+1, n+4, n+3]), (k1, a, k2, b) => ({
  value: k1*k2/(a*b), wrong: [k1/a+k2/b, k1*k2/(a+b), k1*k2, 0],
  prompt: [`两个稳定系统 H₁(s)=${k1}/(s+${a})、H₂(s)=${k2}/(s+${b}) 级联，总直流增益是多少？`, `Stable systems H₁(s)=${k1}/(s+${a}) and H₂(s)=${k2}/(s+${b}) are cascaded. What is their overall DC gain?`],
  explanation: ["级联系统函数相乘，H(0)=H₁(0)H₂(0)=K₁K₂/(ab)。", "Cascade transfer functions multiply: H(0)=H₁(0)H₂(0)=K₁K₂/(ab)."],
}));
add(4, "realization", "laplace", "scalar-state-dc-gain", six((n) => [n+1, n+2, n+3, n]), (a, b, c, d) => ({
  value: c*b/a+d, wrong: [c*b/a, -c*b/a+d, b/a+d, d],
  prompt: [`零初始状态的标量模型 x′=−${a}x+${b}u，y=${c}x+${d}u，其传递函数 H(s) 的直流增益 H(0) 是多少？`, `A zero-initial-state scalar model is x′=−${a}x+${b}u, y=${c}x+${d}u. What is the DC gain H(0) of its transfer function?`],
  explanation: ["H(s)=C(sI−A)⁻¹B+D=CB/(s+a)+D，令 s=0，保留直接通路 D。", "H(s)=C(sI−A)⁻¹B+D=CB/(s+a)+D. Set s=0 and retain the direct path D."],
}));

assert.equal(families, 80);
assert.equal(additions.length, 160);
bank.version = "2026-11-06-v3";
bank.questions = [...original, ...additions];
for (const q of bank.questions) {
  const skill = q.id.startsWith("ext-") ? q.id.slice(4).replace(/-\d+$/, "") : q.id;
  assert.ok(questionSources[skill], `Missing handout reference: ${q.id}`);
  for (const item of [q, ...q.variants]) item.sources = questionSources[skill];
}
writeFileSync(path, `${JSON.stringify(bank, null, 2)}\n`);
console.log(`Expanded to ${bank.questions.length} base questions and ${bank.questions.flatMap((q) => q.variants).length} variants.`);
