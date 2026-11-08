import type { LearningCorrectionsResponse, LearningCorrectionResultResponse, LearningCorrectionSubmitRequest, LearningCourseSearchResponse } from "@deeix/api-contract";
import { authedRequest } from "@/shared/api/authed-client";

export function getLearningCorrections(accessToken: string, signal?: AbortSignal): Promise<LearningCorrectionsResponse> {
  return authedRequest("/api/v1/learning/corrections", { accessToken, signal });
}
export function submitLearningCorrection(accessToken: string, body: LearningCorrectionSubmitRequest): Promise<LearningCorrectionResultResponse> {
  return authedRequest("/api/v1/learning/correction-attempts", { accessToken, method: "POST", body });
}
export function searchLearningCourse(accessToken: string, query: string, signal?: AbortSignal): Promise<LearningCourseSearchResponse> {
  return authedRequest(`/api/v1/learning/course/search?q=${encodeURIComponent(query)}`, { accessToken, signal });
}
