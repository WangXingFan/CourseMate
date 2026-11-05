import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { aggregateAssessments, aggregateLessons, percentage } from "../features/analytics/model/statistics.ts";

test("analytics combines counts and scores before calculating weighted rates", () => {
  const row = { id: "a", classroomId: "one", classroomName: "One", itemKey: "1", title: "A", expected: 10, started: 1, completed: 1, scoreCount: 1, scoreSum: 100, distribution: [0, 0, 0, 0, 1] };
  const rows = aggregateAssessments([row, { ...row, id: "b", expected: 20, started: 9, completed: 9, scoreCount: 9, scoreSum: 540, distribution: [0, 9, 0, 0, 0] }, { ...row, classroomId: "two" }]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].scoreSum / rows[0].scoreCount, 64);
  assert.equal(rows[0].expected, 30);
  assert.equal(rows[0].completed, 10);
  assert.deepEqual(rows[0].distribution, [0, 9, 0, 0, 1]);
  assert.equal(row.scoreSum, 100);
  assert.equal(percentage(0, 0), null);
  assert.equal(percentage(0, 10), 0);
});

test("section accuracy excludes unanswered work and combines repeated sections", () => {
  const item = { quizId: "q", quizTitle: "Q", classroomId: "one", lessonId: "s", number: "1.2", title: "Section", expected: 10, answered: 2, correct: 1 };
  const [section] = aggregateLessons([item, { ...item, quizId: "q2", expected: 20, answered: 8, correct: 8 }]);
  assert.equal(section.expected, 30);
  assert.equal(percentage(section.correct, section.answered), 90);
  assert.equal(section.answered, 10);
});

test("analytics resource labels cover the server catalog in both languages", () => {
  const source = readFileSync(new URL("../../../backend/internal/domain/analytics/usage.go", import.meta.url), "utf8");
  const resources = [...source.matchAll(/"\/[^"]+":\s*\{"([^"]+)",\s*"([^"]+)"\}/g)];
  assert.ok(resources.length > 30);
  for (const locale of ["zh-CN", "en-US"]) {
    const messages = JSON.parse(readFileSync(new URL(`../i18n/messages/${locale}/analytics.json`, import.meta.url), "utf8"));
    for (const [, key, category] of resources) {
      assert.ok(messages.resources[key], `${locale}: ${key}`);
      assert.ok(messages.categories[category], `${locale}: ${category}`);
    }
  }
});
