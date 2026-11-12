import assert from "node:assert/strict";
import test from "node:test";
import { createVirtualLabEngine } from "../public/vendor/signal-lab/core.mjs";
import { ECG_EXERCISES, ECG_STATIONS, averagedInterference, ecgComplete, ecgObservationPassed, ecgObservationScene, ecgPlots, ecgWindow, readEcgObservation } from "../features/learning/model/virtual-lab-ecg.ts";
import { labTaskComplete } from "../features/learning/model/virtual-lab-flow.ts";

test("whole-period windows cancel isolated interference but the wider window damages the R wave", () => {
  for (const width of [10, 20, 80]) for (const time of [.201, .217, .242]) {
    const count = 4000, step = width / 1000 / count;
    let area = 0;
    for (let index = 0; index < count; index++) area += .2 * Math.sin(2 * Math.PI * 50 * (time - (index + .5) * step)) / count;
    assert.ok(Math.abs(area - averagedInterference(time, width)) < 1e-8);
    if (width !== 10) assert.ok(Math.abs(area) < 1e-12);
  }
  assert.ok(Math.abs(averagedInterference(.22, 10)) > .12);
  const peak = (width) => Math.max(...ecgPlots("shape", width)[1].series[1].points.map((point) => point[1]));
  assert.ok(peak(20) > .85);
  assert.ok(peak(80) < .3, "Noise cancellation does not imply preservation of R-wave height");
  assert.deepEqual(ecgPlots("shape", 20)[0], ecgPlots("shape", 80)[0], "Both settings receive the same ECG input and reference");
  for (const width of [20, 80]) {
    const first = ecgWindow(400, width), moved = ecgWindow(450, width);
    assert.equal(first.center, (first.start + first.end) / 2);
    assert.equal(first.end - first.center, width / 2);
    assert.equal(moved.center - first.center, 50);
    assert.equal(moved.lag, first.lag);
  }
});

test("practice needs observed comparisons and correct judgments, saves without a fabricated prediction", () => {
  const engine = createVirtualLabEngine(), record = engine.records.data.tasks["L1-4"];
  record.analysis = "Earlier notes";
  engine.records.trial("L1-4", engine.scene("L1-4", record.params), null);
  assert.equal(ecgComplete(record), false, "Old numeric trials do not substitute for the new observations");
  const save = (value) => {
    record.params = { ...engine.defaults("L1-4"), kind: "ecg", width: value.width / 1000, time: value.time / 1000 };
    engine.records.trial("L1-4", ecgObservationScene(engine, value), null);
  };
  for (const station of ECG_STATIONS) {
    const exercise = ECG_EXERCISES[station], widths = [...exercise.widths];
    const value = { station, widths, width: widths[1], startTime: 400, time: 440, answer: exercise.answer };
    assert.equal(ecgObservationPassed({ ...value, widths: [widths[0]] }), false);
    assert.equal(ecgObservationPassed({ ...value, answer: exercise.options[1] }), false);
    if (station === "timing") assert.equal(ecgObservationPassed({ ...value, time: 400 }), false);
    save({ ...value, answer: exercise.options[1] });
    assert.equal(ecgComplete(record), false);
    save(value);
    assert.deepEqual(readEcgObservation(record.trials.at(-1)), value);
  }
  assert.equal(record.prediction, "");
  assert.equal(record.analysis, "Earlier notes");
  assert.equal(ecgComplete(record), true);
  assert.equal(labTaskComplete("L1-4", record), false);
  record.completion = { confirmed: true, confirmedAt: new Date().toISOString() };
  const restored = createVirtualLabEngine();
  restored.records.import(JSON.parse(JSON.stringify(engine.records.data)));
  assert.equal(labTaskComplete("L1-4", restored.records.data.tasks["L1-4"]), true);
  assert.equal(restored.records.data.tasks["L1-4"].prediction, "");
});
