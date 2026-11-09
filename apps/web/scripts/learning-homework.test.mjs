import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";
import katex from "katex";

test("imported homework formulas render and diagrams are local", () => {
  const bank = JSON.parse(readFileSync("../../backend/internal/domain/classroom/content/homework-bank.json", "utf8"));
  let formulas = 0;
  for (const paper of bank) {
    assert.equal(paper.questions.length, 10);
    assert.equal(paper.questions.reduce((sum, q) => sum + q.points, 0), 100);
    for (const question of paper.questions) for (const text of [question.prompt, ...question.options]) {
      assert.doesNotMatch(text, /https?:|data:image|�/);
      for (const [, math] of text.matchAll(/\$([^$]+)\$/g)) { katex.renderToString(math, { throwOnError: true }); formulas++; }
      for (const [, path] of text.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
        assert.ok(existsSync(`public${path}`), path);
        const pdfPath = `../../backend/internal/application/exports/homework-images/${path.split("/").at(-1)}`;
        assert.deepEqual(readFileSync(pdfPath), readFileSync(`public${path}`), `PDF diagram differs from web: ${path}`);
      }
    }
  }
  assert.ok(formulas >= 48);
});
