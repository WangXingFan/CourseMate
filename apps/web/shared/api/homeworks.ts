import type { HomeworkBankResponse, HomeworkListResponse, HomeworkManageRequest, HomeworkCorrectRequest, HomeworkPublishRequest, HomeworkResponse, HomeworkReportResponse, HomeworkSubmissionResponse, StudentHomeworksResponse } from "@deeix/api-contract";
import { authedRequest } from "@/shared/api/authed-client";
import { pathParam } from "@/shared/api/http-client";
import type { HomeworkDeadlineRequest } from "@deeix/api-contract";

export function extendHomeworkDeadline(accessToken: string, id: string, body: HomeworkDeadlineRequest): Promise<void> {
  return authedRequest(`/api/v1/homeworks/${pathParam(id)}/deadline`, { accessToken, method: "PATCH", body });
}

export type { HomeworkPaperResponse, HomeworkQuestionResponse, HomeworkResponse, HomeworkReportResponse, HomeworkSubmissionResponse, StudentHomeworksResponse } from "@deeix/api-contract";

export function getHomeworkBank(accessToken: string, classroomID: string, signal?: AbortSignal): Promise<HomeworkBankResponse> {
  return authedRequest(`/api/v1/classrooms/${pathParam(classroomID)}/homework-bank`, { accessToken, signal });
}
export function listHomeworks(accessToken: string, classroomID: string, signal?: AbortSignal): Promise<HomeworkListResponse> {
  return authedRequest(`/api/v1/classrooms/${pathParam(classroomID)}/homeworks`, { accessToken, signal });
}
export function publishHomework(accessToken: string, classroomID: string, body: HomeworkPublishRequest): Promise<HomeworkResponse> {
  return authedRequest(`/api/v1/classrooms/${pathParam(classroomID)}/homeworks`, { accessToken, method: "POST", body });
}
export function getHomeworkReport(accessToken: string, id: string, signal?: AbortSignal): Promise<HomeworkReportResponse> {
  return authedRequest(`/api/v1/homeworks/${pathParam(id)}/report`, { accessToken, signal });
}
export function listStudentHomeworks(accessToken: string, signal?: AbortSignal): Promise<StudentHomeworksResponse> {
  return authedRequest("/api/v1/student/homeworks", { accessToken, signal });
}
export function submitHomework(accessToken: string, id: string, answers: string[][], confirmBlank = false): Promise<HomeworkSubmissionResponse> {
  return authedRequest(`/api/v1/homeworks/${pathParam(id)}/submissions`, { accessToken, method: "POST", body: { answers, confirmBlank } });
}
export function manageHomework(accessToken: string, id: string, body: HomeworkManageRequest): Promise<unknown> {
  return authedRequest(`/api/v1/homeworks/${pathParam(id)}/manage`, { accessToken, method: "POST", body });
}
export function correctHomework(accessToken: string, id: string, studentID: string, body: HomeworkCorrectRequest): Promise<unknown> {
  return authedRequest(`/api/v1/homeworks/${pathParam(id)}/students/${pathParam(studentID)}/corrections`, { accessToken, method: "POST", body });
}
