import assert from "node:assert/strict";
import test from "node:test";
import { combineSignals, DEFAULT_SOURCE, SAMPLE_DT, sampleSignal, signalValue, signalYDomain } from "../features/learning/model/signal-workbench.ts";

test("five signal families and half-open pulse boundaries", () => {
  assert.equal(signalValue({ ...DEFAULT_SOURCE, kind: "step" }, -1), 0);
  assert.equal(signalValue({ ...DEFAULT_SOURCE, kind: "step" }, 0), 1);
  assert.equal(signalValue(DEFAULT_SOURCE, -1), 1);
  assert.equal(signalValue(DEFAULT_SOURCE, 1), 0);
  assert.equal(signalValue({ ...DEFAULT_SOURCE, kind: "exponential" }, 1), Math.exp(-1));
  assert.ok(Math.abs(signalValue({ ...DEFAULT_SOURCE, kind: "sine" }, 0.25) - 1) < 1e-10);
  const pulse = sampleSignal({ ...DEFAULT_SOURCE, kind: "impulse", width: 0.1 });
  assert.ok(Math.abs(pulse.reduce((sum, [, y]) => sum + y * SAMPLE_DT, 0) - 1) < 1e-10);
});

test("reverse, scale, then shift convention", () => {
  const source = { ...DEFAULT_SOURCE, kind: "exponential", reversed: true, scale: 2, shift: 3 };
  assert.ok(Math.abs(signalValue(source, 1) - Math.exp(-1)) < 1e-10);
  assert.equal(signalValue(source, 4), 0);
  assert.equal(signalValue({ ...DEFAULT_SOURCE, shift: 2 }, 2), 1);
  assert.equal(signalValue({ ...DEFAULT_SOURCE, shift: 2 }, 0), 0);
});

test("six operations and full convolution axis with dt", () => {
  const a = sampleSignal(DEFAULT_SOURCE), b = sampleSignal({ ...DEFAULT_SOURCE, amplitude: 2 });
  const zero = a.findIndex(([t]) => t === 0);
  assert.equal(combineSignals(a,b,"a")[zero][1], 1);
  assert.equal(combineSignals(a,b,"b")[zero][1], 2);
  assert.equal(combineSignals(a,b,"add")[zero][1], 3);
  assert.equal(combineSignals(a,b,"subtract")[zero][1], -1);
  assert.equal(combineSignals(a,b,"multiply")[zero][1], 2);
  const convolution = combineSignals(a,a,"convolve");
  assert.equal(convolution.length, 2*a.length-1);
  assert.equal(convolution[0][0], -16);
  assert.equal(convolution.at(-1)[0], 16);
  assert.ok(Math.abs(Math.max(...convolution.map(([,y])=>y))-2) < 1e-10);
  assert.ok(Math.abs(convolution.reduce((sum,[,y])=>sum+y*SAMPLE_DT,0)-4) < 1e-10);
  assert.deepEqual(combineSignals(a,b,"convolve"),combineSignals(b,a,"convolve"));
});

test("invalid numeric inputs fail and zero signals have a finite plot range", () => {
  for(const value of [0,-1,NaN,Infinity]) assert.throws(()=>sampleSignal({...DEFAULT_SOURCE,scale:value}),RangeError);
  assert.throws(()=>sampleSignal({...DEFAULT_SOURCE, amplitude:Infinity}),RangeError);
  assert.throws(()=>combineSignals([[0,NaN]],[[0,0]],"add"),RangeError);
  assert.throws(()=>combineSignals([[0,0]],[[NaN,0]],"add"),RangeError);
  const zero = sampleSignal({...DEFAULT_SOURCE,amplitude:0});
  const [low,high] = signalYDomain([zero]);
  assert.ok(Number.isFinite(low)&&Number.isFinite(high)&&high>low);
});
