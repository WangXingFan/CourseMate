import type { AIActivityResponse } from "@deeix/api-contract";
import { authedRequest } from "@/shared/api/authed-client";
import { pathParam } from "@/shared/api/http-client";

export type { AIActivityReport, AIActivityStudent } from "@deeix/api-contract";

export function getClassroomAIActivity(token: string, id: string, startDate: string, endDate: string, signal?: AbortSignal) {
  const query = new URLSearchParams();
  if (startDate) query.set("startDate", startDate);
  if (endDate) query.set("endDate", endDate);
  return authedRequest<AIActivityResponse>(`/api/v1/classrooms/${pathParam(id)}/ai-activity?${query}`, { accessToken: token, signal }, true);
}

export function getStudentAIActivity(token: string, signal?: AbortSignal) {
  return authedRequest<AIActivityResponse>("/api/v1/student/ai-activity", { accessToken: token, signal }, true);
}
