import assert from "node:assert/strict";
import test from "node:test";
import { createVirtualLabEngine } from "../public/vendor/signal-lab/core.mjs";
import { BLACK_BOX_CHOICES, BLACK_BOX_MODELS, BLACK_BOX_PROBES, blackBoxAnswerCorrect, blackBoxChoices, blackBoxComplete, blackBoxEvidence, blackBoxIdentified, blackBoxParams, blackBoxPulse, blackBoxScene, blackBoxTested, createBlackBoxes, readBlackBoxTrial } from "../features/learning/model/virtual-lab-black-box.ts";
import { labMissingWork, labTaskComplete } from "../features/learning/model/virtual-lab-flow.ts";
import { plotGeometry } from "../features/learning/model/virtual-lab-native.ts";

function orderedBoxes(engine) {
  let draw = 0;
  return createBlackBoxes(engine.records.data.tasks["L1-2"], () => {
    const index = draw++;
    return index < 2 ? 0.999 : ((index % 3) + 0.5) / 3;
  });
}

function send(engine, box, probe, guess = "", reasoning) {
  const record = engine.records.data.tasks["L1-2"];
  record.params = blackBoxParams(engine, box, probe);
  record.answers = { evidence: blackBoxEvidence(record.params) };
  engine.records.trial("L1-2", blackBoxScene(engine, box, probe, guess, reasoning), null);
}

test("each assignment uses all three models in a randomized order", () => {
  const engine = createVirtualLabEngine(), record = engine.records.data.tasks["L1-2"];
  const assignments = new Set();
  for (let lastTarget = 0; lastTarget < 3; lastTarget++) for (let middleTarget = 0; middleTarget < 2; middleTarget++) {
    const draws = [(lastTarget + 0.5) / 3, (middleTarget + 0.5) / 2];
    const boxes = createBlackBoxes(record, () => draws.shift() ?? 0.5);
    assert.equal(new Set(boxes.map((box) => box.kind)).size, 3);
    assignments.add(boxes[0].assignment);
  }
  assert.equal(assignments.size, 6);
  const boxes = createBlackBoxes(record, () => 0.999);
  assert.deepEqual(boxes.map((box) => box.kind), ["square", "delay", "timescale"]);
  send(engine, boxes[0], "baseline");
  const restored = createVirtualLabEngine();
  restored.records.import(JSON.parse(JSON.stringify(engine.records.data)));
  assert.deepEqual(createBlackBoxes(restored.records.data.tasks["L1-2"], () => { throw Error("Must not redraw untested boxes"); }), boxes);
  assert.equal(blackBoxTested(restored.records.data.tasks["L1-2"], boxes[1], "baseline"), false, "A repeated model still needs its own tests");
});

test("each question has one correct model and two distinguishable distractors, with varied sets and answer positions", () => {
  const record = createVirtualLabEngine().records.data.tasks["L1-2"];
  const positions = new Set(), seenChoices = new Set();
  // Independent formulas for the candidates: [output height, start, width].
  const candidates = {
    square: (height, start) => [height ** 2, start, 1],
    delay: (height, start) => [height, start + 1, 1],
    timescale: (height, start) => [height, start / 2, 0.5],
    gain: (height, start) => [height * 2, start, 1],
    attenuate: (height, start) => [height / 2, start, 1],
    identity: (height, start) => [height, start, 1],
    offset: (height, start) => [height + 1, start, 1],
    invert: (height, start) => [-height, start, 1],
    delayTwo: (height, start) => [height, start + 2, 1],
    advance: (height, start) => [height, start - 1, 1],
    stretch: (height, start) => [height, start * 2, 2],
    cube: (height, start) => [height ** 3, start, 1],
  };
  assert.deepEqual(Object.keys(candidates), [...BLACK_BOX_CHOICES]);
  for (let initial = 0; initial < 20; initial++) {
    let seed = initial;
    const boxes = createBlackBoxes(record, () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; });
    const sets = new Set();
    for (const box of boxes) {
      const choices = blackBoxChoices(box);
      assert.equal(choices.length, 3);
      assert.equal(new Set(choices).size, 3);
      assert.equal(choices.filter((kind) => kind === box.kind).length, 1);
      assert.ok(choices.some((kind) => !BLACK_BOX_MODELS.some((model) => model.kind === kind)), "Never reuse only the original three choices");
      sets.add([...choices].sort().join(":"));
      positions.add(choices.indexOf(box.kind));
      for (const choice of choices) {
        seenChoices.add(choice);
        const actual = BLACK_BOX_PROBES.map((probe) => {
          const pulse = blackBoxPulse(box, probe);
          return [pulse.outputHeight, pulse.outputStart, pulse.outputWidth];
        });
        const predicted = [[1, 1], [2, 1], [1, 2]].map(([height, start]) => candidates[choice](height, start));
        if (choice === box.kind) assert.deepEqual(predicted, actual);
        else {
          assert.notDeepEqual(predicted, actual, `${box.kind}/${choice}: the saved probes must disprove the distractor`);
          assert.equal(blackBoxAnswerCorrect(box, choice, { height: actual[1][0], shift: actual[2][1] - actual[0][1] }), false);
        }
      }
    }
    assert.equal(sets.size, 3, "All three questions use different candidate sets");
  }
  assert.equal(positions.size, 3, "The correct answer can occupy any of the three positions");
  assert.equal(seenChoices.size, BLACK_BOX_CHOICES.length);
});

test("distractor guesses and all option orders survive refresh and JSON import", () => {
  const engine = createVirtualLabEngine(), boxes = orderedBoxes(engine), box = boxes[0];
  const wrong = blackBoxChoices(box).find((kind) => !BLACK_BOX_MODELS.some((model) => model.kind === kind));
  for (const probe of BLACK_BOX_PROBES) send(engine, box, probe);
  send(engine, box, "shift", wrong, { height: 4, shift: 1 });
  const restored = createVirtualLabEngine();
  restored.records.import(JSON.parse(JSON.stringify(engine.records.data)));
  const record = restored.records.data.tasks["L1-2"], attempt = readBlackBoxTrial(record.trials.at(-1));
  assert.equal(attempt.guess, wrong);
  assert.equal(attempt.identified, false);
  assert.deepEqual(createBlackBoxes(record, () => { throw Error("Saved choices must not be shuffled again"); }), boxes);
  assert.deepEqual(blackBoxChoices(attempt.box), blackBoxChoices(box));
});

test("black-box probes produce distinct, exact pulse heights, times and widths", () => {
  const engine = createVirtualLabEngine();
  const expected = {
    A: [[1, 1, 1], [4, 1, 1], [1, 2, 1]],
    B: [[1, 2, 1], [2, 2, 1], [1, 3, 1]],
    C: [[1, 0.5, 0.5], [2, 0.5, 0.5], [1, 1, 0.5]],
  };
  for (const box of orderedBoxes(engine)) for (const [index, probe] of BLACK_BOX_PROBES.entries()) {
    const pulse = blackBoxPulse(box, probe);
    assert.deepEqual([pulse.outputHeight, pulse.outputStart, pulse.outputWidth], expected[box.id][index]);
    assert.deepEqual([pulse.inputHeight, pulse.inputStart, pulse.inputWidth], probe === "baseline" ? [1, 1, 1] : probe === "double" ? [2, 1, 1] : [1, 2, 1]);
    const scene = blackBoxScene(engine, box, probe);
    const [height, start, width] = expected[box.id][index];
    assert.deepEqual(scene.plots[1].series[0].points, [[0, 0], [start, 0], [start, height], [start + width, height], [start + width, 0], [4, 0]]);
    assert.ok(engine.validParams("L1-2", blackBoxParams(engine, box, probe)));
    assert.ok(engine.validAnswers("L1-2", { evidence: blackBoxEvidence(blackBoxParams(engine, box, probe)) }));
  }
});

test("a fixed graph scale makes squared amplitude growth visible", () => {
  const engine = createVirtualLabEngine(), box = orderedBoxes(engine)[0];
  for (const width of [400, 900]) {
    const baseline = plotGeometry(blackBoxScene(engine, box, "baseline").plots[1], width, [-0.5, 4.5]);
    const doubled = plotGeometry(blackBoxScene(engine, box, "double").plots[1], width, [-0.5, 4.5]);
    assert.equal(baseline.y(0), doubled.y(0));
    assert.equal(baseline.y(1), doubled.y(1));
    assert.equal((doubled.y(0) - doubled.y(4)) / (baseline.y(0) - baseline.y(1)), 4);
  }
});

test("completion requires each box's tests, correct observations and correct model", () => {
  const engine = createVirtualLabEngine(), record = engine.records.data.tasks["L1-2"];
  assert.deepEqual(labMissingWork("L1-2", record), ["continueComparisons"]);
  for (const box of orderedBoxes(engine)) {
    const height = box.kind === "square" ? 4 : 2, shift = box.kind === "timescale" ? 0.5 : 1;
    send(engine, box, "baseline", "incorrect");
    send(engine, box, "double");
    assert.equal(blackBoxIdentified(record, box), false);
    send(engine, box, "shift");
    assert.equal(blackBoxIdentified(record, box), false);
    send(engine, box, "shift", box.kind);
    assert.equal(blackBoxIdentified(record, box), false, "Guessing the model without evidence cannot complete a box");
    send(engine, box, "shift", box.kind, { height: height === 4 ? 2 : 4, shift });
    assert.equal(blackBoxIdentified(record, box), false, "Correct model with wrong height is insufficient");
    send(engine, box, "shift", box.kind, { height, shift: shift === 1 ? 0.5 : 1 });
    assert.equal(blackBoxIdentified(record, box), false, "Correct model with wrong shift is insufficient");
    send(engine, box, "shift", box.kind, { height, shift });
    assert.equal(blackBoxIdentified(record, box), true);
  }
  assert.equal(blackBoxComplete(record), true);
  assert.deepEqual(labMissingWork("L1-2", record), []);
  assert.equal(labTaskComplete("L1-2", record), false);
  record.prediction = "黑箱辨识判断";
  record.predictionDraft = record.prediction;
  record.analysis = "三台黑箱的测试证据及模型判断";
  record.completion = { confirmed: true, confirmedAt: new Date().toISOString() };
  assert.equal(labTaskComplete("L1-2", record), true);
  const restored = createVirtualLabEngine();
  const document = JSON.parse(JSON.stringify(engine.records.data));
  restored.records.import(document);
  assert.deepEqual(restored.records.data.tasks, document.tasks);
  assert.equal(labTaskComplete("L1-2", restored.records.data.tasks["L1-2"]), true);
  assert.equal(restored.records.data.tasks["L1-2"].trials.filter((trial) => readBlackBoxTrial(trial)?.identified).length, 3);
});

test("old system-property evidence remains readable alongside the new trials", () => {
  const engine = createVirtualLabEngine(), record = engine.records.data.tasks["L1-2"];
  record.answers = { evidence: blackBoxEvidence(record.params) };
  record.analysis = "原实验的分析";
  engine.records.trial("L1-2", engine.scene("L1-2", record.params, record.answers), null);
  const oldTrial = structuredClone(record.trials[0]);
  send(engine, orderedBoxes(engine)[0], "baseline");
  const restored = createVirtualLabEngine();
  restored.records.import(JSON.parse(JSON.stringify(engine.records.data)));
  assert.deepEqual(restored.records.data.tasks["L1-2"].trials[0], oldTrial);
  assert.equal(readBlackBoxTrial(restored.records.data.tasks["L1-2"].trials[0]), null);
  assert.equal(restored.records.data.tasks["L1-2"].analysis, "原实验的分析");
  assert.equal(readBlackBoxTrial(restored.records.data.tasks["L1-2"].trials[1]).box.id, "A");
});

test("legacy repeated assignments are repaired without deleting their records", () => {
  const engine = createVirtualLabEngine(), record = engine.records.data.tasks["L1-2"];
  send(engine, { ...BLACK_BOX_MODELS[1], id: "A", assignment: "delay:delay:delay" }, "baseline");
  const oldTrials = structuredClone(record.trials);
  const boxes = createBlackBoxes(record, () => { throw Error("A repeated assignment gets a deterministic repair"); });
  assert.deepEqual(boxes.map((box) => box.kind), ["square", "delay", "timescale"]);
  assert.deepEqual(createBlackBoxes(record), boxes, "Refresh keeps the repaired assignment stable");
  assert.equal(blackBoxComplete(record), false, "Repeated historical evidence does not complete the distinct models");
  assert.deepEqual(record.trials, oldTrials, "Previous evidence stays in the record");
});

test("original fixed black-box records retain their results and do not satisfy new independent boxes", () => {
  const engine = createVirtualLabEngine(), record = engine.records.data.tasks["L1-2"];
  for (const [index, model] of BLACK_BOX_MODELS.entries()) {
    const box = { ...model, id: ["A", "B", "C"][index] };
    for (const probe of BLACK_BOX_PROBES) send(engine, box, probe);
    send(engine, box, "shift", box.kind);
  }
  assert.equal(blackBoxComplete(record), true);
  const oldTrials = structuredClone(record.trials);
  const boxes = createBlackBoxes(record, () => 0);
  assert.equal(boxes.every((box) => !blackBoxIdentified(record, box)), true);
  send(engine, boxes[0], "baseline");
  assert.equal(blackBoxComplete(record), false);
  const restored = createVirtualLabEngine();
  restored.records.import(JSON.parse(JSON.stringify(engine.records.data)));
  assert.deepEqual(restored.records.data.tasks["L1-2"].trials.slice(0, oldTrials.length), oldTrials);
});
