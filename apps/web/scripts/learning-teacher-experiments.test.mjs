import assert from "node:assert/strict";
import test from "node:test";
import { labStudentProgress, summarizeLabReport } from "../features/learning/model/teacher-lab-report.ts";

const timestamp = "2026-11-05T10:00:00Z";
function grade(submitted, score, started = submitted) {
  return { total: score, tasks: Array.from({ length: 4 }, (_, i) => ({
    id: `L1-${i + 1}`, total: i < submitted ? score / submitted : 0,
    attempts: i < started ? [{ submittedAt: i < submitted ? timestamp : null, result: i < submitted ? { score: 20 } : null }] : [],
    checkpoints: [], corrections: [],
  })) };
}

test("teacher reports distinguish unstarted, partial and fully submitted labs", () => {
  assert.equal(labStudentProgress(grade(0, 0)).status, "notStarted");
  assert.equal(labStudentProgress(grade(0, 0, 1)).status, "inProgress");
  assert.equal(labStudentProgress(grade(2, 40)).submitted, 2);
  assert.equal(labStudentProgress(grade(4, 80)).status, "completed");
  assert.equal(labStudentProgress(grade(4, 80)).latest, timestamp);
  const operation = grade(0, 5); operation.tasks[0].checkpoints = [{ result: { score: 5 } }];
  assert.equal(labStudentProgress(operation).status, "inProgress");
});

test("class averages include current scores while completed averages and bands exclude unfinished work", () => {
  const report = { students: [grade(4, 85), grade(4, 60), grade(1, 20), grade(0, 0)].map((grade, i) => ({ id: String(i), grade })) };
  const stats = summarizeLabReport(report);
  assert.equal(stats.completed, 2);
  assert.equal(stats.submitted, 3);
  assert.equal(stats.completionRate, 50);
  assert.equal(stats.completedAverage, 72.5);
  assert.equal(stats.classAverage, 41.25);
  assert.deepEqual(stats.distribution, [0, 1, 0, 1, 0]);
  const empty = summarizeLabReport({ students: [] });
  assert.equal(empty.completedAverage, null);
  assert.equal(empty.classAverage, null);
  assert.equal(empty.completionRate, null);
});
