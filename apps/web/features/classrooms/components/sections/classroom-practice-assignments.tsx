"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { QuestionContent } from "@/shared/components/question-content";
import { useClassroomAssignedPractice } from "@/features/classrooms/hooks/use-classroom-assigned-practice";

export function ClassroomPracticeAssignments({ accessToken, classroomID, onCreate }: { accessToken: string; classroomID: string; onCreate: () => void }) {
  const t = useTranslations("classrooms.practice");
  const mastery = useTranslations("learning.mastery");
  const locale = useLocale();
  const model = useClassroomAssignedPractice(accessToken, classroomID);
  return <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h3 className="font-display text-2xl font-normal">{t("title")}</h3><div className="flex gap-3"><Button variant="ghost" onClick={model.refresh}>{t("refresh")}</Button><Button onClick={onCreate}>{t("fromMastery")}</Button></div></div>
    {model.error && <p role="alert" className="text-sm text-destructive">{model.error}</p>}
    {model.loading ? <Spinner /> : model.data?.items.length ? <div className="divide-y divide-border border-y border-border">{model.data.items.map((item) => <details key={item.id} className="py-6">
      <summary className="cursor-pointer space-y-3"><span className="font-display text-xl">{item.title}</span><div className="flex flex-wrap gap-4 text-sm"><span>{t(item.open ? "open" : "closed")}</span><span>{t("completion", { done: item.students.filter((s) => s.submission).length, total: item.students.length })}</span><span>{t("deadline")} · {new Date(item.deadline).toLocaleString(locale)}</span></div></summary>
      <div className="mt-5 divide-y divide-border">{item.students.map((student) => <details key={student.studentId} className="py-4">
        <summary className="cursor-pointer text-sm"><span className="mr-4 font-display text-lg">{student.name}</span><span className="mr-4 inline-block">{t("baseline")}：{mastery(`status.${student.baselineStatus}`)}</span><span className="inline-block">{student.submission ? t("score", { correct: student.submission.correct, total: item.questions.length }) : t("notSubmitted")}</span></summary>
        {student.submission && <div className="mt-4 space-y-6 border-l-2 border-border pl-4">{student.submission.results.map((result) => {
          const question = item.questions.find((q) => q.id === result.questionId);
          const answer = question?.options.length ? question.options[Number(result.answers.choice)] : question?.fields.map((field) => `${field.label}: ${result.answers[field.id] ?? ""}`).join(" / ");
          return <div key={result.questionId} className="space-y-2 text-sm"><QuestionContent content={question?.prompt ?? ""} /><p>{t(result.correct ? "correct" : "incorrect")}</p><p>{t("answer")}</p><QuestionContent content={answer ?? ""} />{result.expected.map((expected, index) => <QuestionContent key={`${result.questionId}:${index}`} content={`${t("expected")} ${expected}`} />)}<QuestionContent content={result.explanation} /></div>;
        })}</div>}
      </details>)}</div>
    </details>)}</div> : !model.error && <p className="py-10 text-sm">{t("empty")}</p>}
  </div>;
}
