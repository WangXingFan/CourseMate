import assert from 'node:assert/strict';
import test from 'node:test';
import { createVirtualLabEngine } from '../public/vendor/signal-lab/core.mjs';
import { createVirtualLabEngine as createPreviousEngine } from '../public/vendor/signal-lab/legacy-v1.1.mjs';
import { createVirtualLabEngine as createFirstEngine } from '../public/vendor/signal-lab/legacy-v1.mjs';
import { ecgValue, movingAverage, notchResponse, notchSignal } from '../public/vendor/signal-lab/phase-three.mjs';
import { labAnswers } from './virtual-lab-fixtures.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const close = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);

test('ECG is causal and repeatable; averaging agrees with independent trapezoidal integration', () => {
  assert.equal(ecgValue(-0.1), 0);
  for (const t of [.1, .2, .37, .4, .43, .65, .91]) {
    close(ecgValue(t + 1), ecgValue(t));
    close(ecgValue(t) - ecgValue(t, false), .2 * Math.sin(100 * Math.PI * t));
  }
  for (const width of [.02, .08]) {
    const t = .4 + width / 2, n = 8000, h = width / n;
    let sum = (ecgValue(t - width) + ecgValue(t)) / 2;
    for (let i = 1; i < n; i++) sum += ecgValue(t - width + i * h);
    const reference = sum * h / width;
    const coarse = Math.abs(movingAverage(t, width, .001) - reference);
    const fine = Math.abs(movingAverage(t, width, .0005) - reference);
    assert.ok(fine < coarse / 3);
    assert.ok(fine < .0001);
  }
});

test('first-order constraints conflict; stable notch measurements agree with the complex transfer', () => {
  assert.ok(10 / Math.sqrt(1 / .95 ** 2 - 1) > 50 / Math.sqrt(1 / .05 ** 2 - 1));
  const engine = createVirtualLabEngine();
  for (const [center, alpha] of [[50, 5], [50, 10], [50, 60], [48, 10]]) {
    const params = { ...engine.defaults('L2-3'), filterType: 'notch', center, alpha };
    const scene = engine.scene('L2-3', params, { minOrder: '2' });
    for (const item of scene.readings.components) {
      const w = 2 * Math.PI * item.frequency, w0 = 2 * Math.PI * center;
      const expected = Math.abs(w0*w0 - w*w) / Math.hypot(alpha*alpha + w0*w0 - w*w, 2*alpha*w);
      close(item.ratio, expected, .00015);
    }
    assert.equal(scene.readings.passed, center === 50);
    assert.equal(scene.answerFeedback[0].status, 'correct');
  }
  const misplaced = engine.scene('L2-3', { ...engine.defaults('L2-3'), filterType: 'notch', center: 48 });
  assert.ok(misplaced.readings.components[1].ratio > .5);
});

test('notch impulse transient, cancellation and unstable poles preserve finite portable evidence', () => {
  const engine = createVirtualLabEngine();
  for (const alpha of [-20, 0, 5, 80]) {
    const record = engine.records.data.tasks['L3-3'];
    record.params = { center: 50, alpha, measureTime: .5 };
    record.answers = labAnswers('L3-3', record.params);
    const scene = engine.scene('L3-3', record.params, record.answers);
    assert.equal(scene.readings.stable, alpha >= 0);
    assert.equal(scene.readings.passed, alpha === 5);
    assert.ok(scene.answerFeedback.every(item => item.status === 'correct'));
    assert.ok(scene.plots.flatMap(plot => plot.series).every(series => series.points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y))));
    if (alpha === 0) {
      close(notchResponse(50, alpha, 50).ratio, 1);
      for (const [t, y] of scene.plots[0].series[0].points) close(y, ecgValue(t));
    } else {
      close(scene.poles[0].re, -alpha);
      close(scene.poles[0].im, 100 * Math.PI);
      close(scene.zeros[0].re, 0);
    }
    engine.records.trial('L3-3', scene, null);
  }
  assert.doesNotThrow(() => engine.records.validate(clone(engine.records.data)));
  // A unit-step response is the integral of δ(t)+the stated decaying sinusoid.
  const points = notchSignal(() => 1, 50, 10, .5, .000125);
  for (const [t, y] of points.filter((_, i) => i % 100 === 0)) {
    const w = 100 * Math.PI, a = 10, dc = w*w/(a*a+w*w);
    const expected = dc + Math.exp(-a*t) * ((1-dc)*Math.cos(w*t) + (-2*a+a*(1-dc))/w*Math.sin(w*t));
    close(y, expected, 2e-8);
  }
});

test('phase-three migration archives changed tasks verbatim and rejects damaged archives atomically', () => {
  const previous = createPreviousEngine();
  for (const id of previous.taskIds) {
    const record = previous.records.data.tasks[id];
    record.predictionDraft = `${id} prediction`; previous.records.prediction(id);
    record.predictionDraft = `${id} revision`; previous.records.prediction(id);
    record.analysis = 'analysis'; record.derivation = 'derivation';
    record.python = { code: 'print(2)', result: { code: 'print(1)', params: clone(record.params), stdout: '1', stderr: '', plots: [], time: new Date().toISOString() } };
    previous.records.trial(id, previous.scene(id, record.params, record.answers), null);
    record.completion = { confirmed: true, confirmedAt: new Date().toISOString() };
  }
  const source = clone(previous.records.data), engine = createVirtualLabEngine(), next = engine.records.validate(source);
  assert.equal(next.appVersion, '1.2.0');
  for (const id of ['L1-4', 'L2-3', 'L3-3']) {
    assert.deepEqual(next.phaseTwoArchive.tasks[id], source.tasks[id]);
    assert.deepEqual(next.tasks[id].trials, []);
    assert.equal(next.tasks[id].prediction, '');
    assert.equal(next.tasks[id].completion.confirmed, false);
  }
  for (const id of engine.taskIds.filter(id => !Object.hasOwn(next.phaseTwoArchive.tasks, id))) assert.deepEqual(next.tasks[id], source.tasks[id]);
  assert.deepEqual(clone(previous.records.data), source);
  engine.records.import(next);
  const saved = clone(engine.records.data);
  assert.deepEqual(saved.tasks, next.tasks);
  for (const corrupt of [d => { d.phaseTwoArchive.tasks['L3-3'].params.zeta = 9; }, d => { delete d.phaseTwoArchive.tasks['L1-4']; }, d => { d.phaseTwoArchive.tasks['L2-3'].python.result.params.fc = -1; }]) {
    const broken = clone(next); corrupt(broken);
    assert.throws(() => engine.records.import(broken));
    assert.deepEqual(engine.records.data, saved);
  }
});

test('v1 imports preserve both archive generations and historical graphics', () => {
  const first = createFirstEngine(), current = createVirtualLabEngine();
  for (const id of ['L1-4', 'L3-3']) {
    const record = first.records.data.tasks[id];
    record.prediction = 'original prediction';
    first.records.trial(id, first.scene(id, record.params, record.answers), null);
  }
  const old = clone(first.records.data), upgraded = current.records.validate(old);
  assert.deepEqual(upgraded.legacyArchive.tasks['L3-3'], old.tasks['L3-3']);
  assert.deepEqual(upgraded.phaseTwoArchive.tasks['L1-4'], old.tasks['L1-4']);
  assert.deepEqual(current.records.validate(clone(upgraded)), upgraded);
  const record = upgraded.phaseTwoArchive.tasks['L1-4'];
  assert.ok(createPreviousEngine().scene('L1-4', record.params, record.answers).plots.length);
});
