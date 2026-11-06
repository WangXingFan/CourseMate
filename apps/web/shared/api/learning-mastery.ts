import type { ClassroomMasteryResponse, Learning, LearningMasteryResponse } from "@deeix/api-contract";
import { authedRequest } from "@/shared/api/authed-client";
import { pathParam } from "@/shared/api/http-client";

export type LearningMasteryData = LearningMasteryResponse;
export type MasteryConcept = LearningMasteryData["concepts"][number];
export type ClassroomMasteryData = ClassroomMasteryResponse;
export type MasteryPeriod = Learning.MasteryList.RequestQuery;

function periodQuery(period: MasteryPeriod): string {
  const query = new URLSearchParams();
  if (period.startAt) query.set("startAt", period.startAt);
  if (period.endAt) query.set("endAt", period.endAt);
  return query.size ? `?${query}` : "";
}

export function getLearningMastery(accessToken: string, period: MasteryPeriod, signal?: AbortSignal): Promise<LearningMasteryData> {
  return authedRequest(`/api/v1/learning/mastery${periodQuery(period)}`, { accessToken, signal });
}
export function getClassroomMastery(accessToken: string, classroomID: string, period: MasteryPeriod, signal?: AbortSignal): Promise<ClassroomMasteryData> {
  return authedRequest(`/api/v1/classrooms/${pathParam(classroomID)}/mastery${periodQuery(period)}`, { accessToken, signal }, true);
}
export function getStudentMastery(accessToken: string, classroomID: string, studentID: string, period: MasteryPeriod, signal?: AbortSignal): Promise<LearningMasteryData> {
  return authedRequest(`/api/v1/classrooms/${pathParam(classroomID)}/students/${pathParam(studentID)}/mastery${periodQuery(period)}`, { accessToken, signal }, true);
}
