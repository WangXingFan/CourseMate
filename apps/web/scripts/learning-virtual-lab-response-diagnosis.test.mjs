import assert from "node:assert/strict";
import test from "node:test";
import { createVirtualLabEngine } from "../public/vendor/signal-lab/core.mjs";
import { applyResponseTest, checkDiagnosis, createDiagnosisCases, diagnosisCasePassed, diagnosisComplete, diagnosisScene, expectedDiagnosis, readDiagnosisTrial, responsePoints, responseSetupFromPoints, responseValue } from "../features/learning/model/virtual-lab-response-diagnosis.ts";
import { labMissingWork, labTaskComplete } from "../features/learning/model/virtual-lab-flow.ts";

function submit(engine, cases, index, answers) {
  const record = engine.records.data.tasks["L1-3"], item = cases[index];
  record.params = { ...engine.defaults("L1-3"), A: item.amplitude, initial: item.initial, enabled: "on" };
  record.answers = {};
  engine.records.trial("L1-3", diagnosisScene(engine, cases, index, answers), null);
}

test("response diagnosis isolates each source and compares the whole interval", () => {
  const baseline = { initial: 2, amplitude: 1 };
  for (const initial of [0.5, 1, 2, 2.5]) for (const amplitude of [0.5, 1, 1.5, 2]) for (const target of ["initial", "input"]) {
    const item = { initial, amplitude, target }, answer = expectedDiagnosis(item);
    assert.equal(responseValue(item, 0), initial);
    assert.ok(Math.abs(responseValue(item, 30) - amplitude) < 1e-10);
    assert.equal(answer.source, initial === 2 ? amplitude === 1 ? "neither" : "input" : amplitude === 1 ? "initial" : "both");
    const isolated = applyResponseTest(item, answer.test), reference = applyResponseTest(baseline, answer.test);
    const differs = [0, 1, 3, 8].some((time) => Math.abs(responseValue(isolated, time) - responseValue(reference, time)) > 0.01);
    assert.equal(answer.prediction, differs ? "different" : "overlap");
    assert.ok(checkDiagnosis(item, answer).passed);
    assert.equal(checkDiagnosis(item, { ...answer, test: "clearBoth" }).passed, false);
    assert.equal(checkDiagnosis(item, { ...answer, prediction: differs ? "overlap" : "different" }).passed, false);
    const restored = responseSetupFromPoints(responsePoints(item));
    assert.equal(restored.initial, initial);
    assert.ok(Math.abs(restored.amplitude - amplitude) < 1e-12, "Public curve samples reproduce the operation without a new API contract");
  }
});

test("independent cases, wrong predictions, old parameter records and forged flags cannot complete the new practice", () => {
  const engine = createVirtualLabEngine(), record = engine.records.data.tasks["L1-3"];
  record.prediction = "Old prediction"; record.analysis = "Old conclusion";
  engine.records.trial("L1-3", engine.scene("L1-3", record.params, {}), null);
  record.completion = { confirmed: true, confirmedAt: new Date().toISOString() };
  assert.equal(labTaskComplete("L1-3", record), false);
  assert.deepEqual(labMissingWork("L1-3", record), ["continueComparisons"]);
  const cases = createDiagnosisCases(record, () => 0);
  assert.deepEqual(cases, Array.from({ length: 3 }, () => ({ initial: 0.5, amplitude: 1, target: "initial" })));
  const expected = expectedDiagnosis(cases[0]);
  submit(engine, cases, 0, { ...expected, prediction: "overlap" });
  record.trials.at(-1).measurements.responseDiagnosis.passed = true;
  assert.equal(readDiagnosisTrial(record.trials.at(-1)).result.passed, false);
  assert.equal(diagnosisCasePassed(record, cases, 0), false);
  assert.equal(diagnosisComplete(record), false);
  submit(engine, cases, 0, expected);
  assert.equal(diagnosisCasePassed(record, cases, 1), false, "A repeated case still needs its own answer");
  const restored = createVirtualLabEngine();
  restored.records.import(JSON.parse(JSON.stringify(engine.records.data)));
  assert.deepEqual(createDiagnosisCases(restored.records.data.tasks["L1-3"], () => { throw Error("Must preserve unvisited cases on reload"); }), cases);
  for (const index of [1, 2]) submit(restored, cases, index, expectedDiagnosis(cases[index]));
  const saved = restored.records.data.tasks["L1-3"];
  assert.equal(diagnosisComplete(saved), true);
  assert.equal(labTaskComplete("L1-3", saved), false, "All answers precede completion confirmation");
  saved.completion = { confirmed: true, confirmedAt: new Date().toISOString() };
  assert.equal(labTaskComplete("L1-3", saved), true);
  assert.deepEqual(saved.answers, {}, "Answers stay in portable measurements, preserving the public record schema");
  assert.doesNotThrow(() => restored.records.validate(JSON.parse(JSON.stringify(restored.records.data))));
});
