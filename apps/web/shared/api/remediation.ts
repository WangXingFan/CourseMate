import type { RemediationBankResponse, RemediationRequest, CopyQuizRequest, QuizDataResponse } from "@deeix/api-contract";
import { authedRequest } from "@/shared/api/authed-client";
import { pathParam } from "@/shared/api/http-client";

export function getRemediationBank(accessToken: string, classroomID: string, conceptID: string, signal?: AbortSignal): Promise<RemediationBankResponse> {
  return authedRequest(`/api/v1/classrooms/${pathParam(classroomID)}/remediation-bank?conceptId=${encodeURIComponent(conceptID)}`, { accessToken, signal });
}
export function createRemediation(accessToken: string, classroomID: string, body: RemediationRequest): Promise<QuizDataResponse> {
  return authedRequest(`/api/v1/classrooms/${pathParam(classroomID)}/remediations`, { accessToken, method: "POST", body });
}
export function copyClassroomQuiz(accessToken: string, id: string, body: CopyQuizRequest): Promise<QuizDataResponse> {
  return authedRequest(`/api/v1/quizzes/${pathParam(id)}/copy`, { accessToken, method: "POST", body });
}
