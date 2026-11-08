import type { LearningPracticeBankResponse, LearningPracticeAnswerRequest, LearningLessonAttemptResponse } from "@deeix/api-contract";
import { authedRequest } from "@/shared/api/authed-client";

export function getLearningPracticeBank(accessToken: string, conceptId: string, locale: string, signal?: AbortSignal): Promise<LearningPracticeBankResponse> {
  const query = new URLSearchParams({ conceptId, locale });
  return authedRequest(`/api/v1/learning/practice-bank?${query}`, { accessToken, signal });
}

export function saveLearningPracticeAnswer(accessToken: string, body: LearningPracticeAnswerRequest, signal?: AbortSignal): Promise<LearningLessonAttemptResponse> {
  return authedRequest("/api/v1/learning/practice-attempts", { accessToken, method: "POST", body, signal });
}
