(function (root) {
  'use strict';
  const Lab = root.SignalLab = root.SignalLab || {};
  const p = t => t >= 0 && t < 1 ? t : t >= 1 && t <= 3 ? (3 - t) / 2 : 0;
  const g = t => t < 0 ? 0 : -Math.expm1(-t);
  const h = t => t < 0 ? 0 : Math.exp(-t);
  const r = t => t >= 0 && t < 1 ? 1 : 0;
  const sample = (fn, lo, hi, count = 700) => Array.from({ length: count + 1 }, (_, i) => {
    const x = lo + (hi - lo) * i / count;
    return [x, fn(x)];
  });
  const maxError = (a, b) => Math.max(...a.map((v, i) => Math.abs(v[1] - b[i][1])));
  // Independent RK4 solution of y' = x - y; evaluate each smooth segment
  // separately so no RK4 stage crosses a known input discontinuity.
  function integrate(input, initial, end = 5, step = 0.001, boundaries = []) {
    let t = 0, y = initial;
    const result = [[0, y]];
    const cuts = [...boundaries.filter(v => v > 0 && v < end), end].sort((a, b) => a - b);
    for (const stop of cuts) {
      const start = t;
      const n = Math.ceil((stop - start) / step);
      const dt = (stop - start) / n;
      // Interior endpoint samples select this segment's one-sided input limit.
      const x = q => input(Math.min(stop - dt * 1e-7, Math.max(start + dt * 1e-7, q)));
      for (let i = 0; i < n; i++) {
        t = start + i * dt;
        const k1 = x(t) - y;
        const k2 = x(t + dt / 2) - (y + dt * k1 / 2);
        const k3 = x(t + dt / 2) - (y + dt * k2 / 2);
        const k4 = x(t + dt) - (y + dt * k3);
        y += dt * (k1 + 2 * k2 + 2 * k3 + k4) / 6;
        result.push([start + (i + 1) * dt, y]);
      }
      t = stop;
    }
    return result;
  }
  function at(data, t) {
    if (t <= data[0][0]) return data[0][1];
    if (t >= data[data.length - 1][0]) return data[data.length - 1][1];
    let lo = 0, hi = data.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (data[m][0] <= t) lo = m; else hi = m; }
    const [x0, y0] = data[lo], [x1, y1] = data[hi];
    return y0 + (y1 - y0) * (t - x0) / (x1 - x0);
  }
  const signal = (kind, t) => kind === 'sin' ? Math.sin(t) : kind === 'cos' ? Math.cos(2 * t) : 1;
  const system = (kind, t, x) => kind === 'square' ? x * x : kind === 'varying' ? t * x : 2 * x;
  function compare(params) {
    const { kind, test, x1, x2, alpha, beta, delay } = params;
    const left = t => test === 'linearity'
      ? system(kind, t, alpha * signal(x1, t) + beta * signal(x2, t))
      : system(kind, t, signal(x1, t - delay));
    const right = t => test === 'linearity'
      ? alpha * system(kind, t, signal(x1, t)) + beta * system(kind, t, signal(x2, t))
      : system(kind, t - delay, signal(x1, t - delay));
    const a = sample(left, -2, 5), b = sample(right, -2, 5);
    return { a, b, difference: a.map(([t, y], i) => [t, y - b[i][1]]), error: maxError(a, b), left, right };
  }
  // Midpoint quadrature on the actual intersection. No endpoint is counted twice.
  function convolve(t, kind, step = 0.001) {
    const lo = Math.max(0, kind === 'rr' ? t - 1 : 0), hi = Math.min(1, t);
    if (hi <= lo) return 0;
    const n = Math.ceil((hi - lo) / step), dt = (hi - lo) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) { const tau = lo + (i + 0.5) * dt; sum += r(tau) * (kind === 'rr' ? r(t - tau) : h(t - tau)); }
    return sum * dt;
  }
  function transform(params) {
    const { A, a, shift } = params;
    if (a === 0) throw new Error('尺度 a 不能为 0。');
    const ends = [shift, shift + 3 / a].sort((x, y) => x - y);
    return { support: ends, peakTime: shift + 1 / a, peak: A, value: t => A * p(a * (t - shift)) };
  }
  const responseCache = new Map();
  function response(A, initial) {
    const key = A + ':' + initial;
    if (!responseCache.has(key)) {
      if (responseCache.size > 40) responseCache.clear();
      const numerical = integrate(() => A, initial);
      const zeroInput = t => initial * Math.exp(-t);
      const zeroState = t => A * g(t);
      responseCache.set(key, {
        numerical, zeroInput, zeroState,
        total: t => A + (initial - A) * Math.exp(-t),
        error: Math.max(...numerical.map(([t, y]) => Math.abs(y - (zeroInput(t) + zeroState(t)))))
      });
    }
    return responseCache.get(key);
  }
  Lab.models = { p, g, h, r, sample, maxError, integrate, at, signal, system, compare, convolve, transform, response };
})(typeof window !== 'undefined' ? window : globalThis);
