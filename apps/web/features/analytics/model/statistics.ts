import type { AssessmentStatsResponse, LessonStatsResponse } from "@deeix/api-contract";

export function aggregateAssessments(items: AssessmentStatsResponse[]) {
  const groups = new Map<string, AssessmentStatsResponse>();
  for (const item of items) {
    const group = groups.get(item.classroomId) ?? { ...item, id: item.classroomId, expected: 0, started: 0, completed: 0, scoreCount: 0, scoreSum: 0, distribution: [0, 0, 0, 0, 0] };
    group.expected += item.expected;
    group.started += item.started;
    group.completed += item.completed;
    group.scoreCount += item.scoreCount;
    group.scoreSum += item.scoreSum;
    group.distribution = group.distribution.map((count, i) => count + (item.distribution[i] ?? 0));
    groups.set(item.classroomId, group);
  }
  return [...groups.values()];
}

export function aggregateLessons(items: LessonStatsResponse[]) {
  const groups = new Map<string, LessonStatsResponse>();
  for (const item of items) {
    const group = groups.get(item.lessonId) ?? { ...item, expected: 0, answered: 0, correct: 0 };
    group.expected += item.expected;
    group.answered += item.answered;
    group.correct += item.correct;
    groups.set(item.lessonId, group);
  }
  return [...groups.values()].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
}

export function percentage(value: number, total: number): number | null {
  return total ? value * 100 / total : null;
}
