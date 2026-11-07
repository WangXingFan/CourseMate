import type { FinalizePerformance, PerformanceOptions, PerformanceResponse, PerformanceRecordResponse, PerformanceRecordListResponse } from "@deeix/api-contract";
import { authedRequest } from "@/shared/api/authed-client";
import { pathParam } from "@/shared/api/http-client";

export type { PerformanceReport, PerformanceStudent, PerformanceOptions, PerformanceRecordItem, PerformanceRecord, PerformanceCorrection, PerformanceActivity } from "@deeix/api-contract";

const base = (id: string) => `/api/v1/classrooms/${pathParam(id)}/performance`;
export function previewPerformance(token: string, id: string, options: PerformanceOptions, signal?: AbortSignal) {
  return authedRequest<PerformanceResponse>(`${base(id)}/preview`, { method: "POST", accessToken: token, body: options, signal }, true);
}
export function listPerformanceRecords(token: string, id: string, signal?: AbortSignal) {
  return authedRequest<PerformanceRecordListResponse>(`${base(id)}/records`, { accessToken: token, signal }, true);
}
export function getPerformanceRecord(token: string, id: string, recordID: string, signal?: AbortSignal) {
  return authedRequest<PerformanceRecordResponse>(`${base(id)}/records/${pathParam(recordID)}`, { accessToken: token, signal }, true);
}
export function finalizePerformance(token: string, id: string, input: FinalizePerformance, signal?: AbortSignal) {
  return authedRequest<PerformanceRecordResponse>(`${base(id)}/records`, { method: "POST", accessToken: token, body: input, signal }, true);
}
export function getStudentPerformance(token: string, signal?: AbortSignal) {
  return authedRequest<PerformanceRecordResponse>("/api/v1/student/performance", { accessToken: token, signal }, true);
}
