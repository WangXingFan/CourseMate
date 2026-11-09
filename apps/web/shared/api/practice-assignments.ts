import type { AssignedPracticeSubmissionResponse, PracticeAssignmentResponse, PracticeAssignmentsResponse, PracticeCandidatesResponse, PracticePublishRequest } from "@deeix/api-contract";
import { authedRequest } from "@/shared/api/authed-client";
import { pathParam } from "@/shared/api/http-client";

export function listAssignedPractice(accessToken: string, classroomID?: string, signal?: AbortSignal): Promise<PracticeAssignmentsResponse> {
  return authedRequest(`/api/v1/${classroomID ? `classrooms/${pathParam(classroomID)}` : "student"}/practice-assignments`, { accessToken, signal });
}
export function getPracticeCandidates(accessToken: string, classroomID: string, concept: string, locale: string, signal?: AbortSignal): Promise<PracticeCandidatesResponse> {
  return authedRequest(`/api/v1/classrooms/${pathParam(classroomID)}/practice-candidates?${new URLSearchParams({ conceptId: concept, locale })}`, { accessToken, signal });
}
export function publishAssignedPractice(accessToken: string, classroomID: string, body: PracticePublishRequest): Promise<PracticeAssignmentResponse> {
  return authedRequest(`/api/v1/classrooms/${pathParam(classroomID)}/practice-assignments`, { accessToken, method: "POST", body });
}
export function submitAssignedPractice(accessToken: string, id: string, answers: Record<string, Record<string, string>>): Promise<AssignedPracticeSubmissionResponse> {
  return authedRequest(`/api/v1/practice-assignments/${pathParam(id)}/submissions`, { accessToken, method: "POST", body: { answers } });
}
