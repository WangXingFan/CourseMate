import type { LabParameters, LabScene, LabTaskRecord, LabTrial, VirtualLabEngine } from "@/public/vendor/signal-lab/core.mjs";

export const BLACK_BOX_IDS = ["A", "B", "C"] as const;
export const BLACK_BOX_MODELS = [
  { kind: "square", linear: false, invariant: true, formula: "y(t)=x^2(t)" },
  { kind: "delay", linear: true, invariant: true, formula: "y(t)=x(t-1)" },
  { kind: "timescale", linear: true, invariant: false, formula: "y(t)=x(2t)" },
] as const;
export const BLACK_BOX_CHOICES = ["square", "delay", "timescale", "gain", "attenuate", "identity", "offset", "invert", "delayTwo", "advance", "stretch", "cube"] as const;
export const BLACK_BOX_PROBES = ["baseline", "double", "shift"] as const;
export type BlackBoxChoice = typeof BLACK_BOX_CHOICES[number];
export type BlackBox = typeof BLACK_BOX_MODELS[number] & { id: typeof BLACK_BOX_IDS[number]; assignment?: string; choices?: BlackBoxChoice[][] };
export type BlackBoxProbe = typeof BLACK_BOX_PROBES[number];
export type BlackBoxReasoning = { height: number | null; shift: number | null };

function boxesForAssignment(assignment: string): BlackBox[] | null {
  const kinds = assignment.split(":");
  if (kinds.length !== BLACK_BOX_IDS.length) return null;
  const boxes: BlackBox[] = [];
  for (const [index, id] of BLACK_BOX_IDS.entries()) {
    const model = BLACK_BOX_MODELS.find((item) => item.kind === kinds[index]);
    if (!model) return null;
    boxes.push({ ...model, id, assignment });
  }
  return boxes;
}

function createChoiceSets(boxes: BlackBox[], random: () => number) {
  const used = new Set<string>();
  return boxes.map((box) => {
    const wrong = BLACK_BOX_CHOICES.filter((kind) => kind !== box.kind);
    for (let index = wrong.length - 1; index > 0; index--) {
      const target = Math.floor(random() * (index + 1));
      [wrong[index], wrong[target]] = [wrong[target], wrong[index]];
    }
    const key = (kind: BlackBoxChoice) => [box.kind, wrong[0], kind].sort().join(":");
    const isOriginal = (kind: BlackBoxChoice) => BLACK_BOX_MODELS.some((model) => model.kind === kind);
    const second = wrong.filter((kind, index) => index > 0 && (!isOriginal(wrong[0]) || !isOriginal(kind)) && !used.has(key(kind)))[0];
    used.add(key(second));
    const choices: BlackBoxChoice[] = [box.kind, wrong[0], second];
    for (let index = choices.length - 1; index > 0; index--) {
      const target = Math.floor(random() * (index + 1));
      [choices[index], choices[target]] = [choices[target], choices[index]];
    }
    return choices;
  });
}

export function blackBoxChoices(box: BlackBox): readonly BlackBoxChoice[] {
  return box.choices?.[BLACK_BOX_IDS.indexOf(box.id)] ?? BLACK_BOX_MODELS.map((model) => model.kind);
}

export function createBlackBoxes(record: LabTaskRecord, random = Math.random): BlackBox[] {
  const saved = record.trials.map(readBlackBoxTrial).findLast((trial) => trial?.box.assignment);
  if (saved?.box.assignment) {
    const boxes = boxesForAssignment(saved.box.assignment) ?? [];
    const choices = saved.box.choices ?? createChoiceSets(boxes, random);
    return boxes.map((box) => ({ ...box, choices }));
  }
  // Independent draws allow repeated models. Saving the whole assignment with
  // the first probe also preserves untested boxes when the page is refreshed.
  const models = BLACK_BOX_IDS.map(() => BLACK_BOX_MODELS[Math.floor(random() * BLACK_BOX_MODELS.length)]);
  const assignment = models.map((model) => model.kind).join(":");
  const boxes = models.map((model, index) => ({ ...model, id: BLACK_BOX_IDS[index], assignment }));
  const choices = createChoiceSets(boxes, random);
  return boxes.map((box) => ({ ...box, choices }));
}

export function blackBoxPulse(box: BlackBox, probe: BlackBoxProbe) {
  const inputHeight = probe === "double" ? 2 : 1, inputStart = probe === "shift" ? 2 : 1;
  const outputHeight = box.kind === "square" ? inputHeight ** 2 : inputHeight;
  const outputStart = box.kind === "delay" ? inputStart + 1 : box.kind === "timescale" ? inputStart / 2 : inputStart;
  const outputWidth = box.kind === "timescale" ? 0.5 : 1;
  return { inputHeight, inputStart, inputWidth: 1, outputHeight, outputStart, outputWidth };
}

export function blackBoxAnswerCorrect(box: BlackBox, guess: string, reasoning?: BlackBoxReasoning | null) {
  return guess === box.kind && reasoning?.height === blackBoxPulse(box, "double").outputHeight
    && reasoning.shift === blackBoxPulse(box, "shift").outputStart - blackBoxPulse(box, "baseline").outputStart;
}

export function blackBoxParams(engine: VirtualLabEngine, box: BlackBox, probe: BlackBoxProbe): LabParameters {
  return { ...engine.defaults("L1-2"), kind: box.kind, test: probe === "shift" ? "invariance" : "linearity", x1: "pulse", x2: "pulse", alpha: probe === "double" ? 2 : 1, beta: 0, delay: probe === "shift" ? 2 : 1 };
}

export function blackBoxEvidence(params: LabParameters) {
  return params.test === "linearity" ? `x1=${params.x1}; x2=${params.x2}; alpha=${params.alpha}; beta=${params.beta}` : `x1=${params.x1}; delay=${params.delay}`;
}

export function blackBoxScene(engine: VirtualLabEngine, box: BlackBox, probe: BlackBoxProbe, guess = "", reasoning: BlackBoxReasoning = { height: null, shift: null }): LabScene {
  const params = blackBoxParams(engine, box, probe), pulse = blackBoxPulse(box, probe);
  const scene = engine.scene("L1-2", params, { evidence: blackBoxEvidence(params) });
  const rectangle = (height: number, start: number, width: number): [number, number][] => [[0, 0], [start, 0], [start, height], [start + width, height], [start + width, 0], [4, 0]];
  return { ...scene,
    plots: [
      { key: "black-box-input", title: "x(t)", range: [0, 4], series: [{ label: "x(t)", points: rectangle(pulse.inputHeight, pulse.inputStart, pulse.inputWidth), color: "var(--chart-1)", fill: true }] },
      { key: "black-box-output", title: "y(t)", range: [0, 4], series: [{ label: "y(t)", points: rectangle(pulse.outputHeight, pulse.outputStart, pulse.outputWidth), color: "var(--chart-2)", fill: true }] },
    ],
    readings: { ...scene.readings, blackBox: {
      version: box.choices ? 3 : box.assignment ? 2 : 1, box: box.id, probe, guess, ...pulse,
      identified: box.assignment ? blackBoxAnswerCorrect(box, guess, reasoning) : guess === box.kind,
      ...(box.assignment ? { assignment: box.assignment, reasoning: { ...reasoning } } : {}),
      ...(box.choices ? { choices: box.choices.map((choices) => [...choices]) } : {}),
    } },
  };
}

export function readBlackBoxTrial(trial?: LabTrial) {
  const value = trial?.measurements.blackBox;
  if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== 1 && value.version !== 2 && value.version !== 3) return null;
  const probe = BLACK_BOX_PROBES.find((item) => item === value.probe);
  const legacyBoxes: BlackBox[] = BLACK_BOX_MODELS.map((model, index) => ({ ...model, id: BLACK_BOX_IDS[index] }));
  const boxes = value.version !== 1 && typeof value.assignment === "string" ? boxesForAssignment(value.assignment) : value.version === 1 ? legacyBoxes : null;
  const box = boxes?.find((item) => item.id === value.box && item.kind === trial?.params.kind);
  if (!box || !probe) return null;
  if (value.version === 3) {
    if (!Array.isArray(value.choices) || value.choices.length !== BLACK_BOX_IDS.length) return null;
    const choices: BlackBoxChoice[][] = [];
    for (const [index, row] of value.choices.entries()) {
      if (!Array.isArray(row) || row.length !== 3) return null;
      const items = row.flatMap((kind) => BLACK_BOX_CHOICES.filter((choice) => choice === kind));
      if (new Set(items).size !== 3 || !boxes?.[index] || !items.includes(boxes[index].kind)) return null;
      choices.push(items);
    }
    box.choices = choices;
  }
  const guess = BLACK_BOX_CHOICES.find((kind) => kind === value.guess) ?? "";
  const evidence = value.reasoning;
  const reasoning = evidence && typeof evidence === "object" && !Array.isArray(evidence) ? {
    height: evidence.height === 2 || evidence.height === 4 ? evidence.height : null,
    shift: evidence.shift === 0.5 || evidence.shift === 1 ? evidence.shift : null,
  } : null;
  const identified = value.identified === true && (value.version === 1 ? guess === box.kind : blackBoxAnswerCorrect(box, guess, reasoning));
  return { box, probe, guess, reasoning, identified };
}

export function blackBoxTested(record: LabTaskRecord, box: BlackBox, probe: BlackBoxProbe) {
  return record.trials.some((trial) => {
    const test = readBlackBoxTrial(trial);
    return test?.box.id === box.id && test.box.assignment === box.assignment && test.box.kind === box.kind && test.probe === probe;
  });
}

export function blackBoxIdentified(record: LabTaskRecord, box: BlackBox) {
  return BLACK_BOX_PROBES.every((probe) => blackBoxTested(record, box, probe)) && record.trials.some((trial) => {
    const test = readBlackBoxTrial(trial);
    return test?.box.id === box.id && test.box.assignment === box.assignment && test.box.kind === box.kind && test.identified;
  });
}

export function blackBoxComplete(record: LabTaskRecord) {
  const saved = record.trials.map(readBlackBoxTrial).findLast((trial) => trial?.box.assignment);
  const boxes: BlackBox[] = saved ? createBlackBoxes(record) : BLACK_BOX_MODELS.map((model, index) => ({ ...model, id: BLACK_BOX_IDS[index] }));
  return boxes.length === BLACK_BOX_IDS.length && boxes.every((box) => blackBoxIdentified(record, box));
}
