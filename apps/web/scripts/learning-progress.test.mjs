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

test("all 36 server misconception codes have both translations", () => {
  const domain = readFileSync(new URL("../../../backend/internal/domain/learning/types.go", import.meta.url), "utf8");
  const codes = [...domain.matchAll(/\d: "([a-z0-9-]+)"/g)].map((match) => match[1]);
  assert.equal(codes.length, 36);
  for (const locale of ["zh-CN", "en-US"]) {
    const messages = JSON.parse(readFileSync(new URL(`../i18n/messages/${locale}/learning-labs.json`, import.meta.url), "utf8"));
    assert.equal(Object.keys(messages.progress.diagnoses).length, 36);
    for (const code of codes) {
      assert.ok(messages.progress.diagnoses[code]?.thought, `${locale}: ${code}`);
      assert.ok(messages.progress.diagnoses[code]?.correction, `${locale}: ${code}`);
    }
  }
});
