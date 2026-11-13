import { createVirtualLabEngine as createPreviousEngine } from './legacy-v1.1.mjs';

const TAU = 2 * Math.PI;
const changed = ['L1-4', 'L2-3', 'L3-3'];
const clone = value => JSON.parse(JSON.stringify(value));
const number = (key, label, min, max, step, value, unit = '') => ({ key, label, min, max, step, value, unit, type: 'number' });
const select = (key, label, value, options) => ({ key, label, value, options, type: 'select' });
const answer = (key, label) => ({ key, label, placeholder: label, type: 'number' });
const line = (label, points, extra = {}) => ({ label, points, ...extra });

// Deterministic teaching waveform, one beat/s, normalized amplitude. These are
// Gaussian P/Q/R/S/T components, not a Dower lead transformation or clinical data.
export function ecgValue(t, interference = true) {
  if (t < 0) return 0;
  let value = 0.02 * Math.sin(TAU * 5 * t);
  for (let beat = Math.floor(t) - 1; beat <= Math.floor(t) + 1; beat++) {
    for (const [a, center, width] of [[0.12, 0.2, 0.04], [-0.15, 0.37, 0.012], [1, 0.4, 0.012], [-0.25, 0.43, 0.012], [0.3, 0.65, 0.07]]) {
      value += a * Math.exp(-0.5 * ((t - beat - center) / width) ** 2);
    }
  }
  return value + (interference ? 0.2 * Math.sin(TAU * 50 * t) : 0);
}
export function movingAverage(t, width, dt = 0.0005) {
  const n = Math.ceil(width / dt), step = width / n;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += ecgValue(t - (i + 0.5) * step);
  return sum / n;
}
export function notchResponse(center, alpha, frequency) {
  if (alpha === 0) return { ratio: 1, phase: 0 };
  const w0 = TAU * center, w = TAU * frequency;
  const a = w0 * w0 - w * w, b = a + alpha * alpha, c = 2 * alpha * w;
  const denominator = b * b + c * c;
  return { ratio: Math.abs(a) / Math.sqrt(denominator), phase: a === 0 ? null : Math.atan2(-a * c, a * b) };
}
// Independent integration of q''+2αq'+(α²+ω₀²)q=x,
// y=x−2αq'−α²q. v=q'/ω₀ keeps the state well scaled.
export function notchSignal(input, center, alpha, end = 2, dt = 0.00025) {
  const w0 = TAU * center, n = Math.ceil(end / dt), h = end / n;
  let q = 0, v = 0;
  const derivative = (t, x, velocity) => [w0 * velocity, (input(t) - (alpha * alpha + w0 * w0) * x) / w0 - 2 * alpha * velocity];
  const points = [[0, input(0)]];
  for (let i = 0; i < n; i++) {
    const t = i * h, a = derivative(t, q, v), b = derivative(t + h / 2, q + h * a[0] / 2, v + h * a[1] / 2);
    const c = derivative(t + h / 2, q + h * b[0] / 2, v + h * b[1] / 2), d = derivative(t + h, q + h * c[0], v + h * c[1]);
    q += h * (a[0] + 2 * b[0] + 2 * c[0] + d[0]) / 6;
    v += h * (a[1] + 2 * b[1] + 2 * c[1] + d[1]) / 6;
    points.push([(i + 1) * h, input((i + 1) * h) - 2 * alpha * w0 * v - alpha * alpha * q]);
  }
  return points;
}
function lowpassSignal(input, fc, end = 2, dt = 0.00025) {
  const n = Math.ceil(end / dt), h = end / n, k = Math.exp(-TAU * fc * h);
  let y = 0;
  const points = [[0, 0]];
  for (let i = 1; i <= n; i++) { y = k * y + (1 - k) * input((i - 0.5) * h); points.push([i * h, y]); }
  return points;
}
function measuredRatio(center, alpha, frequency, fc) {
  const end = Math.max(2, Math.ceil(1 + 12 / (fc === undefined ? alpha : TAU * fc))), input = t => Math.sin(TAU * frequency * t);
  const points = fc === undefined ? notchSignal(input, center, alpha, end) : lowpassSignal(input, fc, end);
  const tail = points.slice(-Math.round(1 / points[1][0]));
  let sine = 0, cosine = 0;
  for (const [t, y] of tail) { sine += y * Math.sin(TAU * frequency * t); cosine += y * Math.cos(TAU * frequency * t); }
  return { ratio: 2 * Math.hypot(sine, cosine) / tail.length, phase: Math.atan2(cosine, sine) * 180 / Math.PI };
}

export function installPhaseThree(L) {
  const priorScene = L.scene, priorRequired = L.requiredMeasurements, M = L.models;
  L.version = '1.2.0';
  M.ecg = ecgValue; M.movingAverage = movingAverage; M.notchResponse = notchResponse; M.notchSignal = notchSignal;
  Object.assign(L.tasks['L1-4'], { title: '卷积与心电滑动平均', short: '心电卷积', question: '比较两种平均窗，哪种既减少波纹，又更能保住 R 波？', goal: '先看干扰与心电变化，再移动取样窗口，判断时间关系。', prediction: '根据已观察的图形完成判断。', analysis: '保存干扰、R 波和窗口时间关系三项观察。', evidence: '两种干扰平均窗、两种心电平均窗、移动取样窗口及三项判断。',
    params: [select('kind', '卷积对象', 'rr', [['rr', '矩形 * 矩形'], ['ecg', '心电 * 平均窗']]), number('time', '观察时刻 t', -1, 4, 0.01, 0.5, 's'), number('width', '平均窗 W', 0.01, 0.2, 0.01, 0.02, 's')],
    hints: ['平均窗 h(t) 在 0≤t<W 内为 1/W。', '画出 x(τ)h(t−τ)，再对 τ 积分。', 'W/2 是线性相位延迟；复杂波形的峰值偏移未必恰好等于 W/2。'] });
  Object.assign(L.tasks['L2-3'], { title: '心电工频陷波设计', short: '心电陷波', question: '怎样去掉 50 Hz 工频干扰并保留心电信号？', goal: '保留 10 Hz 幅度比≥0.95，抑制 50 Hz 幅度比≤0.05。', prediction: '一阶低通能同时满足保留与抑制指标吗？', analysis: '用幅度约束说明一阶低通无解；设计二阶陷波并解释带宽与心电失真。', evidence: '两组一阶对照、达标陷波与较宽陷波比较。',
    params: [select('filterType', '滤波器', 'lowpass', [['lowpass', '一阶低通'], ['notch', '二阶陷波']]), number('fc', '低通截止频率', 1, 100, 1, 20, 'Hz'), number('center', '陷波中心 f₀', 40, 60, 0.1, 50, 'Hz'), number('alpha', '极点衰减 α', 1, 80, 1, 10, 's⁻¹')], answers: [answer('minOrder', '最低可行阶数')],
    hints: ['把 R(10)≥0.95、R(50)≤0.05 分别换成截止频率约束。', '陷波零点应对准干扰频率。', '比较不同 α 对频带与 R 波形状的影响。'] });
  Object.assign(L.tasks['L3-3'], { title: '心电陷波零极点', short: '陷波零极点', question: '陷波零点与极点分别决定什么？', goal: '零点对准 50 Hz；在稳定前提下兼顾抑制与保真。', prediction: '预测零点频率、极点实部对陷波与暂态的影响。', analysis: '推导零极点及因果 ROC，解释 α 对衰减、带宽和暂态的影响。', evidence: '窄带、宽带、右半平面、稳定设计及同参数频响。',
    params: [number('center', '陷波中心 f₀', 40, 60, 0.1, 50, 'Hz'), number('alpha', '极点衰减 α', -20, 80, 1, 10, 's⁻¹'), number('measureTime', '测量时刻', 0, 0.5, 0.001, 0.2, 's')],
    answers: [answer('zeroFrequency', '零点频率 / Hz'), answer('poleReal', '极点实部 / s⁻¹'), answer('poleFrequency', '极点虚部 / 2π Hz')],
    hints: ['由分子 s²+ω₀² 求零点。', '由分母 (s+α)²+ω₀² 求极点；因果 ROC 在最右极点右侧。', '稳定时才可把 H(jω) 解释为稳态频率响应。'] });
  L.courses[0].objectives[3] = '用卷积解释心电滑动平均与延迟。';
  L.courses[1].objectives[2] = '设计去除 50 Hz 工频干扰的二阶陷波。';
  L.courses[2].objectives[2] = '联系心电陷波零极点、频响与稳定性。';
  L.courses[2].tags[2] = '陷波零极点';
  L.tasks['L2-4'].hints = ['音频采样前使用独立的 Butterworth 低通。', '50 Hz 心电陷波不能替代抗混叠低通。', '滤波前后保持相同播放增益。'];
  L.guides['L2-4'].steps[3] = '设置独立抗混叠低通，比较同增益下混叠幅度；心电陷波不用于本步骤。';
  const guides = {
    'L1-4': ['比较 10 / 20 ms 对单独 50 Hz 干扰的影响。', '比较 20 / 80 ms 对同一段心电 R 波的影响。', '拖动输出时刻，观察取样区间、窗口中心与输出时刻。', '完成三项判断后，用矩形平均窗联系卷积。'],
    'L2-3': ['比较一阶 fc=2、40 Hz。', '由两个约束说明一阶低通无解。', '选择陷波中心和 α，保存达标的二阶方案。', '比较 α=60 的宽陷波及心电形变。'],
    'L3-3': ['接入 L2-3 保存的陷波设计，推导零极点。', '比较 α=5、60 的暂态和频带。', '观察 α<0 时右半平面极点与发散。', '设计稳定且满足两个幅度指标的方案，再对照同参数频响。'],
  };
  for (const [id, steps] of Object.entries(guides)) L.guides[id] = { steps, evidence: L.tasks[id].evidence };
  L.requiredMeasurements = (id, p) => id === 'L1-4' && p.kind === 'ecg' ? ['time', 'integral', 'reference', 'error', 'delay'] : id === 'L2-3' ? ['cutoff', 'components', 'passed', 'answerStatus'] : id === 'L3-3' ? ['center', 'alpha', 'stable', 'passed', 'yAtTime', 'answerStatus'] : priorRequired(id, p);
  const cache = new Map();
  const result = (center, alpha, fc) => {
    const key = fc === undefined ? `${center}:${alpha}` : `lowpass:${fc}`;
    if (!cache.has(key)) {
      if (cache.size > 24) cache.clear();
      cache.set(key, { points: fc === undefined ? notchSignal(ecgValue, center, alpha) : lowpassSignal(ecgValue, fc), components: [10, 50].map(frequency => {
        const theoryRatio = fc === undefined ? notchResponse(center, alpha, frequency).ratio : 1 / Math.hypot(1, frequency / fc);
        const measured = measuredRatio(center, alpha, frequency, fc);
        return { frequency, ...measured, phase: theoryRatio === 0 ? null : measured.phase, theoryRatio };
      }) });
    }
    return cache.get(key);
  };
  const metric = (label, value, unit = '') => ({ label, value: typeof value === 'number' ? L.format(value, 6) : value, unit });
  const feedback = (key, expected, answers) => { const value = L.answerNumber(answers, key), label = L.tasks['L3-3'].answers.find(a => a.key === key)?.label || '最低可行阶数'; return { key, label, status: value === null ? 'missing' : Math.abs(value - expected) < 1e-8 ? 'correct' : 'review', message: value === null ? '尚未填写' : Math.abs(value - expected) < 1e-8 ? '一致' : '请核对' }; };
  L.scene = (id, p, answers = {}) => {
    if (id === 'L1-4') {
      if (p.kind === 'rr') return priorScene(id, p, answers);
      const integral = movingAverage(p.time, p.width), reference = movingAverage(p.time, p.width, 0.000125);
      const kernel = t => t > p.time - p.width && t <= p.time ? 1 / p.width : 0;
      return { plots: [
        { key: 'overlap', title: 'x(τ) 与 h(t−τ)', range: [p.time - p.width - 0.04, p.time + 0.04], xLabel: 'τ / s', series: [line('心电 x(τ)', M.sample(ecgValue, p.time - p.width - 0.04, p.time + 0.04, 800)), line('平均窗 h(t−τ)', [[p.time - p.width - 0.04, 0], [p.time - p.width, 0], [p.time - p.width, 1 / p.width], [p.time, 1 / p.width], [p.time, 0], [p.time + 0.04, 0]])] },
        { key: 'product', title: '乘积与面积', range: [p.time - p.width - 0.04, p.time + 0.04], xLabel: 'τ / s', series: [line('x(τ)h(t−τ)', M.sample(t => ecgValue(t) * kernel(t), p.time - p.width - 0.04, p.time + 0.04, 800), { fill: true })] },
        { key: 'output', title: '心电滑动平均', range: [0, 2], series: [line('含工频心电', M.sample(ecgValue, 0, 2, 2000), { dash: '7 4' }), line('滑动平均', M.sample(t => movingAverage(t, p.width), 0, 2, 2000)), line('洁净心电', M.sample(t => ecgValue(t, false), 0, 2, 2000), { dash: '3 3' })], marker: p.time }],
        metrics: [metric('乘积积分值', integral), metric('平均窗延迟', p.width / 2, 's')], readings: { time: p.time, integral, reference, error: Math.abs(integral - reference), delay: p.width / 2 }, formula: 'y(t)=1/W ∫₀ᵂ x(t−τ)dτ', note: '合成 P/Q/R/S/T 波形 + 0.2 sin(2π50t)；幅度归一化。' };
    }
    if (id !== 'L2-3' && id !== 'L3-3') return priorScene(id, p, answers);
    const isPole = id === 'L3-3', isNotch = isPole || p.filterType === 'notch', stable = !isNotch || p.alpha >= 0;
    const frequency = f => isNotch ? notchResponse(p.center, p.alpha, f) : { ratio: 1 / Math.hypot(1, f / p.fc), phase: -Math.atan(f / p.fc) };
    const response = !isNotch || p.alpha > 0 ? result(p.center, p.alpha, isNotch ? undefined : p.fc) : null;
    const components = response?.components || [10, 50].map(f => ({ frequency: f, ratio: frequency(f).ratio, theoryRatio: frequency(f).ratio, phase: (frequency(f).phase ?? 0) * 180 / Math.PI }));
    let points;
    if (response) points = response.points;
    else if (isNotch) points = notchSignal(ecgValue, p.center, p.alpha, 0.5);
    const passed = stable && components[0].ratio >= 0.95 && components[1].ratio <= 0.05;
    const answerFeedback = isPole ? [feedback('zeroFrequency', p.center, answers), feedback('poleReal', -p.alpha, answers), feedback('poleFrequency', p.center, answers)] : isNotch ? [feedback('minOrder', 2, answers)] : [];
    const end = points.at(-1)[0], poles = [{ re: -p.alpha, im: TAU * p.center }, { re: -p.alpha, im: -TAU * p.center }];
    return { ...(isPole ? { poles, zeros: [{ re: 0, im: TAU * p.center }, { re: 0, im: -TAU * p.center }] } : {}), plots: [
      { key: 'main', title: stable ? '心电滤波前后' : '非稳定系统的零状态响应', range: [0, end], series: [line('滤波输出', points.filter((_, i) => i % 4 === 0), { color: '#cf5b36', width: 2.6 }), line('含工频心电', M.sample(ecgValue, 0, end, Math.ceil(end * 1000)), { color: '#347565', dash: '2 3', width: 1.4, opacity: 0.78 }), line('洁净心电', M.sample(t => ecgValue(t, false), 0, end, Math.ceil(end * 1000)), { color: '#84729b', dash: '10 5', width: 2.8 })] },
      { key: 'frequency', title: stable ? '幅频响应' : 'H(jω) 代数截面（无稳态频响）', range: [0, 100], xUnit: 'Hz', xLabel: 'f / Hz', yLabel: '|H|', series: [line('|H(j2πf)|', M.sample(f => frequency(f).ratio, 0, 100, 1000))] },
      { key: 'transient', title: isNotch ? '暂态 h(t)−δ(t)' : '冲激响应 h(t)', range: [0, 0.5], series: [line('暂态', M.sample(t => !isNotch ? TAU * p.fc * Math.exp(-TAU * p.fc * t) : -Math.exp(-p.alpha * t) * (2 * p.alpha * Math.cos(TAU * p.center * t) - p.alpha * p.alpha / (TAU * p.center) * Math.sin(TAU * p.center * t)), 0, 0.5, 1500))] }],
      metrics: [metric(stable ? '10 Hz 幅度比' : '10 Hz 代数模', components[0].ratio), metric(stable ? '50 Hz 幅度比' : '50 Hz 代数模', components[1].ratio), metric('双项指标', passed ? '达标' : '未达标'), ...(isPole ? [metric('稳定性', p.alpha === 0 ? '约消后稳定，H=1' : stable ? '稳定' : '不稳定')] : [])],
      readings: { cutoff: p.fc ?? 0, center: p.center, alpha: p.alpha, components, passed, stable, measureTime: p.measureTime ?? 0, yAtTime: L.plot.read(line('', points), p.measureTime ?? 0), answerStatus: answerFeedback }, answerFeedback,
      formula: isNotch ? 'H(s)=(s²+ω₀²)/((s+α)²+ω₀²)' : 'H(s)=2πfc/(s+2πfc)', note: isNotch ? p.alpha === 0 ? 'α=0 时零极点完全约消，H=1，输入输出稳定，但不能抑制干扰。' : stable ? 'ω₀=2πf₀；幅度比由独立正弦探针测量，心电波形用于比较失真。' : '右半平面极点导致因果响应发散；H(jω) 仅为代数截面，不能解释为稳态幅度比。' : '一阶低通须同时满足 10 Hz 保留与 50 Hz 抑制。' };
  };
}

export function validatePhaseTwoArchive(archive) {
  if (!archive || archive.appVersion !== '1.1.0' || !archive.tasks || Object.keys(archive.tasks).length !== changed.length || changed.some(id => !Object.hasOwn(archive.tasks, id))) throw Error('阶段二历史记录无效');
  const previous = createPreviousEngine(), doc = clone(previous.records.data);
  Object.assign(doc.tasks, archive.tasks);
  const clean = previous.records.validate(doc);
  return { appVersion: '1.1.0', tasks: Object.fromEntries(changed.map(id => [id, clean.tasks[id]])) };
}
export function migratePhaseThree(raw, fresh) {
  const old = createPreviousEngine().records.validate(raw);
  Object.assign(fresh, { createdAt: old.createdAt, updatedAt: old.updatedAt, student: clone(old.student) });
  for (const id of Object.keys(old.tasks)) if (!changed.includes(id)) fresh.tasks[id] = clone(old.tasks[id]);
  if (old.legacyArchive) fresh.legacyArchive = clone(old.legacyArchive);
  fresh.phaseTwoArchive = { appVersion: '1.1.0', tasks: Object.fromEntries(changed.map(id => [id, clone(old.tasks[id])])) };
  return fresh;
}
