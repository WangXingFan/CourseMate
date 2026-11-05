import type { LabAssessmentResponse, LabReportResponse } from "@deeix/api-contract";

export function labStudentProgress(grade: LabAssessmentResponse) {
  const submitted = grade.tasks.filter((task) => task.attempts.some((attempt) => !!attempt.submittedAt && !!attempt.result)).length;
  const started = grade.tasks.some((task) => task.attempts.length > 0 || task.checkpoints.some((point) => !!point.result) || task.corrections.length > 0);
  const status = grade.tasks.length === 4 && submitted === 4 ? "completed" : started ? "inProgress" : "notStarted";
  const dates = grade.tasks.flatMap((task) => task.attempts.flatMap((attempt) => attempt.submittedAt ? [attempt.submittedAt] : []));
  const latest = dates.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
  return { submitted, started, status, latest };
}

export function summarizeLabReport(report: LabReportResponse) {
  const students = report.students.map((student) => ({ student, progress: labStudentProgress(student.grade) }));
  const completed = students.filter((item) => item.progress.status === "completed");
  const started = students.filter((item) => item.progress.started).length;
  const distribution = [0, 0, 0, 0, 0];
  for (const { student } of completed) {
    const score = student.grade.total;
    distribution[score >= 90 ? 4 : score >= 80 ? 3 : score >= 70 ? 2 : score >= 60 ? 1 : 0] += 1;
  }
  return {
    students, completed: completed.length, started,
    submitted: students.filter((item) => item.progress.submitted > 0).length,
    completionRate: students.length ? completed.length / students.length * 100 : null,
    completedAverage: completed.length ? completed.reduce((sum, item) => sum + item.student.grade.total, 0) / completed.length : null,
    classAverage: students.length ? students.reduce((sum, item) => sum + item.student.grade.total, 0) / students.length : null,
    distribution,
  };
}
