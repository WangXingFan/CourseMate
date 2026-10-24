import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import katex from "katex";

const course = JSON.parse(readFileSync(new URL("../../../backend/internal/domain/learning/content/course.json", import.meta.url), "utf8"));

test("course questions and lesson math render with KaTeX", () => {
  assert.equal(course.lessons.length, 52);
  for (const lesson of course.lessons) {
    const formulas = [];
    for (const text of [lesson.markdown, ...lesson.questions.flatMap((q) => [q.prompt, ...q.options])]) {
      for (const match of text.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g)) formulas.push(match[1] ?? match[2]);
    }
    formulas.push(...lesson.questions.map((q) => q.formula).filter(Boolean));
    for (const formula of formulas) {
      assert.doesNotThrow(() => katex.renderToString(formula, { throwOnError: true, strict: "ignore", trust: false }), `${lesson.id}: ${formula}`);
    }
  }
});
