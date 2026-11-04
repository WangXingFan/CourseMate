import assert from "node:assert/strict";
import test from "node:test";
import { parseLabReading } from "../features/learning/model/virtual-lab-reading.ts";
import { LAB_FLOWS, validLabObservation } from "../features/learning/model/virtual-lab-flow.ts";

test("time readings accept units and ordinary mouse measurement error", () => {
  const step = LAB_FLOWS["L1-1"].steps[0];
  for (const value of ["1", "1s", "1秒", "1.0 s", "1.012s", "1000ms"]) {
    assert.equal(validLabObservation(step, { peakTime: 1 }, value), true, value);
  }
  for (const value of ["", "1Hz", "1秒之后", "1.2s", "Infinity", "1.0.1"]) {
    assert.equal(validLabObservation(step, { peakTime: 1 }, value), false, value);
  }
  assert.equal(parseLabReading("1kHz", "aliasFrequency"), 1000);
  assert.equal(parseLabReading("−1.57弧度", "phaseAtQuarter"), -1.57);
  assert.equal(parseLabReading("1s", "height"), null);
});
