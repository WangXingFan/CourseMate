(function (root) {
  'use strict';
  const Lab = root.SignalLab, M = Lab.models, f = Lab.format;
  const series = (label, points, extra = {}) => ({ label, points, ...extra });
  const metric = (label, value, unit = '') => ({ label, value: typeof value === 'number' ? f(value, 6) : value, unit });
  Lab.scene = function (id, params) {
    const plots = [], metrics = [], readings = {};
    let formula = '', note = '';
    if (id === 'L1-1') {
      if (params.mode === 'transform') {
        const t = M.transform(params);
        const lo = Math.min(-0.5, t.support[0] - 0.5), hi = Math.max(3.5, t.support[1] + 0.5);
        const exact = [[lo, 0], [t.support[0], 0], [t.peakTime, t.peak], [t.support[1], 0], [hi, 0]].sort((a, b) => a[0] - b[0]);
        plots.push({ key: 'main', title: '原信号、目标与当前结果', range: [lo, hi], series: [series('当前结果', exact, { fill: true }), series('原信号 p(t)', [[lo, 0], [0, 0], [1, 1], [3, 0], [hi, 0]], { dash: '7 4' }), series('目标波形', [[lo, 0], [1, 0], [1.5, 2], [2.5, 0], [hi, 0]], { dash: '2 5' })] });
        metrics.push(metric('支撑起点', t.support[0], 's'), metric('支撑终点', t.support[1], 's'), metric('峰值时刻', t.peakTime, 's'), metric('峰值幅度', t.peak));
        Object.assign(readings, { supportStart: t.support[0], supportEnd: t.support[1], peakTime: t.peakTime, peak: t.peak });
        formula = `${f(params.A)} · p(${f(params.a)}(t − (${f(params.shift)})))`;
        note = '原信号：0≤t<1 时 p(t)=t；1≤t≤3 时 p(t)=(3−t)/2；其余为 0。图窗自动覆盖完整支撑。';
      } else {
        const d = params.delta;
        plots.push({ key: 'main', title: '面积为 1 的窄脉冲近似', range: [-0.15, 0.8], series: [series('qΔ(t) · 近似脉冲', [[-0.15, 0], [0, 0], [0, 1 / d], [d, 1 / d], [d, 0], [0.8, 0]], { fill: true })] });
        const n = Math.ceil(d / 0.001), dt = d / n;
        let area = 0;
        for (let i = 0; i < n; i++) area += dt / d;
        metrics.push(metric('脉冲宽度 Δ', d, 's'), metric('脉冲高度', 1 / d), metric('解析面积', 1, '幅度·s'), metric('数值面积', area, '幅度·s'));
        Object.assign(readings, { width: d, height: 1 / d, analyticArea: 1, numericalArea: area });
        formula = `qΔ(t) = 1/Δ，0 ≤ t < Δ；其余为 0`;
        note = '有限高度的窄脉冲是 δ(t) 的近似。面积采用区间内中点求积；不对端点重复计数。';
      }
    }
    if (id === 'L1-2') {
      const c = M.compare(params);
      const linear = params.test === 'linearity';
      plots.push({ key: 'main', title: '两条路径的输出对照', range: [-2, 5], series: [series('路径 A', c.a), series('路径 B', c.b, { dash: '7 4' })] });
      plots.push({ key: 'difference', title: '逐点差异 A − B', range: [-2, 5], series: [series('输出差异', c.difference, { fill: true })] });
      metrics.push(metric('最大绝对差', c.error), metric('本组试验', c.error < 1e-9 ? '两路径吻合' : '发现反例'), metric('检验窗口', '−2 → 5', 's'));
      Object.assign(readings, { maxDifference: c.error, comparison: c.error < 1e-9 ? 'equal-for-this-input' : 'counterexample', window: [-2, 5] });
      formula = linear ? 'A: T[αx₁+βx₂]　↔　B: αT[x₁]+βT[x₂]' : 'A: T[x(t−d)]　↔　B: y(t−d)，y=T[x]';
      note = '一个反例可以否定普遍命题；有限次吻合只说明本组输入一致。常数输入在全时域定义，不使用窗口补零。';
    }
    if (id === 'L1-3') {
      const A = params.enabled === 'on' ? params.A : 0;
      const response = M.response(A, params.initial);
      const thin = response.numerical.filter((_, i) => i % 5 === 0);
      plots.push({ key: 'main', title: '零输入、零状态与全响应', range: [0, 5], series: [series('全响应 · RK4', thin, { fill: true }), series('零输入响应', M.sample(response.zeroInput, 0, 5), { dash: '7 4' }), series('零状态响应', M.sample(response.zeroState, 0, 5), { dash: '2 5' })] });
      metrics.push(metric('全响应初值', params.initial), metric('长期结果', A), metric('分解最大误差', response.error < 1e-9 ? response.error.toExponential(2) : response.error), metric('初始变化方向', A > params.initial ? '上升' : A < params.initial ? '下降' : '保持不变'));
      Object.assign(readings, { initial: params.initial, limit: A, decompositionError: response.error, atTimes: [0, 1, 3, 5].map(t => ({ t, zeroInput: response.zeroInput(t), zeroState: response.zeroState(t), total: M.at(response.numerical, t) })) });
      formula = 'y′(t) + y(t) = x(t)；y(0⁻) = ' + f(params.initial);
      note = '全响应由独立 RK4 积分计算（Δt≤0.001 s）；零输入与零状态响应采用解析路径，分解误差在 0–5 s 内逐点比较。5 s 之后仍有响应，曲线接近长期值，不代表已精确到达。';
    }
    if (id === 'L1-4') {
      const { kind, time } = params;
      const second = tau => kind === 'rr' ? M.r(time - tau) : M.h(time - tau);
      const isRect = kind === 'rr';
      const lo = Math.max(0, isRect ? time - 1 : 0), hi = Math.min(1, time);
      const overlap = hi > lo;
      const range = [-2, 5.2];
      const a = [[-2, 0], [0, 0], [0, 1], [1, 1], [1, 0], [5.2, 0]];
      const b = isRect ? [[-2, 0], [time - 1, 0], [time - 1, 1], [time, 1], [time, 0], [5.2, 0]] : M.sample(second, ...range, 1000);
      const product = overlap ? [[lo, 0], [lo, second(lo + 1e-9)], ...M.sample(second, lo + 1e-9, hi - 1e-9, 150), [hi, second(hi - 1e-9)], [hi, 0]] : [[0, 0], [1, 0]];
      plots.push({ key: 'overlap', title: '翻转、平移与乘积阴影', range, xLabel: '积分变量 τ / s', series: [series('r(τ)', a, { dash: '7 4' }), series(isRect ? 'r(t−τ)' : 'h(t−τ)', b, { dash: '2 5' }), series('乘积区域', product, { fill: true, color: '#8b6b46' })] });
      const reference = t => isRect ? t >= 0 && t <= 1 ? t : t > 1 && t <= 2 ? 2 - t : 0 : M.g(t) - M.g(t - 1);
      if (!Lab.convolutionCurves) Lab.convolutionCurves = {};
      if (!Lab.convolutionCurves[kind]) Lab.convolutionCurves[kind] = { numerical: M.sample(t => M.convolve(t, kind), -1, 5, 600), reference: M.sample(reference, -1, 5, 600) };
      const curve = Lab.convolutionCurves[kind];
      plots.push({ key: 'output', title: '卷积输出 · 数值积分与解析对照', range: [-1, 5], series: [series('数值卷积', curve.numerical, { fill: true }), series('解析对照', curve.reference, { dash: '5 5' })], marker: time });
      const value = M.convolve(time, kind);
      metrics.push(metric('输出时刻 t', time, 's'), metric('重叠区间', overlap ? `[${f(lo)}, ${f(hi)}]` : '无重叠', 's'), metric('乘积积分值', value), metric('解析对照差', Math.abs(value - reference(time)) < 1e-9 ? Math.abs(value - reference(time)).toExponential(2) : Math.abs(value - reference(time))));
      Object.assign(readings, { time, overlap: overlap ? [lo, hi] : null, integral: value, reference: reference(time), error: Math.abs(value - reference(time)) });
      formula = 'y(t) = ∫ r(τ) · ' + (isRect ? 'r(t−τ)' : 'h(t−τ)') + ' dτ';
      note = '阴影表示乘积面积。数值积分在真实重叠区间采用中点求积（Δτ≤0.001 s）；完整输出曲线已缓存。指数信号有无限长尾，图窗外未显示的部分不代表零。';
    }
    return { plots, metrics, readings, formula, note };
  };
})(typeof window !== 'undefined' ? window : globalThis);
