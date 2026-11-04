import type { LabAssessmentResponse, LabAssignmentsResponse, LabAssignmentResponse, LabAnswersRequest, LabPublishRequest, LabReportResponse, LabPreviewResponse } from "@deeix/api-contract";
import { authedRequest } from "@/shared/api/authed-client";
import { pathParam } from "@/shared/api/http-client";
export type { LabAssessmentResponse, LabAssignmentsResponse, LabAssignmentResponse, LabReportResponse, LabPreviewResponse, LabPaperResponse, LabResultResponse, LabTaskResponse, LabCheckpointResponse, LabAttemptResponse } from "@deeix/api-contract";

export function listLabAssessments(accessToken: string, classroomID?: string, signal?: AbortSignal): Promise<LabAssignmentsResponse> {
  return authedRequest(classroomID ? `/api/v1/classrooms/${pathParam(classroomID)}/lab-assessments` : "/api/v1/learning/lab-assessments", { accessToken, signal });
}
export function readLabAssessment(accessToken: string, id: string, signal?: AbortSignal): Promise<LabAssessmentResponse> {
  return authedRequest(`/api/v1/learning/lab-assessments/${pathParam(id)}`, { accessToken, signal });
}
export function mutateLabAssessment(accessToken: string, id: string, task: string, action: string, body?: LabAnswersRequest): Promise<LabAssessmentResponse> {
  return authedRequest(`/api/v1/learning/lab-assessments/${pathParam(id)}/tasks/${pathParam(task)}/${action}`, { accessToken, method: "POST", body });
}
export function publishLabAssessment(accessToken: string, classroomID: string, body: Omit<LabPublishRequest, "deadline"> & { deadline?: string }): Promise<LabAssignmentResponse> {
  return authedRequest(`/api/v1/classrooms/${pathParam(classroomID)}/lab-assessments`, { accessToken, method: "POST", body });
}
export function setLabAssessmentOpen(accessToken: string, id: string, open: boolean): Promise<{ updated: boolean }> {
  return authedRequest(`/api/v1/lab-assessments/${pathParam(id)}`, { accessToken, method: "PATCH", body: { open } });
}
export function getLabReport(accessToken: string, id: string, signal?: AbortSignal): Promise<LabReportResponse> {
  return authedRequest(`/api/v1/lab-assessments/${pathParam(id)}/report`, { accessToken, signal });
}
export function getLabPreview(accessToken: string, id: string, task: string): Promise<LabPreviewResponse> {
  return authedRequest(`/api/v1/lab-assessments/${pathParam(id)}/preview?task=${pathParam(task)}`, { accessToken });
}
export function correctLabGrade(accessToken: string, id: string, student: string, task: string, score: number, reason: string): Promise<{ updated: boolean }> {
  return authedRequest(`/api/v1/lab-assessments/${pathParam(id)}/students/${pathParam(student)}/tasks/${pathParam(task)}/correction`, { accessToken, method: "PUT", body: { score, reason } });
}
