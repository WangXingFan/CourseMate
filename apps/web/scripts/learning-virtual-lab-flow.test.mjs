import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import katex from "katex";
import { createVirtualLabEngine } from "../public/vendor/signal-lab/core.mjs";
import { LAB_FLOWS, firstMissingLabStep, hasLabStepEvidence, labMeasurementAt, labPredictionDiffers, labReading, labStepTrials, labTrialPrediction, matchesLabStep, resumeLabStep, validLabObservation } from "../features/learning/model/virtual-lab-flow.ts";
import { LAB_PREDICTION_FORMULAS, labAnswerFormulas, labObservationFormulas, labObservationPlotKey, labPredictionPlot } from "../features/learning/model/virtual-lab-presentation.ts";
import { labAnswers } from "./virtual-lab-fixtures.mjs";

function observedScene(engine, id, step) {
  const record = engine.records.data.tasks[id], scene = engine.scene(id, record.params, record.answers);
  scene.readings.exerciseStep = step.key;
  if (step.observation) scene.readings.observation = { step: step.key, value: labReading(scene.readings, step.observation.reading) };
  return scene;
}

test("all guided comparisons have valid setups, bilingual prompts and portable evidence", async () => {
  const messages = await Promise.all(["zh-CN", "en-US"].map(async (locale) => JSON.parse(await readFile(new URL(`../i18n/messages/${locale}/learning.json`, import.meta.url), "utf8")).virtualLab.flow));
  const engine = createVirtualLabEngine();
  assert.deepEqual(Object.fromEntries(Object.entries(LAB_FLOWS).map(([id, flow]) => [id, flow.steps.length])), {
    "L1-1": 4, "L1-2": 5, "L1-3": 4, "L1-4": 5, "L2-1": 3, "L2-2": 4,
    "L2-3": 4, "L2-4": 5, "L3-1": 3, "L3-2": 5, "L3-3": 5, "L3-4": 3,
  });
  assert.deepEqual(Object.keys(LAB_FLOWS), engine.taskIds);
  for (const [id, flow] of Object.entries(LAB_FLOWS)) {
    const record = engine.records.data.tasks[id];
    assert.equal(firstMissingLabStep(flow, record), 0);
    for (const step of flow.steps) {
      for (const message of messages) {
        assert.ok(message.tasks[id].question);
        assert.ok(message.tasks[id].conclusion);
        assert.ok(message.tasks[id].given);
        assert.ok(message.tasks[id].objective);
        assert.ok(message.tasks[id].pythonExercise);
        assert.ok(message.estimateReading);
        assert.ok(message.showReading);
        if (step.observation) assert.ok(message.readings[step.observation.reading.replaceAll(".", "_")]);
        assert.ok(message.tasks[id].steps[step.key]);
        if (flow.derivation) assert.ok(message.tasks[id].derivation);
      }
      record.params = { ...engine.defaults(id), ...step.initial, ...step.params };
      if (step.key === "ninety") record.params.measureTime = 2.3;
      if (step.key === "refine") record.params.T = 1.61;
      if (step.key === "candidate") record.params.candidate = 5;
      if (id === "L2-3" && step.key === "design") Object.assign(record.params, { filterType: "notch", center: 50, alpha: 10 });
      if (id === "L3-3" && ["design", "frequency"].includes(step.key)) Object.assign(record.params, { center: 50, alpha: 10 });
      assert.ok(engine.validParams(id, record.params), `${id}/${step.key}`);
      record.answers = labAnswers(id, record.params);
      assert.ok(matchesLabStep(step, record), `${id}/${step.key}`);
      const currentScene = engine.scene(id, record.params, record.answers);
      assert.ok((step.hiddenMetrics ?? []).every((label) => currentScene.metrics.some((metric) => metric.label === label)), `${id}/${step.key} names metrics to hide`);
      if (step.predictedReadingKey) {
        const predicted = labMeasurementAt(currentScene.readings, step.predictedReadingKey);
        assert.ok(typeof predicted === "boolean" || typeof predicted === "number" && Number.isFinite(predicted), `${id}/${step.key} estimate reading`);
        assert.equal(step.predictedReadingKey, step.observation?.reading, `${id}/${step.key} stores a measured estimate`);
      }
      engine.records.trial(id, observedScene(engine, id, step), null);
    }
    assert.equal(firstMissingLabStep(flow, record), -1, id);
  }
  const restored = createVirtualLabEngine();
  restored.records.import(JSON.parse(JSON.stringify(engine.records.data)));
  for (const [id, flow] of Object.entries(LAB_FLOWS)) assert.equal(firstMissingLabStep(flow, restored.records.data.tasks[id]), -1, id);
});

test("prediction difference uses a 20 percent numeric threshold and exact boolean comparison", () => {
  assert.equal(labPredictionDiffers(120, 100), false);
  assert.equal(labPredictionDiffers(121, 100), true);
  assert.equal(labPredictionDiffers(0, 0), false);
  assert.equal(labPredictionDiffers(0.01, 0), true);
  assert.equal(labPredictionDiffers(true, 1), false);
  assert.equal(labPredictionDiffers(false, 1), true);
});

test("step estimates round-trip without changing the lab record schema", () => {
  const engine = createVirtualLabEngine(), id = "L1-1", step = LAB_FLOWS[id].steps[0], record = engine.records.data.tasks[id];
  record.params = { ...engine.defaults(id), ...step.params };
  const scene = engine.scene(id, record.params);
  scene.readings.observation = { step: step.key, reading: step.observation.reading, value: labReading(scene.readings, step.observation.reading), predictedValue: 1.1 };
  engine.records.trial(id, scene, null);
  const restored = createVirtualLabEngine();
  restored.records.import(JSON.parse(JSON.stringify(engine.records.data)));
  assert.equal(restored.records.data.tasks[id].trials[0].measurements.observation.predictedValue, 1.1);
  assert.equal(restored.records.data.tasks[id].trials[0].measurements.observation.step, step.key);
  assert.deepEqual(labTrialPrediction(step, restored.records.data.tasks[id].trials[0]), { predictedValue: 1.1, value: 1 });
});

test("predictions have explicit models and input-only plots independent of saved parameters", () => {
  const engine = createVirtualLabEngine();
  for (const [id, flow] of Object.entries(LAB_FLOWS)) {
    assert.ok(LAB_PREDICTION_FORMULAS[id].length);
    const source = labPredictionPlot(engine, id);
    if (id === "L1-2") assert.equal(source, null);
    else {
      assert.equal(source.series.length, 1, id);
      assert.equal(source.key, "given");
      assert.equal(source.marker, undefined);
      assert.ok(source.series[0].points.length > 2);
    }
    const formulas = [...LAB_PREDICTION_FORMULAS[id]];
    for (const step of flow.steps) {
      const params = { ...engine.defaults(id), ...step.params };
      formulas.push(...labAnswerFormulas(id, params), ...labObservationFormulas(id, params));
    }
    for (const formula of formulas) assert.doesNotThrow(() => katex.renderToString(formula, { throwOnError: true }), `${id}: ${formula}`);
  }
  const before = labPredictionPlot(engine, "L1-1");
  assert.ok(before.series[0].points.some(([x, y]) => x === 1 && y === 1));
  Object.assign(engine.records.data.tasks["L1-1"].params, { mode: "impulse", A: 2, shift: 2, a: -1 });
  assert.deepEqual(labPredictionPlot(engine, "L1-1"), before);
  assert.equal(labObservationPlotKey("L1-4", "response0"), "output");
  assert.equal(labObservationPlotKey("L1-4", "overlap0"), "overlap");
  assert.equal(labObservationPlotKey("L2-2", "shift"), "phase");
});

test("revisiting a task preserves the current setup and summaries use the most recent matching trial", () => {
  const e = createVirtualLabEngine(), flow = LAB_FLOWS["L1-1"], record = e.records.data.tasks["L1-1"];
  record.params = { ...e.defaults("L1-1"), ...flow.steps[1].params };
  e.records.trial("L1-1", observedScene(e, "L1-1", flow.steps[1]), null);
  e.records.trial("L1-1", observedScene(e, "L1-1", flow.steps[1]), 2);
  assert.equal(labStepTrials(flow, record)[1], record.trials[1]);
  assert.equal(resumeLabStep(flow, record), 1);
  record.params = { ...record.params, ...flow.steps[3].params };
  assert.equal(resumeLabStep(flow, record), 3, "A saved narrow pulse must not be labeled as the original triangle");
  const refine = LAB_FLOWS["L3-4"].steps.at(-1);
  assert.equal(matchesLabStep(refine, { params: { T: 3 }, answers: {} }), false);
  assert.equal(matchesLabStep(refine, { params: { T: 1.61 }, answers: {} }), true);
});

test("one saved trial cannot satisfy multiple comparisons, and templates must be filled", () => {
  const e = createVirtualLabEngine(), record = e.records.data.tasks["L2-4"], flow = LAB_FLOWS["L2-4"];
  record.params.fs = "15";
  e.records.trial("L2-4", observedScene(e, "L2-4", flow.steps[2]), null);
  assert.equal(labStepTrials(flow, record).filter(Boolean).length, 1);
  assert.ok(labStepTrials(flow, record)[2]);
  assert.equal(labStepTrials(flow, record)[3], undefined);
  const laplace = e.records.data.tasks["L3-1"], first = LAB_FLOWS["L3-1"].steps[0];
  laplace.params = { ...laplace.params, ...first.params };
  assert.equal(matchesLabStep(first, laplace), false);
  Object.assign(laplace.answers, { coefficient: "1", denShift: "0.5", delay1: "0" });
  assert.equal(matchesLabStep(first, laplace), true, "The unused second delay is not required for an exponential");
  assert.equal(firstMissingLabStep(LAB_FLOWS["L1-1"], e.records.data.tasks["L1-1"]), 0, "Progress remains isolated by task");
});

test("saving presets alone cannot finish a comparison; readings must match the current signal", () => {
  const e = createVirtualLabEngine(), record = e.records.data.tasks["L1-1"], step = LAB_FLOWS["L1-1"].steps[0];
  record.params = { ...record.params, ...step.params };
  const scene = e.scene("L1-1", record.params);
  e.records.trial("L1-1", scene, null);
  assert.equal(labStepTrials(LAB_FLOWS["L1-1"], record).filter(Boolean).length, 0);
  for (const value of ["", " ", "Infinity", "abc", "3"]) assert.equal(validLabObservation(step, scene.readings, value), false, value);
  assert.equal(validLabObservation(step, scene.readings, "1.03"), true, "Allow normal plot reading error");
  record.params.shift = 2;
  assert.equal(validLabObservation(step, e.scene("L1-1", record.params).readings, "1.03"), false, "Changing the signal invalidates the previous reading");
  const restored = createVirtualLabEngine();
  restored.records.import(JSON.parse(JSON.stringify(e.records.data)));
  assert.equal(restored.records.data.tasks["L1-1"].trials.length, 1, "Old observations are preserved even if they do not satisfy the new exercise");
});

test("independent searches must achieve the target, and incorrect coefficients cannot count", () => {
  const e = createVirtualLabEngine();
  for (const [id, key, good, bad] of [["L2-4", "candidate", 5, 10], ["L3-2", "measureTime", 2.3, 2], ["L3-4", "T", 1.61, 1.4]]) {
    const step = LAB_FLOWS[id].steps.find((step) => step.key === ({ "L2-4": "candidate", "L3-2": "ninety", "L3-4": "refine" })[id]), params = { ...e.defaults(id), ...step.params, [key]: good }, answers = labAnswers(id, params);
    const evidence = () => ({ params, answers, measurements: { ...e.scene(id, params, answers).readings, exerciseStep: step.key } });
    assert.equal(hasLabStepEvidence(step, evidence()), true, id);
    params[key] = bad;
    assert.equal(hasLabStepEvidence(step, evidence()), false, id);
  }
  const id = "L3-1", step = LAB_FLOWS[id].steps[0], params = { ...e.defaults(id), ...step.params }, answers = { coefficient: "0", denShift: "0", delay1: "0", delay2: "" };
  assert.equal(hasLabStepEvidence(step, { params, answers, measurements: e.scene(id, params, answers).readings }), false);
});

// A changing pulse width must never replace the fixed reference with the answer.
test("every reading prediction retains its input and the pulse reference stays at 0.5 s", () => {
  const engine = createVirtualLabEngine();
  for (const [id, flow] of Object.entries(LAB_FLOWS)) {
    for (const step of flow.steps.filter((item) => item.predictedReadingKey)) {
      const params = { ...engine.defaults(id), ...step.params };
      const plot = labPredictionPlot(engine, id, params);
      assert.ok(plot?.series.length, `${id}/${step.key} must show a reference`);
      assert.equal(plot.marker, undefined);
      if (id === "L1-1" && params.mode === "impulse") {
        assert.equal(Math.max(...plot.series[0].points.map(([, y]) => y)), 2);
        assert.ok(plot.series[0].points.some(([x, y]) => x === 0.5 && y === 2));
      }
    }
  }
});
