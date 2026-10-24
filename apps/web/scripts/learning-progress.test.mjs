import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parsePendingAttempts } from "../features/learning/model/learning-progress.ts";

test("quiz queue rejects review payloads and malformed cached entries", () => {
  const quiz = { id: "c5dadce1-ce3e-42fd-95ae-c70461b32f46", questionId: "energy-signal", selected: 1 };
  const values = [quiz, { ...quiz, mode: "review" }, { ...quiz, variantId: "energy-signal-v1" }, { ...quiz, baseQuestionId: "energy-signal" }, { ...quiz, selected: 4 }, { ...quiz, id: "invalid" }];
  assert.deepEqual(parsePendingAttempts(JSON.stringify(values)), [quiz]);
  assert.deepEqual(parsePendingAttempts("not JSON"), []);
});

test("all 240 server misconception codes have both translations", () => {
  const bank = JSON.parse(readFileSync(new URL("../../../backend/internal/domain/learning/content/quick-questions.json", import.meta.url), "utf8"));
  const codes = bank.questions.flatMap((q) => Object.values(q.misconceptions));
  assert.equal(codes.length, 240);
  for (const locale of ["zh-CN", "en-US"]) {
    const messages = JSON.parse(readFileSync(new URL(`../i18n/messages/${locale}/learning-labs.json`, import.meta.url), "utf8"));
    assert.equal(Object.keys(messages.progress.diagnoses).length, 240);
    for (const code of codes) {
      assert.ok(messages.progress.diagnoses[code]?.thought, `${locale}: ${code}`);
      assert.ok(messages.progress.diagnoses[code]?.correction, `${locale}: ${code}`);
    }
  }
});
