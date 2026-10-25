import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import katex from "katex";
import { createTranslator } from "next-intl";

const content = new URL("../../../backend/internal/domain/learning/content/", import.meta.url);
const bank = JSON.parse(readFileSync(new URL("quick-questions.json", content), "utf8"));
const course = JSON.parse(readFileSync(new URL("course.json", content), "utf8"));
const pairs = JSON.parse(readFileSync(new URL("paired-questions.json", content), "utf8")).pairs;

// Evaluate the mathematical relationship separately from option construction.
// No expression supplied by content is executed.
const calculations = {
  "finite-power": () => 0,
  "cosine-power": (a) => a ** 2 / 2,
  "rectangle-energy": (a, t) => a ** 2 * t,
  "exponential-energy": (a, b) => a ** 2 / (2 * b),
  "angular-hertz": (k) => k / 2,
  "harmonic-period": (a, b) => { assert.equal(b / a, 2); return 2 / a; },
  "width-scale": (t, a) => t / Math.abs(a),
  "support-start": (_t, b, a) => b / a,
  "energy-scale": (e, a) => e / Math.abs(a),
  "impulse-scale": (a) => 1 / Math.abs(a),
  "impulse-sift": (a, b) => a ** 2 + b,
  "linear-sum": (k, a, b) => k * a + k * b,
  "square-scale": (a, x) => (a * x) ** 2,
  "bounded-gain": (k, m) => Math.abs(k) * m,
  "rc-time": (r, c) => r * 1e3 * c * 1e-6,
  sum: (a, b) => a + b,
  negative: (a) => -a,
  quotient: (a, b) => a / b,
  "second-over-first": (a, b) => b / a,
  identity: (a) => a,
  first: (a) => a,
  product: (a, b) => a * b,
  minimum: (a, b) => Math.min(a, b),
  "product-first-two": (a, b) => a * b,
  difference: (a, b) => a - b,
  reciprocal: (a) => 1 / a,
  "half-first": (a) => a / 2,
  "negative-product": (a, b) => -(a * b),
  second: (_a, b) => b,
  half: (a) => a / 2,
  "sample-ms": (fs) => 1e3 / fs,
  "negative-second": (_a, b) => -b,
  double: (a) => 2 * a,
  "unilateral-derivative": (s, f, x) => s * f - x,
  residue: (a, b) => 1 / (b - a),
  "negative-first": (a) => -a,
  "amplitude-db": (g) => 20 * Math.log10(g),
  "mason-single": (p, l) => p / (1 - l),
  "mason-two": (a, b) => 1 - a - b + a * b,
  "negative-reciprocal": (a) => -1 / a,
};

function close(actual, expected, label) {
  assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-6 * Math.max(1, Math.abs(expected)), `${label}: ${actual} != ${expected}`);
}

test("80 chapter questions, 160 matched variants, bilingual text and grading use the same catalog", () => {
  const seen = new Set();
  const variantIDs = new Set();
  const chapterCount = new Map();
  let checked = 0;
  for (const q of bank.questions) {
    assert.ok(!seen.has(q.id)); seen.add(q.id);
    assert.ok(["1", "2", "3", "4"].includes(q.chapterID));
    chapterCount.set(q.chapterID, (chapterCount.get(q.chapterID) ?? 0) + 1);
    assert.equal(q.variants.length, 2);
    assert.equal(Object.keys(q.misconceptions).length, 3);
    assert.ok(!Object.hasOwn(q.misconceptions, q.answer));
    for (const v of q.variants) {
      assert.equal(v.baseQuestionID, q.id);
      assert.ok(!variantIDs.has(v.id)); variantIDs.add(v.id);
      assert.notEqual(v.zh.prompt, q.zh.prompt);
      assert.notEqual(v.en.prompt, q.en.prompt);
    }
    for (const item of [q, ...q.variants]) {
      assert.ok(Number.isInteger(item.answer) && item.answer >= 0 && item.answer < 4);
      for (const language of ["zh", "en"]) {
        const text = item[language];
        assert.ok(text.prompt && text.explanation);
        assert.equal(new Set(text.options).size, 4, item.id);
        if (item.check) {
          const c = item.check;
          assert.ok(calculations[c.kind], c.kind);
          const expected = calculations[c.kind](...c.parameters);
          const values = text.options.map((option) => Number(c.unit ? option.slice(0, -c.unit.length) : option));
          close(values[item.answer], expected, item.id);
          assert.equal(values.filter((v) => Math.abs(v - expected) <= 1e-6 * Math.max(1, Math.abs(expected))).length, 1, item.id);
          checked++;
        }
      }
    }
  }
  assert.equal(seen.size, 80); assert.equal(variantIDs.size, 160);
  assert.deepEqual([...chapterCount.values()], [20, 20, 20, 20]);
  assert.ok(checked > 350, `${checked} bilingual numerical checks`);
  for (const [language, locale] of [["zh", "zh-CN"], ["en", "en-US"]]) {
    const messages = JSON.parse(readFileSync(new URL(`../i18n/messages/${locale}/learning-labs.json`, import.meta.url), "utf8"));
    const t = createTranslator({ locale, messages, onError(error) { throw error; } });
    for (const q of bank.questions) {
      assert.equal(t(`quiz.questions.${q.id}.prompt`), q[language].prompt);
      assert.equal(t(`quiz.questions.${q.id}.explain`), q[language].explanation);
      for (let i=0; i<4; i++) assert.equal(t(`quiz.questions.${q.id}.option${i+1}`), q[language].options[i]);
      assert.ok(messages.progress.topics[q.topic], q.topic);
      for (const code of Object.values(q.misconceptions)) assert.ok(messages.progress.diagnoses[code]?.correction, code);
    }
  }
});

test("original grading indices stay compatible and ambiguous assumptions are explicit", () => {
  const original = { "energy-signal": 0, "convolution-shift": 2, "step-response": 1, aliasing: 3, nyquist: 0, "square-wave": 1, "pulse-spectrum": 2, "time-constant": 0, damping: 1, "right-half-plane": 3, "am-bandwidth": 2, "imaginary-axis": 0 };
  for (const [id, answer] of Object.entries(original)) assert.equal(bank.questions.find((q) => q.id === id)?.answer, answer, id);
  for (const [id, required] of [["nyquist", "阈值"], ["square-wave", "50%"], ["am-bandwidth", "双边带"], ["imaginary-axis", "单极点"], ["damping", "无零点"], ["time-constant", "低通"]]) assert.ok(bank.questions.find((q) => q.id === id).zh.prompt.includes(required), id);
  const expectedOriginalVariants = {
    "energy-signal": ["2", "4.5"], "convolution-shift": ["y(t−2)", "y(t−3)"],
    "step-response": ["95.0%", "99.3%"], aliasing: ["100 Hz", "100 Hz"], nyquist: ["800 Hz", "1000 Hz"],
    "square-wave": ["奇次谐波", "1/3"], "pulse-spectrum": ["变为两倍", "6"], "time-constant": ["达到相同比例所需时间加倍", "0.25 s"],
    damping: ["减小", "临界阻尼"], "right-half-plane": ["指数增长", "稳定"], "am-bandwidth": ["8 kHz", "97–103 kHz"], "imaginary-axis": ["持续等幅振荡", "不稳定"],
  };
  for (const [id, expected] of Object.entries(expectedOriginalVariants)) {
    const q = bank.questions.find((q) => q.id === id);
    q.variants.forEach((v,i) => { assert.equal(v.zh.options[v.answer], expected[i], v.id); });
  }
});

// Every numerical key in the original 156 is checked against an independently
// written calculation, rather than grading the stored key against itself.
const independentCourseKeys = {
  "ss-1-1": { in_class: [3**2/(2*2)], after_class: [2**2/2] },
  "ss-1-2": { in_class: [2/2,(2+2)/2], after_class: [12/3] },
  "ss-1-3": { in_class: [(2**2+1)/2], after_class: [-2*1] },
  "ss-1-5": { in_class: [2e3*100e-6] }, "ss-1-6": { in_class: [5-2] },
  "ss-2-1": { in_class: [4/2,1-4/2] }, "ss-2-2": { in_class: [1+3], after_class: [1,-1+2] },
  "ss-2-3": { in_class: [3] }, "ss-2-4": { in_class: [2/2] },
  "ss-2-5": { in_class: [1,1,1+2,-1], after_class: [1*1] },
  "ss-2-6": { in_class: [2+3], after_class: [2+5,5-2,Math.min(2,5)] },
  "ss-2-7": { in_class: [2,2-1] }, "ss-2-8": { in_class: [4,1,2] }, "ss-2-9": { in_class: [1,2-1] },
  "ss-3-2": { in_class: [2,3/2], after_class: [1/4] }, "ss-3-3": { in_class: [1/0.02] },
  "ss-3-4": { in_class: [1/2], after_class: [3*2] }, "ss-3-5": { in_class: [6/3] },
  "ss-3-6": { in_class: [2*2] }, "ss-3-7": { in_class: [0.5*6] }, "ss-3-8": { in_class: [2,3] },
  "ss-3-9": { in_class: [2*3], after_class: [Math.abs(800-1000)] }, "ss-3-10": { in_class: [8*Math.PI/(2*Math.PI)] },
  "ss-5-1": { in_class: [-2] }, "ss-5-2": { in_class: [1,0] },
  "ss-5-3": { in_class: [1/(2-1),1/(1-2)], after_class: [6/2] },
  "ss-5-4": { in_class: [1/2,3-1/2] }, "ss-5-5": { in_class: [-3,-2,-1] },
  "ss-5-6": { in_class: [3/2] }, "ss-5-7": { in_class: [2/2,2], after_class: [1000/5] },
  "ss-5-8": { in_class: [6/(1-(-2))], after_class: [1-0.5-0.25+0.5*0.25] },
  "ss-5-9": { in_class: [3] }, "ss-5-10": { in_class: [1e3*10e-6,1/(1e3*10e-6)] },
  "ss-a-1": { in_class: [1*4] }, "ss-a-2": { in_class: [2*1] }, "ss-a-3": { in_class: [1*5-2] },
  "ss-a-4": { in_class: [1], after_class: [1/2] }, "ss-a-6": { in_class: [400/800,800/400] }, "ss-a-7": { in_class: [2*3] },
  "ss-b-1": { in_class: [2] }, "ss-b-2": { in_class: [(4-6)/(-2)], after_class: [(-1-4)/2,(1-4)/2] },
  "ss-b-3": { in_class: [4*Math.exp(-Math.log(2))] }, "ss-b-4": { in_class: [0.5,2-1.5], after_class: [120*0.01] },
  "ss-b-5": { in_class: [3**2/2] }, "ss-b-6": { in_class: [1] }, "ss-b-7": { after_class: [(2*3-1*4)/2] },
  "ss-b-8": { in_class: [2000/5] }, "ss-b-9": { in_class: [5*2/(0-(-3))+1] },
};

test("all numerical answers in the original 156 match independent calculations", () => {
  let checked = 0;
  for (const lesson of course.lessons) for (const q of lesson.questions) {
    if (q.options.length) continue;
    const expected = independentCourseKeys[lesson.id]?.[q.stage];
    assert.ok(expected, `No independent calculation for ${q.id}`);
    assert.equal(q.fields.length, expected.length, q.id);
    q.fields.forEach((field,i) => { close(field.expected, expected[i], `${q.id}/${field.id}`); });
    checked++;
  }
  assert.equal(checked, Object.values(independentCourseKeys).reduce((sum,stages) => sum+Object.keys(stages).length,0));
  assert.ok(checked >= 60);
  assert.equal(course.lessons.flatMap((l) => l.questions).length, 156);
});

test("all 52 preview concepts have distinct, valid and renderable matched retests", () => {
  const seen = new Set();
  assert.equal(pairs.length,52);
  for (const lesson of course.lessons) {
    const pair = pairs.find((p) => p.lessonID === lesson.id);
    assert.ok(pair,lesson.id);
    const preview = lesson.questions.find((q) => q.stage === "preview");
    assert.equal(pair.previewQuestionID,preview.id);
    const q = pair.followup;
    assert.ok(pair.conceptID && pair.conceptTitle && q.explanation);
    assert.ok(!seen.has(q.id)); seen.add(q.id);
    assert.notEqual(q.prompt,preview.prompt);
    assert.equal(new Set(q.options).size,4);
    assert.ok(Number.isInteger(q.answer) && q.answer>=0 && q.answer<4);
    for (const text of [q.prompt,...q.options,q.explanation]) {
      assert.ok([...text].every((char) => char.codePointAt(0) >= 32 || char === "\n" || char === "\r"),q.id);
      for (const match of text.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g)) assert.doesNotThrow(() => katex.renderToString(match[1] ?? match[2],{throwOnError:true,strict:"ignore",trust:false}),q.id);
    }
  }
});
