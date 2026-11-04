import { createVirtualLabEngine as createLegacyEngine } from './legacy-v1.mjs';

const TAU = 2 * Math.PI;
const changedIDs = ['L1-2', 'L2-3', 'L2-4', 'L3-2', 'L3-3'];
const clone = value => JSON.parse(JSON.stringify(value));
const number = (key, label, min, max, step, value, unit = '') => ({ key, label, min, max, step, value, unit, type: 'number' });
const select = (key, label, value, options) => ({ key, label, value, options, type: 'select' });
const answer = (key, label, placeholder = '', type = 'number') => ({ key, label, placeholder, type });
const line = (label, points, extra = {}) => ({ label, points, ...extra });

// Causal inputs make integration from -infinity well-defined.
export const inputValue = (kind, t) => t < 0 ? 0 : kind === 'pulse' ? Number(t < 1) : kind === 'exp' ? Math.exp(-t) : kind === 'sin' ? Math.sin(t) : 1;
const primitive = (kind, t) => t <= 0 ? 0 : kind === 'pulse' ? Math.min(t, 1) : kind === 'exp' ? -Math.expm1(-t) : kind === 'sin' ? 1 - Math.cos(t) : t;
function output(kind, x, integral, t) {
  if (kind === 'affine') return x(t) + 1;
  if (kind === 'square') return x(t) ** 2;
  if (kind === 'timescale') return x(2 * t);
  if (kind === 'delay') return x(t - 1);
  return integral(t);
}
export function compareSystem(p, sample) {
  const x1 = t => inputValue(p.x1, t), x2 = t => inputValue(p.x2, t);
  const s1 = t => primitive(p.x1, t), s2 = t => primitive(p.x2, t);
  const left = p.test === 'linearity'
    ? t => output(p.kind, q => p.alpha * x1(q) + p.beta * x2(q), q => p.alpha * s1(q) + p.beta * s2(q), t)
    : t => output(p.kind, q => x1(q - p.delay), q => s1(q - p.delay), t);
  const right = p.test === 'linearity'
    ? t => p.alpha * output(p.kind, x1, s1, t) + p.beta * output(p.kind, x2, s2, t)
    : t => output(p.kind, x1, s1, t - p.delay);
  const a = sample(left, -2, 5, 1400), b = sample(right, -2, 5, 1400);
  const difference = a.map(([t, y], i) => [t, y - b[i][1]]);
  return { a, b, difference, left, right, error: Math.max(...difference.map(([, y]) => Math.abs(y))) };
}
function evidenceMatches(text, p) {
  const entries = text.split(';').map(part => part.trim()).filter(Boolean).map(part => part.split('=').map(value => value.trim()));
  const keys = p.test === 'linearity' ? ['x1', 'x2', 'alpha', 'beta'] : ['x1', 'delay'];
  if (entries.length !== keys.length || entries.some(pair => pair.length !== 2) || new Set(entries.map(([key]) => key)).size !== keys.length) return false;
  const values = Object.fromEntries(entries);
  return keys.every(key => typeof p[key] === 'number' ? values[key] !== '' && Number(values[key]) === p[key] : values[key] === p[key]);
}
export function butterworth(order, fc, frequency) {
  const r = frequency / fc;
  const phase = order === 1 ? -Math.atan(r) : order === 2 ? -Math.atan2(Math.SQRT2 * r, 1 - r * r) : -Math.atan(r) - Math.atan2(r, 1 - r * r);
  return { ratio: 1 / Math.sqrt(1 + r ** (2 * order)), phase };
}
export function cutoffInterval(order) {
  return [100 / (1 / 0.95 ** 2 - 1) ** (1 / (2 * order)), 1000 / (1 / 0.05 ** 2 - 1) ** (1 / (2 * order))];
}
// Cascaded real first-order / conjugate-pole sections, integrated independently
// of the closed-form frequency response. State velocities are scaled by wc.
function filterResponse(order, fc, step, M) {
  const wc = TAU * fc, input = t => Math.sin(TAU * 100 * t) + 0.3 * Math.sin(TAU * 1000 * t);
  const count = Math.ceil(0.2 / Math.min(step, 0.06 / wc)), dt = 0.2 / count;
  let state = Array(order).fill(0);
  const derivative = (t, s) => order === 1 ? [wc * (input(t) - s[0])] : order === 2
    ? [wc * s[1], wc * (input(t) - s[0] - Math.SQRT2 * s[1])]
    : [wc * (input(t) - s[0]), wc * s[2], wc * (s[0] - s[1] - s[2])];
  const value = s => s[order === 3 ? 1 : 0], numerical = [[0, 0]];
  const stage = (s, k, h) => s.map((v, i) => v + h * k[i]);
  for (let i = 0; i < count; i++) {
    const t = i * dt, a = derivative(t, state), b = derivative(t + dt / 2, stage(state, a, dt / 2));
    const c = derivative(t + dt / 2, stage(state, b, dt / 2)), d = derivative(t + dt, stage(state, c, dt));
    state = state.map((v, j) => v + dt * (a[j] + 2 * b[j] + 2 * c[j] + d[j]) / 6);
    numerical.push([(i + 1) * dt, value(state)]);
  }
  const theory = [100, 1000].map((frequency, i) => ({ frequency, ...butterworth(order, fc, frequency), inputAmplitude: i ? 0.3 : 1 }));
  const fit = M.fitComponents(numerical);
  const passed = theory[0].ratio >= 0.95 && theory[1].ratio <= 0.05 && fit.components[0].ratio >= 0.95 && fit.components[1].ratio <= 0.05;
  return { input, numerical, theory, fit, passed, dt };
}
export function secondOrderValue(zeta, omegaN, t) {
  if (t <= 0) return 0;
  if (Math.abs(zeta - 1) < 1e-8) return 1 - (1 + omegaN * t) * Math.exp(-omegaN * t);
  if (zeta > 1) {
    const d = Math.sqrt(zeta * zeta - 1), a = -omegaN / (zeta + d), b = -omegaN * (zeta + d);
    return 1 + (b * Math.exp(a * t) - a * Math.exp(b * t)) / (a - b);
  }
  const d = Math.sqrt(1 - zeta * zeta), wd = omegaN * d;
  return 1 - Math.exp(-zeta * omegaN * t) * (Math.cos(wd * t) + zeta / d * Math.sin(wd * t));
}
function secondOrder(zeta, omegaN, M) {
  const stable = zeta > 0, end = zeta < 0 ? Math.min(10, 7 / (-zeta * omegaN)) : 10;
  const count = Math.ceil(end / Math.min(0.002, 0.02 / omegaN)), dt = end / count;
  let y = 0, v = 0;
  const numerical = [[0, 0]], acceleration = (x, velocity) => omegaN * omegaN * (1 - x) - 2 * zeta * omegaN * velocity;
  for (let i = 0; i < count; i++) {
    const a = acceleration(y, v), bv = v + dt * a / 2, b = acceleration(y + dt * v / 2, bv);
    const cv = v + dt * b / 2, c = acceleration(y + dt * bv / 2, cv), dv = v + dt * c, d = acceleration(y + dt * cv, dv);
    y += dt * (v + 2 * bv + 2 * cv + dv) / 6; v += dt * (a + 2 * b + 2 * c + d) / 6;
    numerical.push([(i + 1) * dt, y]);
  }
  const overshoot = stable && zeta < 1 ? 100 * Math.exp(-Math.PI * zeta / Math.sqrt(1 - zeta * zeta)) : stable ? 0 : Math.max(0, ...numerical.map(([, x]) => 100 * (x - 1)));
  let settlingTime = null;
  if (stable) {
    const decay = zeta <= 1 ? zeta * omegaN : omegaN / (zeta + Math.sqrt(zeta * zeta - 1));
    const horizon = Math.min(120, Math.max(10, 12 / decay)), n = Math.ceil(horizon / 0.002);
    let last = -1;
    for (let i = 0; i <= n; i++) if (Math.abs(secondOrderValue(zeta, omegaN, i * horizon / n) - 1) > 0.02) last = i;
    if (last >= 0 && last < n) {
      let lo = last * horizon / n, hi = (last + 1) * horizon / n;
      for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (Math.abs(secondOrderValue(zeta, omegaN, mid) - 1) > 0.02) lo = mid; else hi = mid; }
      settlingTime = hi;
    }
  }
  const real = -zeta * omegaN, d = zeta <= 1 ? omegaN * Math.sqrt(1 - zeta * zeta) : omegaN * Math.sqrt(zeta * zeta - 1);
  const poles = zeta <= 1 ? [{ re: real, im: d }, { re: real, im: -d }] : [{ re: real + d, im: 0 }, { re: real - d, im: 0 }];
  return { numerical, end, stable, poles, overshoot, settlingTime, error: Math.max(...numerical.map(([t, x]) => Math.abs(x - secondOrderValue(zeta, omegaN, t)))) };
}

export function installPhaseTwo(L) {
  const M = L.models, priorScene = L.scene, priorRequired = L.requiredMeasurements;
  L.version = '1.1.0';
  const inputs = [['step', 'u(t)'], ['pulse', 'u(t)−u(t−1)'], ['exp', 'e^(−t)u(t)'], ['sin', 'sin(t)u(t)']];
  Object.assign(L.tasks['L1-2'], { title: '系统性质检验', short: '系统性质', goal: '构造非线性与时变反例，比较五个系统。', prediction: '判断五个系统的线性与时不变性。', analysis: '用反例或代数关系给出五个系统的判定。', evidence: '保存参数、两条路径和反例记录。', params: [
    select('kind', '系统', 'affine', [['affine', 'y=x+1'], ['timescale', 'y(t)=x(2t)'], ['delay', 'y(t)=x(t−1)'], ['integrator', 'y(t)=∫₋∞ᵗ x(τ)dτ'], ['square', 'y=x²']]),
    select('test', '检验', 'linearity', [['linearity', '线性'], ['invariance', '时不变性']]), select('x1', '输入 x₁ / x', 'step', inputs), select('x2', '输入 x₂', 'step', inputs),
    number('alpha', 'α', -2, 2, 0.1, 1), number('beta', 'β', -2, 2, 0.1, 1), number('delay', '延迟 d', -2, 2, 0.1, 1, 's')],
    answers: [answer('evidence', '参数记录', 'x1=step; x2=step; alpha=1; beta=1', 'text')] });
  L.tasks['L2-3'].params.splice(1, 0, select('order', '阶数 n', '1', [['1', '1'], ['2', '2'], ['3', '3']]));
  L.tasks['L2-3'].params[0].max = 2000;
  Object.assign(L.tasks['L2-3'], { title: '低通滤波设计', goal: '100 Hz 幅度比≥0.95，1000 Hz 幅度比≤0.05。', prediction: '一阶滤波器能同时满足两个指标吗？', analysis: '说明一阶不可行的依据，给出最低阶数、截止频率、相移和延迟。', evidence: '保存一阶对照、最低阶设计和高阶比较。', answers: [answer('minOrder', '最低可行阶数', 'n')] });
  L.tasks['L2-4'].params.push(select('mode', '信号', 'base', [['base', '10 Hz'], ['audio', '3 kHz']]), select('antiAlias', '抗混叠滤波', 'off', [['off', '关闭'], ['on', '接入']]), select('filterOrder', '滤波器阶数', '2', [['1', '1'], ['2', '2'], ['3', '3']]), number('filterCutoff', '截止频率', 50, 2000, 1, 200, 'Hz'));
  L.tasks['L2-4'].params.find(p => p.key === 'fs').options.push(['4000', '4 kHz']);
  L.tasks['L2-4'].params.find(p => p.key === 'candidate').max = 3500;
  Object.assign(L.tasks['L2-4'], { title: '采样与混叠', goal: '比较采样、低频候选和抗混叠滤波。', prediction: '3 kHz 信号以 4 kHz 采样后，会听到什么频率？', analysis: '解释相同样本的频率歧义及滤波前后的变化。', evidence: '保存低频对照、音频采样和滤波后的结果。' });
  L.tasks['L3-2'].params.unshift(select('initial', '初始值 y₀', '0', [['0', '0'], ['0.5', '0.5'], ['2', '2']]));
  L.tasks['L3-2'].answers.push(answer('b0', '初始项 b₀', 'b₀'));
  Object.assign(L.tasks['L3-2'], { title: '一阶系统响应', short: '一阶响应', goal: '保留初始项，比较零状态与非零初值响应。', prediction: '比较 y₀=0、0.5、2 的响应。', analysis: '从 sY−y₀ 推导全响应，说明零输入与零状态分量。', evidence: '保存零状态、t90 和两组非零初值结果。' });
  Object.assign(L.tasks['L3-3'], { title: '二阶系统极点设计', short: '二阶极点', goal: '超调≤15%，2% 调节时间≤3 s。', prediction: '极点位置怎样影响振荡、超调和稳定性？', analysis: '用极点、阶跃响应和频率响应说明设计依据。', evidence: '保存欠阻尼、过阻尼、右半平面和设计结果。',
    params: [number('zeta', '阻尼比 ζ', -0.5, 2, 0.01, 0.3), number('omegaN', '自然频率 ωₙ', 0.5, 6, 0.05, 3, 'rad/s'), number('measureTime', '测量时刻', 0, 10, 0.01, 1, 's')],
    answers: [answer('zeta', '设计阻尼比 ζ', 'ζ'), answer('omegaN', '设计自然频率 ωₙ', 'ωₙ')] });
  L.courses[0].objectives[1] = '用反例和代数关系检验五个系统。';
  L.courses[1].objectives[2] = '确定最低 Butterworth 阶数并比较相移与延迟。';
  L.courses[1].objectives[3] = '比较采样、可听混叠与抗混叠滤波。';
  L.courses[2].objectives[1] = '保留初始项求一阶全响应。';
  L.courses[2].objectives[2] = '由二阶极点设计超调和调节时间。';
  L.courses[2].tags = ['变换对应', '一阶响应', '二阶极点', '脉冲设计'];
  Object.assign(L.tasks['L1-2'], { hints: ['全部输入在 t<0 为零。', '比较系统运算与叠加或平移的先后顺序。', '吻合需要代数依据；一个反例即可否定性质。'] });
  Object.assign(L.tasks['L2-3'], { hints: ['两个幅度比的分母分别为 1 与 0.3。', '用两个不等式求每个阶数的截止频率范围。', '比较相频与群延迟曲线。'] });
  Object.assign(L.tasks['L3-2'], { question: '初始值怎样进入变换式与全响应？', hints: ['H(s) 由零初始条件定义。', '变换 y′ 时保留 sY−y₀。', '用起点、长期值和分解检查系数。'] });
  Object.assign(L.tasks['L3-3'], { question: '怎样用极点位置设计超调和调节时间？', hints: ['极点实部决定稳定性。', '改变 ζ 和 ωₙ，比较响应与极点。', '调节时间按最后一次进入 2% 误差带计算。'] });
  const guides = {
    'L1-2': ['预测五个系统的线性与时不变性。', '为 affine、square 构造非线性反例，为 timescale 构造时变反例。', '比较 delay 与 integrator；记录输入、系数、延迟与最大差。', '用反例或代数关系解释判定。'],
    'L2-3': ['比较一阶 fc=100、500 Hz。', '推导两个幅度约束，判断一阶是否可行。', '选择最低阶数和截止频率，保存达标设计。', '与三阶 fc=200 Hz 比较相移和群延迟。'],
    'L2-4': ['比较 100、15 Hz 对 10 Hz 余弦的采样。', '寻找全部样本吻合的低频候选。', '用 4 kHz 采样 3 kHz 输入，比较混叠频率。', '接入 L2-3 的采样前滤波器，比较相同增益下的混叠幅度。'],
    'L3-2': ['求零初值的 H、X、Y 与部分分式。', '测量 y(0)、y(1) 和零状态 t90。', '对初值 0.5、2 保留 sY−y₀ 并更新系数。', '比较零输入、零状态与全响应。'],
    'L3-3': ['比较欠阻尼与过阻尼。', '观察右半平面极点对应的发散。', '拖动极点或调参，满足超调≤15%、2% 调节时间≤3 s。', '用同一设计比较极点、阶跃与频率响应。'],
  };
  for (const [id, steps] of Object.entries(guides)) L.guides[id] = { steps, evidence: L.tasks[id].evidence };
  L.validAnswers = (id, values) => !!L.tasks[id] && !!values && typeof values === 'object' && !Array.isArray(values) && Object.keys(values).length === (L.tasks[id].answers || []).length && (L.tasks[id].answers || []).every(a => typeof values[a.key] === 'string' && values[a.key].length <= 100 && (a.type === 'text' || values[a.key].trim() === '' || Number.isFinite(Number(values[a.key])) && Math.abs(Number(values[a.key])) <= 100));
  const validParams = L.validParams;
  L.validParams = (id, p) => validParams(id, p) && (id !== 'L2-4' || (p.mode === 'audio' ? p.fs === '4000' : p.fs !== '4000'));
  L.requiredMeasurements = (id, p) => id === 'L3-3' ? ['zeta', 'omegaN', 'overshoot', 'settlingTime', 'stable', 'passed', 'answerStatus']
    : id === 'L1-2' ? [...priorRequired(id, p), 'answerStatus']
    : id === 'L2-3' ? [...priorRequired(id, p), 'order', 'groupDelay', 'answerStatus']
    : id === 'L2-4' && p.mode === 'audio' ? [...priorRequired(id, p), 'aliasFrequency', 'aliasedAmplitude'] : priorRequired(id, p);
  const filters = new Map(), secondOrders = new Map();
  M.compare = p => compareSystem(p, M.sample);
  M.butterworth = butterworth; M.cutoffInterval = cutoffInterval;
  M.filter = (fc, step = 0.00001, order = 1) => { const key = `${order}:${fc}:${step}`; if (!filters.has(key)) { if (filters.size > 24) filters.clear(); filters.set(key, filterResponse(Number(order), fc, step, M)); } return filters.get(key); };
  M.secondOrder = (zeta, omegaN) => { const key = `${zeta}:${omegaN}`; if (!secondOrders.has(key)) { if (secondOrders.size > 30) secondOrders.clear(); secondOrders.set(key, secondOrder(zeta, omegaN, M)); } return secondOrders.get(key); };
  const metric = (label, value, unit = '') => ({ label, value: value === null ? '—' : typeof value === 'number' ? L.format(value, 6) : value, unit });
  const feedback = (key, value, expected, label) => ({ key, label, status: value === null ? 'missing' : Math.abs(value - expected) < 1e-8 ? 'correct' : 'review', message: value === null ? '尚未填写' : Math.abs(value - expected) < 1e-8 ? '一致' : '请核对' });
  L.scene = (id, p, answers = {}) => {
    if (id === 'L1-2') {
      const c = M.compare(p), supplied = typeof answers.evidence === 'string' && answers.evidence.trim();
      const valid = supplied && evidenceMatches(answers.evidence, p);
      const status = supplied ? valid ? 'correct' : 'review' : 'missing';
      const answerFeedback = [{ key: 'evidence', label: '参数记录', status, message: status === 'correct' ? '已复算' : status === 'missing' ? '尚未填写' : '参数记录与当前设置不一致' }];
      return { plots: [{ key: 'main', title: '两条路径', range: [-2, 5], series: [line('路径 A', c.a), line('路径 B', c.b, { dash: '7 4' })] }, { key: 'difference', title: 'A−B', range: [-2, 5], series: [line('差值', c.difference)] }],
        metrics: [metric('最大绝对差', c.error), metric('本组试验', c.error > 1e-6 ? '反例' : '吻合')], readings: { maxDifference: c.error, comparison: c.error > 1e-6 ? 'counterexample' : 'equal-for-this-input', window: [-2, 5], answerStatus: answerFeedback }, answerFeedback,
        formula: p.test === 'linearity' ? 'T[αx₁+βx₂] ↔ αT[x₁]+βT[x₂]' : 'T[x(t−d)] ↔ T[x](t−d)', note: '全部输入在 t<0 为零；单个反例可否定性质，有限次吻合不能证明性质。' };
    }
    if (id === 'L2-3') {
      const order = Number(p.order), r = M.filter(p.fc, 0.00001, order), c = r.fit.components;
      const answerFeedback = order === 1 ? [] : [feedback('minOrder', L.answerNumber(answers, 'minOrder'), 2, '最低可行阶数')];
      const freq = f => butterworth(order, p.fc, f), delay = f => -(freq(f + 0.01).phase - freq(Math.max(0, f - 0.01)).phase) / (TAU * (f === 0 ? 0.01 : 0.02));
      return { plots: [
        { key: 'main', title: '稳态输入与输出', range: [0.1, 0.12], series: [line('输出 · RK4', r.numerical.filter(([t], i) => t >= 0.1 && t <= 0.12 && i % 2 === 0)), line('双频输入', M.sample(r.input, 0.1, 0.12, 1600), { dash: '7 4' })] },
        { key: 'magnitude', title: '幅频响应', range: [0, 2000], xUnit: 'Hz', xLabel: 'f / Hz', yLabel: '|H|', series: [line('|H|', M.sample(f => freq(f).ratio, 0, 2000, 1000))] },
        { key: 'phase', title: '相频响应', range: [0, 2000], xUnit: 'Hz', xLabel: 'f / Hz', yLabel: '相位 / °', series: [line('相位', M.sample(f => freq(f).phase * 180 / Math.PI, 0, 2000, 1000))] },
        { key: 'delay', title: '群延迟', range: [0, 2000], xUnit: 'Hz', xLabel: 'f / Hz', yLabel: '延迟 / ms', series: [line('群延迟', M.sample(f => 1000 * delay(f), 0, 2000, 1000))] }],
        metrics: [metric('100 Hz 测量幅度比', c[0].ratio), metric('1000 Hz 测量幅度比', c[1].ratio), metric('100 / 1000 Hz 相移', `${L.format(c[0].phase, 2)} / ${L.format(c[1].phase, 2)}`, '°'), metric('100 Hz 群延迟', delay(100) * 1000, 'ms'), metric('双项指标', r.passed ? '达标' : '未达标')],
        readings: { cutoff: p.fc, order, fitWindow: [0.1, 0.2], fitSampleCount: r.fit.count, components: c.map((v, i) => ({ ...v, theoryRatio: r.theory[i].ratio, theoryPhase: r.theory[i].phase * 180 / Math.PI })), passed: r.passed, answerStatus: answerFeedback, groupDelay: delay(100) }, answerFeedback,
        formula: '|H(j2πf)|=1/√(1+(f/fc)^(2n))；R(100)≥0.95，R(1000)≤0.05', note: '零初值 RK4；幅度与相位用 [0.1,0.2) s 的联合最小二乘测量。' };
    }
    if (id === 'L2-4') {
      if (p.mode !== 'audio') return priorScene(id, p, answers);
      const fs = Number(p.fs), f0 = 3000, alias = Math.abs(((f0 + fs / 2) % fs) - fs / 2);
      const transfer = p.antiAlias === 'on' ? butterworth(Number(p.filterOrder), p.filterCutoff, f0) : { ratio: 1, phase: 0 };
      const end = 0.004, original = t => transfer.ratio * Math.cos(TAU * f0 * t + transfer.phase);
      const rebuilt = t => transfer.ratio * Math.cos(TAU * alias * t - transfer.phase);
      const samples = Array.from({ length: Math.floor(end * fs) + 1 }, (_, n) => [n / fs, original(n / fs)]);
      return { plots: [{ key: 'main', title: '采样与重建', range: [0, end], series: [line('3 kHz 输入', M.sample(original, 0, end, 1000), { dash: '7 4' }), line('重建信号', M.sample(rebuilt, 0, end, 1000)), line('采样点', samples, { pointsOnly: true })] }],
        metrics: [metric('采样率', fs, 'Hz'), metric('混叠频率', alias, 'Hz'), metric('混叠幅度', transfer.ratio)], readings: { sampleRate: fs, candidate: alias, sampleDifference: Math.max(...samples.map(([t, y]) => Math.abs(y - rebuilt(t)))), reconstructionError: Math.max(...M.sample(t => Math.abs(original(t) - rebuilt(t)), 0, end).map(([, y]) => y)), aliasing: true, aliasFrequency: alias, aliasedAmplitude: transfer.ratio, filterOrder: Number(p.filterOrder), filterCutoff: p.filterCutoff },
        formula: 'f₀=3000 Hz；fs=4000 Hz；|f₀−fs|=1000 Hz', note: '滤波作用于采样之前。播放保持相同增益，滤波后干扰衰减，不作响度归一化。' };
    }
    if (id === 'L3-2') {
      const initial = Number(p.initial), response = M.response(1, initial), C = L.answerNumber(answers, 'C'), D = L.answerNumber(answers, 'D');
      const checks = [['hShift', 1, 'H 分母'], ['xGain', 1, 'X 分子'], ['C', 1, 'C'], ['D', initial - 1, 'D'], ['b0', initial, '初始项']];
      const answerFeedback = checks.map(([key, expected, label]) => feedback(key, L.answerNumber(answers, key), expected, label));
      const baseline = M.response(1, 0); let t90 = null;
      for (let i = 1; i < baseline.numerical.length; i++) if (baseline.numerical[i][1] >= 0.9) { const [t, y] = baseline.numerical[i], [a, b] = baseline.numerical[i - 1]; t90 = a + (0.9 - b) * (t - a) / (y - b); break; }
      return { plots: [{ key: 'main', title: '解析与数值响应', range: [0, 5], marker: p.measureTime, series: [line('系统响应 · RK4', response.numerical.filter((_, i) => i % 5 === 0)), ...(C === null || D === null ? [] : [line('学生解析式', M.sample(t => C + D * Math.exp(-t), 0, 5), { dash: '7 4' })])] }, { key: 'decomposition', title: '响应分解', range: [0, 5], series: [line('零输入', M.sample(response.zeroInput, 0, 5)), line('零状态', M.sample(response.zeroState, 0, 5))] }],
        metrics: [metric('初始值', initial), metric('数值响应 y(t)', M.at(response.numerical, p.measureTime)), metric('数值 t90', t90, 's'), metric('分解最大差', response.error)],
        readings: { initial, initialValue: initial, decompositionError: response.error, yAtTime: M.at(response.numerical, p.measureTime), measureTime: p.measureTime, t90, answerStatus: answerFeedback, studentExpression: C === null || D === null ? '' : `y=${C}+(${D})e^(−t)` }, answerFeedback,
        formula: 'sY−y₀+Y=1/s；(s+1)Y=1/s+b₀；Y=C/s+D/(s+1)', note: 't90 对应零初值的阶跃响应。' };
    }
    if (id === 'L3-3') {
      const r = M.secondOrder(p.zeta, p.omegaN), passed = r.stable && r.overshoot <= 15 && r.settlingTime !== null && r.settlingTime <= 3;
      const frequency = w => { const denominator = Math.hypot(p.omegaN ** 2 - w * w, 2 * p.zeta * p.omegaN * w); return denominator < 1e-12 ? null : p.omegaN ** 2 / denominator; };
      const answerFeedback = [['zeta', p.zeta, 'ζ'], ['omegaN', p.omegaN, 'ωₙ']].map(([key, expected, label]) => feedback(key, L.answerNumber(answers, key), expected, label));
      return { plots: [{ key: 'main', title: '阶跃响应', range: [0, r.end], marker: Math.min(p.measureTime, r.end), series: [line('RK4', r.numerical.filter((_, i) => i % 5 === 0)), line('解析', M.sample(t => secondOrderValue(p.zeta, p.omegaN, t), 0, r.end), { dash: '7 4' }), line('2% 上界', [[0, 1.02], [r.end, 1.02]], { dash: '2 5' }), line('2% 下界', [[0, 0.98], [r.end, 0.98]], { dash: '2 5' })] },
        { key: 'frequency', title: '频率响应', range: [0, 12], xUnit: 'rad/s', xLabel: 'ω / rad/s', yLabel: '|H(jω)|', series: [line('|H|', M.sample(w => frequency(w), 0, 12, 1000))] }], poles: r.poles,
        metrics: [metric('超调', r.overshoot, '%'), metric('调节时间（2%）', r.settlingTime, 's'), metric('稳定性', p.zeta > 0 ? '稳定' : p.zeta === 0 ? '临界稳定' : '不稳定'), metric('设计指标', passed ? '达标' : '未达标')],
        readings: { zeta: p.zeta, omegaN: p.omegaN, overshoot: r.overshoot, settlingTime: r.settlingTime, stable: r.stable, passed, measureTime: p.measureTime, yAtTime: M.at(r.numerical, Math.min(p.measureTime, r.end)), numericalError: r.error, answerStatus: answerFeedback }, answerFeedback,
        formula: 'y″+2ζωₙy′+ωₙ²y=ωₙ²u(t)；y(0)=y′(0)=0', note: '调节时间取进入 2% 误差带后不再离开的时刻；未在 120 s 内收敛时记为 —。不稳定系统的频率曲线只表示代数表达式。' };
    }
    return priorScene(id, p, answers);
  };
  let audioContext, playing, audioRequest = 0;
  L.audioSamples = (p, original = false) => {
    const rate = 48000, frequency = original ? 3000 : 1000;
    const transfer = !original && p.antiAlias === 'on' ? butterworth(Number(p.filterOrder), p.filterCutoff, 3000) : { ratio: 1, phase: 0 };
    return { sampleRate: rate, samples: Float32Array.from({ length: rate * 2 }, (_, i) => 0.15 * transfer.ratio * Math.cos(TAU * frequency * i / rate + (original ? 0 : -transfer.phase)) * Math.min(1, i / 240, (rate * 2 - 1 - i) / 240)) };
  };
  L.stopAudio = () => { audioRequest++; if (playing) { playing.stop(); playing.disconnect(); playing = null; } };
  L.playAudio = async (samples, sampleRate) => {
    if (typeof globalThis.AudioContext !== 'function') throw Error('浏览器不支持音频播放');
    L.stopAudio(); const request = audioRequest; audioContext ??= new globalThis.AudioContext(); await audioContext.resume();
    if (request !== audioRequest) return;
    const buffer = audioContext.createBuffer(1, samples.length, sampleRate); buffer.copyToChannel(samples, 0);
    const source = audioContext.createBufferSource(); source.buffer = buffer; source.connect(audioContext.destination); source.start(); playing = source;
    source.onended = () => { source.disconnect(); if (playing === source) playing = null; };
  };
}

// Archive the five changed tasks verbatim. Their original parameters, plots,
// predictions, Python runs and completion flags remain available and exportable.
export function validateLegacyArchive(archive) {
  if (!archive || archive.appVersion !== '1.0.0' || !archive.tasks || Object.keys(archive.tasks).length !== changedIDs.length || changedIDs.some(id => !Object.hasOwn(archive.tasks, id))) throw Error('历史记录无效');
  const legacy = createLegacyEngine(), doc = clone(legacy.records.data);
  Object.assign(doc.tasks, archive.tasks);
  const clean = legacy.records.validate(doc);
  return { appVersion: '1.0.0', tasks: Object.fromEntries(changedIDs.map(id => [id, clean.tasks[id]])) };
}
export function migrateLabDocument(raw, L, fresh) {
  const legacy = createLegacyEngine(), old = legacy.records.validate(raw);
  Object.assign(fresh, { createdAt: old.createdAt, updatedAt: old.updatedAt, student: clone(old.student) });
  for (const id of L.taskIds) if (!changedIDs.includes(id)) fresh.tasks[id] = clone(old.tasks[id]);
  fresh.legacyArchive = { appVersion: '1.0.0', tasks: Object.fromEntries(changedIDs.map(id => [id, clone(old.tasks[id])])) };
  for (const id of changedIDs.filter(id => id !== 'L3-3')) {
    const source = old.tasks[id], target = fresh.tasks[id];
    for (const key of ['prediction', 'predictionDraft', 'revisions', 'derivation', 'analysis']) target[key] = clone(source[key]);
    const convertParams = p => id === 'L1-2' ? { ...L.defaults(id), kind: p.kind === 'gain' ? 'delay' : p.kind === 'varying' ? 'timescale' : p.kind } : { ...L.defaults(id), ...p };
    target.params = convertParams(source.params);
    if (id === 'L1-2') continue;
    const convertTrial = (trial, sourceID = id) => {
      const params = { ...L.defaults(id), ...trial.params };
      const answers = { ...L.defaultAnswers(id), ...trial.answers };
      if (id === 'L3-2') {
        params.initial = sourceID === 'L3-3' ? trial.params.initial : '0';
        delete answers.initialTerm; answers.b0 = sourceID === 'L3-3' ? trial.answers.initialTerm : '0';
        if (sourceID === 'L3-3') { answers.hShift = '1'; answers.xGain = '1'; }
      }
      const scene = L.scene(id, params, answers);
      return { ...clone(trial), params, answers, measurements: { ...scene.readings, ...(id !== 'L2-3' && trial.measurements.observation ? { observation: clone(trial.measurements.observation) } : {}) }, window: scene.plots.map(({ key, range }) => ({ key, range })) };
    };
    target.answers = { ...L.defaultAnswers(id), ...source.answers };
    if (id === 'L3-2') target.answers.b0 = '0';
    target.trials = source.trials.map(t => convertTrial(t));
    if (id === 'L3-2') target.trials.push(...old.tasks['L3-3'].trials.map(t => convertTrial(t, 'L3-3')));
    target.trials = target.trials.sort((a, b) => Date.parse(a.time) - Date.parse(b.time)).slice(-200);
    target.figures = target.trials.map(t => ({ params: clone(t.params), answers: clone(t.answers), time: t.time }));
  }
  return fresh;
}
