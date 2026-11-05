import type { UsageReportResponse, UsageVisitRequest, UsageVisitResponse } from "@deeix/api-contract";
import { authedRequest } from "@/shared/api/authed-client";

export type { UsageReportResponse, AssessmentStatsResponse, LessonStatsResponse } from "@deeix/api-contract";

export function getUsageReport(accessToken: string, days: number, classroomId: string, signal?: AbortSignal): Promise<UsageReportResponse> {
  const query = new URLSearchParams({ days: String(days) });
  if (classroomId) query.set("classroomId", classroomId);
  return authedRequest(`/api/v1/analytics/usage?${query}`, { accessToken, signal });
}

export function recordUsageVisit(accessToken: string, body: UsageVisitRequest): Promise<UsageVisitResponse> {
  return authedRequest("/api/v1/analytics/visits", { accessToken, method: "POST", body });
}
