import assert from 'node:assert/strict';
import test from 'node:test';
import { createVirtualLabEngine } from '../public/vendor/signal-lab/legacy-v1.1.mjs';
import { createVirtualLabEngine as createLegacyEngine } from '../public/vendor/signal-lab/legacy-v1.mjs';
import { labAnswers } from './virtual-lab-fixtures.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const close = (a, b, tolerance = 1e-7) => assert.ok(Math.abs(a-b) <= tolerance, `${a} != ${b}`);
const changed = ['L1-2', 'L2-3', 'L2-4', 'L3-2', 'L3-3'];

test('counterexample records are parsed, checked against parameters and recomputed', () => {
  const e = createVirtualLabEngine(), p = e.defaults('L1-2');
  const valid = labAnswers('L1-2', p);
  assert.equal(e.scene('L1-2', p, valid).answerFeedback[0].status, 'correct');
  for (const evidence of ['', 'x1=step; x2=step; alpha=0; beta=1', 'x1=step; x2=step; alpha=1; alpha=1', 'x1=step; x2=step; alpha=1; beta=1; extra=1']) {
    assert.notEqual(e.scene('L1-2', p, { evidence }).answerFeedback[0].status, 'correct');
  }
  assert.equal(e.validAnswers('L1-2', { evidence: 'x'.repeat(101) }), false);
});

test('Butterworth designs use independent numerical amplitude and phase measurements', () => {
  const e = createVirtualLabEngine(), M = e.models;
  const ranges = [1,2,3].map(order => M.cutoffInterval(order));
  assert.ok(ranges[0][0] > ranges[0][1]);
  assert.ok(ranges[1][0] > 174 && ranges[1][0] < 175);
  assert.ok(ranges[1][1] > 223 && ranges[1][1] < 224);
  for (const order of [1,2,3]) for (const fc of [50,100,200,316,500,2000]) {
    const r = M.filter(fc, 1e-5, order);
    for (const [i, c] of r.fit.components.entries()) {
      const f = [100,1000][i], ratio = 1/Math.sqrt(1+(f/fc)**(2*order));
      close(c.ratio, ratio, 1e-5);
      const phaseError = (c.phase-r.theory[i].phase*180/Math.PI)*Math.PI/180;
      close(Math.sin(phaseError), 0, 1e-3);
      assert.ok(Math.cos(phaseError) > 0);
    }
    assert.equal(r.passed, order >= 2 && fc === 200 || order === 3 && fc === 316);
  }
});

test('audio aliases match every sample and preserve filter attenuation at a fixed gain', () => {
  const e = createVirtualLabEngine(), p = { ...e.defaults('L2-4'), mode: 'audio', fs: '4000' };
  assert.equal(e.validParams('L2-4', { ...p, fs: '15' }), false);
  assert.equal(e.validParams('L2-4', { ...p, mode: 'base' }), false);
  for (const antiAlias of ['off','on']) {
    p.antiAlias = antiAlias;
    const s = e.scene('L2-4', p);
    close(s.readings.aliasFrequency,1000); close(s.readings.sampleDifference,0,1e-12);
    const expected = antiAlias === 'on' ? 1/Math.sqrt(1+15**4) : 1;
    close(s.readings.aliasedAmplitude,expected);
    const audio = e.audioSamples(p), original = e.audioSamples(p,true);
    assert.equal(audio.sampleRate,48000); assert.equal(audio.samples.length,96000);
    assert.ok(Math.max(...audio.samples) <= 0.15*expected+1e-8);
    close(Math.max(...original.samples),0.15,1e-7);
    close(audio.samples[0],0); close(audio.samples.at(-1),0);
  }
});

test('second-order numerical responses cover stable, marginal and unstable poles', () => {
  const e = createVirtualLabEngine();
  for (const zeta of [-0.5,-0.2,0,0.01,0.3,0.6,1,1.5,2]) for (const omegaN of [0.5,3,6]) {
    const r = e.models.secondOrder(zeta,omegaN);
    assert.equal(r.stable,zeta>0); assert.ok(r.error < 1e-7 + 1e-8*Math.max(...r.numerical.map(([,y])=>Math.abs(y))));
    close(r.poles.reduce((s,p)=>s+p.re,0),-2*zeta*omegaN);
    if (zeta <= 0) assert.equal(r.settlingTime,null);
    if (zeta === 0) for (const [t,y] of r.numerical.filter((_,i)=>i%250===0)) close(y,1-Math.cos(omegaN*t),1e-7);
    if (zeta === 1) for (const [t,y] of r.numerical.filter((_,i)=>i%250===0)) close(y,1-(1+omegaN*t)*Math.exp(-omegaN*t));
  }
  const design = e.scene('L3-3',{zeta:0.6,omegaN:3,measureTime:1});
  assert.equal(design.readings.passed,true);
  close(design.readings.overshoot,100*Math.exp(-0.75*Math.PI));
  close(design.readings.settlingTime,1.980995,1e-5);
  const resonant = e.scene('L3-3',{zeta:0,omegaN:3,measureTime:1});
  assert.ok(resonant.plots[1].series[0].points.some(([,y])=>y===null));
});

test('stopping audio cancels a pending resume and repeated stops are safe', async () => {
  const original = globalThis.AudioContext;
  let resume, starts = 0, stops = 0;
  globalThis.AudioContext = class {
    resume() { return new Promise(resolve=>{resume=resolve;}); }
    createBuffer() { return {copyToChannel(){}}; }
    createBufferSource() { return {connect(){},disconnect(){},start(){starts++;},stop(){stops++;}}; }
  };
  try {
    const e = createVirtualLabEngine();
    const cancelled = e.playAudio(new Float32Array(10),48000);
    e.stopAudio(); resume(); await cancelled; assert.equal(starts,0);
    const playing = e.playAudio(new Float32Array(10),48000);
    resume(); await playing; assert.equal(starts,1);
    e.stopAudio(); e.stopAudio(); assert.equal(stops,1);
  } finally {
    if (original === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = original;
  }
});

test('v1 migration archives all original evidence and starts a separate second-order task', () => {
  const previous = createLegacyEngine();
  for (const id of previous.taskIds) {
    const t = previous.records.data.tasks[id];
    t.predictionDraft = `${id} prediction`; previous.records.prediction(id);
    t.predictionDraft = `${id} revision`; previous.records.prediction(id);
    t.analysis = `${id} analysis`; t.derivation = `${id} derivation`;
    t.python.code = `print('${id}')`;
    previous.records.trial(id,previous.scene(id,t.params,t.answers),null);
    t.completion = {confirmed:true,confirmedAt:new Date().toISOString()};
  }
  const old = clone(previous.records.data), e = createVirtualLabEngine();
  const next = e.records.validate(old);
  assert.equal(next.appVersion,'1.1.0');
  for (const id of changed) assert.deepEqual(next.legacyArchive.tasks[id],old.tasks[id]);
  for (const id of e.taskIds.filter(id=>!changed.includes(id))) assert.deepEqual(next.tasks[id],old.tasks[id]);
  assert.equal(next.tasks['L1-2'].trials.length,0);
  assert.equal(next.tasks['L3-2'].trials.length,2);
  assert.equal(next.tasks['L3-3'].prediction,'');
  assert.equal(next.tasks['L3-3'].trials.length,0);
  for (const id of changed) assert.equal(next.tasks[id].completion.confirmed,false);
  assert.deepEqual(e.records.validate(clone(next)),next);
  e.records.import(next); const snapshot = JSON.stringify(e.records.data);
  for (const corrupt of [d=>delete d.legacyArchive.tasks['L1-2'],d=>{d.legacyArchive.tasks['L3-3'].params.initial='bad'},d=>{d.legacyArchive.tasks['L2-3'].python.code='x'.repeat(12001)}]) {
    const bad = clone(next); corrupt(bad); assert.throws(()=>e.records.import(bad));
    assert.equal(JSON.stringify(e.records.data),snapshot);
  }
});

test('merging first-order trials keeps the most recent 200 and the complete historical archive', () => {
  const previous = createLegacyEngine();
  for (const id of ['L3-2','L3-3']) {
    const t = previous.records.data.tasks[id];
    previous.records.trial(id,previous.scene(id,t.params,t.answers),null);
    const trial = clone(t.trials[0]);
    t.trials = Array.from({length:150},(_,i)=>({...clone(trial),time:new Date(Date.UTC(2026,0,1,0,0,i*2+(id==='L3-3'?1:0))).toISOString()}));
    t.figures=[];
  }
  const next = createVirtualLabEngine().records.validate(clone(previous.records.data));
  assert.equal(next.tasks['L3-2'].trials.length,200);
  assert.equal(next.tasks['L3-2'].trials[0].time,new Date(Date.UTC(2026,0,1,0,0,100)).toISOString());
  assert.equal(next.legacyArchive.tasks['L3-2'].trials.length,150);
  assert.equal(next.legacyArchive.tasks['L3-3'].trials.length,150);
});
