import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const app = fileURLToPath(new URL('../public/vendor/signal-lab/assets/js', import.meta.url));
for (const file of ['models','models-extra','tasks','tasks-extra','plotting','plotting-extra','experiment1','experiment2','experiment3']) require(path.join(app, `${file}.js`));
const L = globalThis.SignalLab, M = L.models;
const close = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance, `${a} ≠ ${b} (tol ${tolerance})`);

test('L1-1: transformed support, peak and negative-scale key points', () => {
  const t = M.transform({ A: 2, a: 2, shift: 1 });
  assert.deepEqual(t.support, [1, 2.5]); close(t.peakTime, 1.5); close(t.value(1.5), 2);
  const reverse = M.transform({ A: 1, a: -1, shift: 0 });
  assert.deepEqual(reverse.support, [-3, 0]); close(reverse.peakTime, -1); close(reverse.value(-1), 1);
  for (const a of [-4, -0.25, 0.25, 4]) {
    const p = { A: 2.3, a, shift: 2.75 }, s = L.scene('L1-1', { ...p, mode: 'transform', delta: 0.2 });
    const transform = M.transform(p), window = s.plots[0].range;
    assert.ok(window[0] < transform.support[0] && window[1] > transform.support[1]);
    close(transform.value(transform.peakTime), p.A);
  }
});
test('L1-1: unit-area pulses remain normalized at all required widths', () => {
  for (const delta of [0.5, 0.2, 0.1, 0.137]) {
    const scene = L.scene('L1-1', { ...L.defaults('L1-1'), mode: 'impulse', delta });
    close(scene.readings.numericalArea, 1, 0.005); close(scene.readings.height, 1 / delta);
  }
});
test('L1-2: gain and time-varying systems are linear; square yields a counterexample', () => {
  for (const kind of ['gain', 'varying']) for (const x1 of ['constant', 'sin', 'cos']) {
    const c = M.compare({ ...L.defaults('L1-2'), kind, x1, x2: 'cos', alpha: 1.3, beta: -0.7 });
    assert.ok(c.error < 1e-9);
  }
  close(M.compare({ ...L.defaults('L1-2'), kind: 'square' }).error, 2);
});
test('L1-2: both time-shift paths shift the time multiplier; constants cover all times', () => {
  for (const kind of ['gain', 'square']) for (const x1 of ['constant', 'sin', 'cos']) {
    assert.ok(M.compare({ ...L.defaults('L1-2'), test: 'invariance', kind, x1, delay: 1.7 }).error < 1e-9);
  }
  const c = M.compare({ ...L.defaults('L1-2'), test: 'invariance', kind: 'varying' });
  close(c.error, 1); close(c.left(-2), -2); close(c.right(-2), -3);
});
test('L1-3: independent RK4 agrees with analytic full response, including initial value', () => {
  for (const initial of [0, 0.5, 2, -1]) for (const A of [0, 1, 2.7]) {
    const numerical = M.integrate(() => A, initial);
    const error = Math.max(...numerical.map(([t, y]) => Math.abs(y - (A + (initial - A) * Math.exp(-t)))));
    assert.ok(error <= 1e-3); close(numerical[0][1], initial);
  }
  close(M.at(M.integrate(() => 1, 2), 1), 1 + Math.exp(-1), 1e-3);
});
test('L1-4: midpoint convolution has correct overlap, support and time origin', () => {
  const times = [-0.5, 0.5, 1, 1.5, 2.5], expected = [0, 0.5, 1, 0.5, 0];
  times.forEach((t, i) => { close(M.convolve(t, 'rr'), expected[i], 0.01); });
  for (const t of [0, 0.137, 0.5, 1, 1.137, 1.5, 2, 5]) close(M.convolve(t, 'rh'), M.g(t) - M.g(t - 1), 0.01);
});
test('integration and convolution converge when the step is halved, including unaligned boundary', () => {
  const results = [];
  for (const dt of [0.08, 0.04, 0.001, 0.0005]) {
    const T = 0.737;
    const y = M.integrate(t => t < T ? 1 : 0, 0, 5, dt, [T]);
    const integralError = Math.max(...y.map(([t, value]) => Math.abs(value - (M.g(t) - M.g(t - T)))));
    const convolutionError = Math.abs(M.convolve(1.137, 'rh', dt) - (M.g(1.137) - M.g(0.137)));
    results.push({ step: dt, pulseBoundary: T, integralError, convolutionError });
  }
  assert.ok(results[1].integralError < results[0].integralError);
  assert.ok(results[3].integralError <= 1e-3);
  assert.ok(results[1].convolutionError < results[0].convolutionError);
  assert.ok(results[3].convolutionError < results[2].convolutionError);
  console.log(`HALF_STEP_RESULTS ${JSON.stringify(results)}`);
});
test('all four task scenes expose finite readings and labeled series', () => {
  for (const id of ['L1-1', 'L1-2', 'L1-3', 'L1-4']) {
    const s = L.scene(id, L.defaults(id));
    assert.ok(s.plots.length && s.metrics.length && s.formula);
    for (const p of s.plots) for (const line of p.series) {
      assert.ok(line.label);
      assert.ok(line.points.every(point => point.length === 2 && point.every(Number.isFinite)));
    }
  }
  assert.equal(L.validParams('L1-1', { ...L.defaults('L1-1'), a: 0 }), false);
  assert.equal(L.validParams('L1-3', { ...L.defaults('L1-3'), A: Infinity }), false);
});

globalThis.window = globalThis;
globalThis.dispatchEvent = () => {};
require(path.join(app, 'records.js'));
test('record round-trip preserves original prediction, revisions, trials and analysis', () => {
  const R = L.records, t = R.data.tasks['L1-1'];
  t.predictionDraft = '原始预测'; R.prediction('L1-1');
  t.predictionDraft = '根据证据修正'; R.prediction('L1-1');
  t.analysis = '<script>不执行</script> & 解释';
  const scene = L.scene('L1-1', t.params);
  R.trial('L1-1', scene, null);
  const original = JSON.parse(JSON.stringify(R.data));
  R.import(original);
  assert.equal(R.data.tasks['L1-1'].prediction, '原始预测');
  assert.equal(R.data.tasks['L1-1'].revisions[0].text, '根据证据修正');
  assert.equal(R.data.tasks['L1-1'].trials.length, 1);
  assert.equal(R.data.tasks['L1-1'].analysis, original.tasks['L1-1'].analysis);
});
test('invalid imports do not alter existing records; types, ranges and size are checked', () => {
  const R = L.records, original = JSON.stringify(R.data);
  for (const corrupt of [
    d => { d.schemaVersion = 99; }, d => { d.appVersion = '9.9.9'; },
    d => { d.tasks['L1-1'].params.a = 0; }, d => { d.tasks['L1-3'].params.A = 'NaN'; },
    d => { d.tasks['L1-1'].analysis = 'a'.repeat(12001); },
    d => { d.tasks['L1-1'].trials[0].measurements.peak = Infinity; },
    d => { delete d.tasks['L1-1'].prediction; },
    d => { d.tasks['L1-2'].completion.confirmed = true; }
  ]) {
    const bad = JSON.parse(original); corrupt(bad); assert.throws(() => R.import(bad)); assert.equal(JSON.stringify(R.data), original);
  }
});
