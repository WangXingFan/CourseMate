import type { LearningVirtualLabAccessResponse, LearningVirtualLabGuideResponse, LearningVirtualLabRequest, LearningVirtualLabResponse } from "@deeix/api-contract";
import { authedRequest } from "@/shared/api/authed-client";

export function getLearningVirtualLabAccess(accessToken: string, signal?: AbortSignal) {
  return authedRequest<LearningVirtualLabAccessResponse>("/api/v1/learning/virtual-lab/access", { accessToken, signal });
}

export function getLearningVirtualLab(accessToken: string, signal?: AbortSignal) {
  return authedRequest<LearningVirtualLabResponse>("/api/v1/learning/virtual-lab", { accessToken, signal });
}

export function saveLearningVirtualLab(accessToken: string, body: LearningVirtualLabRequest, signal?: AbortSignal) {
  return authedRequest<LearningVirtualLabResponse>("/api/v1/learning/virtual-lab", { accessToken, method: "PUT", body, signal });
}

export function getLearningVirtualLabGuide(accessToken: string, signal?: AbortSignal) {
  return authedRequest<LearningVirtualLabGuideResponse>("/api/v1/learning/virtual-lab/guide", { accessToken, signal });
}
