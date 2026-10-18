import { authedRequest } from "@/shared/api/authed-client";
import type { LearningAttemptPayload, LearningAttemptResult, LearningProgressData } from "@/shared/api/learning-types";

export async function getLearningProgress(accessToken: string, signal?: AbortSignal): Promise<LearningProgressData> {
  return authedRequest<LearningProgressData>("/api/v1/learning/progress", { accessToken, signal });
}

export async function saveLearningAttempt(accessToken: string, payload: LearningAttemptPayload): Promise<LearningAttemptResult> {
  return authedRequest<LearningAttemptResult>("/api/v1/learning/attempts", { method: "POST", accessToken, body: payload });
}
