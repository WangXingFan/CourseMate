import type { ClassroomExportRequest } from "@deeix/api-contract";
import { authedFetch } from "@/shared/api/authed-client";
import { authedRequest } from "@/shared/api/authed-client";
import type { GradePreviewResponse, GradeRecordResponse, GradeRecordListResponse } from "@deeix/api-contract";
import { pathParam } from "@/shared/api/http-client";

export type { ClassroomExportRequest };
export type { GradePreviewResponse, GradeRecordResponse, GradeRecordInfoResponse } from "@deeix/api-contract";

export function previewGrades(accessToken: string, id: string, options: ClassroomExportRequest, signal?: AbortSignal) {
  return authedRequest<GradePreviewResponse>(`/api/v1/classrooms/${pathParam(id)}/grade-preview`, { accessToken, method: "POST", body: options, signal });
}
export function finalizeGrades(accessToken: string, id: string, title: string, fingerprint: string, options: ClassroomExportRequest, signal?: AbortSignal) {
  return authedRequest<GradeRecordResponse>(`/api/v1/classrooms/${pathParam(id)}/grade-records`, { accessToken, method: "POST", body: { title, fingerprint, options }, signal });
}
export function listGradeRecords(accessToken: string, id: string, signal?: AbortSignal) {
  return authedRequest<GradeRecordListResponse>(`/api/v1/classrooms/${pathParam(id)}/grade-records`, { accessToken, signal });
}
export function getGradeRecord(accessToken: string, id: string, recordID: string, signal?: AbortSignal) {
  return authedRequest<GradeRecordResponse>(`/api/v1/classrooms/${pathParam(id)}/grade-records/${pathParam(recordID)}`, { accessToken, signal });
}
export async function downloadGradeRecord(accessToken: string, id: string, recordID: string, signal?: AbortSignal): Promise<Blob> {
  const response = await authedFetch(`/api/v1/classrooms/${pathParam(id)}/grade-records/${pathParam(recordID)}/export`, { accessToken, signal });
  return response.blob();
}

export async function exportClassroom(accessToken: string, id: string, options: ClassroomExportRequest, signal?: AbortSignal): Promise<Blob> {
  const response = await authedFetch(`/api/v1/classrooms/${pathParam(id)}/exports`, {
    accessToken, method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(options), signal,
  });
  return response.blob();
}
