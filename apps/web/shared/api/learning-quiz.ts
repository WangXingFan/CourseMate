import { authedRequest } from "@/shared/api/authed-client";
import type { LearningQuizCatalogResponse, LearningQuizLeaderboardResponse, LearningQuizRoundResponse, LearningQuizStartRequest, LearningQuizAnswerRequest } from "@deeix/api-contract";

export function getLearningQuizCatalog(accessToken: string, signal?: AbortSignal) {
  return authedRequest<LearningQuizCatalogResponse>("/api/v1/learning/quiz/chapters", { accessToken, signal });
}
export function getLearningQuizLeaderboard(accessToken: string, chapter: string, signal?: AbortSignal) {
  return authedRequest<LearningQuizLeaderboardResponse>(`/api/v1/learning/quiz/leaderboard?chapterId=${encodeURIComponent(chapter)}`, { accessToken, signal });
}
export function startLearningQuiz(accessToken: string, body: LearningQuizStartRequest) {
  return authedRequest<LearningQuizRoundResponse>("/api/v1/learning/quiz/rounds", { method: "POST", accessToken, body });
}
export function answerLearningQuiz(accessToken: string, id: string, body: LearningQuizAnswerRequest) {
  return authedRequest<LearningQuizRoundResponse>(`/api/v1/learning/quiz/rounds/${encodeURIComponent(id)}/answers`, { method: "POST", accessToken, body });
}
export function finishLearningQuiz(accessToken: string, id: string) {
  return authedRequest<LearningQuizRoundResponse>(`/api/v1/learning/quiz/rounds/${encodeURIComponent(id)}/finish`, { method: "POST", accessToken });
}
