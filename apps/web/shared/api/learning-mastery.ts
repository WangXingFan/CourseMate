import type { ClassroomMasteryResponse, LearningMasteryResponse } from "@deeix/api-contract";
import { authedRequest } from "@/shared/api/authed-client";
import { pathParam } from "@/shared/api/http-client";

export type LearningMasteryData = LearningMasteryResponse;
export type MasteryConcept = LearningMasteryData["concepts"][number];
export type ClassroomMasteryData = ClassroomMasteryResponse;

export function getLearningMastery(accessToken: string, signal?: AbortSignal): Promise<LearningMasteryData> {
  return authedRequest("/api/v1/learning/mastery", { accessToken, signal });
}
export function getClassroomMastery(accessToken: string, classroomID: string, signal?: AbortSignal): Promise<ClassroomMasteryData> {
  return authedRequest(`/api/v1/classrooms/${pathParam(classroomID)}/mastery`, { accessToken, signal }, true);
}
export function getStudentMastery(accessToken: string, classroomID: string, studentID: string, signal?: AbortSignal): Promise<LearningMasteryData> {
  return authedRequest(`/api/v1/classrooms/${pathParam(classroomID)}/students/${pathParam(studentID)}/mastery`, { accessToken, signal }, true);
}
