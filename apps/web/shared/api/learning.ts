import { authedRequest } from "@/shared/api/authed-client";
import type { LearningAttemptPayload, LearningAttemptResult, LearningProgressData } from "@/shared/api/learning-types";
import type { LearningTutorPayload, LearningTutorData, LearningReviewPayload, LearningVariantData } from "@/shared/api/learning-types";
import type { LearningCourseData, LearningCourseLessonData, LearningLessonAnswerPayload, LearningLessonAnswerData } from "@/shared/api/learning-types";

export function getLearningCourse(accessToken: string, signal?: AbortSignal): Promise<LearningCourseData> {
  return authedRequest<LearningCourseData>("/api/v1/learning/course", { accessToken, signal });
}

export function getLearningCourseLesson(accessToken: string, id: string, signal?: AbortSignal): Promise<LearningCourseLessonData> {
  return authedRequest<LearningCourseLessonData>(`/api/v1/learning/lessons/${encodeURIComponent(id)}`, { accessToken, signal });
}

export function saveLearningLessonAnswer(accessToken: string, payload: LearningLessonAnswerPayload, signal?: AbortSignal): Promise<LearningLessonAnswerData> {
  return authedRequest<LearningLessonAnswerData>("/api/v1/learning/lesson-attempts", { method: "POST", accessToken, body: payload, signal });
}

export async function getLearningProgress(accessToken: string, signal?: AbortSignal): Promise<LearningProgressData> {
  return authedRequest<LearningProgressData>("/api/v1/learning/progress", { accessToken, signal });
}

export async function requestLearningTutor(accessToken: string, payload: LearningTutorPayload, signal?: AbortSignal): Promise<LearningTutorData> {
  return authedRequest<LearningTutorData>("/api/v1/learning/tutor", { method: "POST", accessToken, body: payload, signal });
}

export async function getLearningVariant(accessToken: string, id: string, locale: string, signal?: AbortSignal): Promise<LearningVariantData> {
  return authedRequest<LearningVariantData>(`/api/v1/learning/variants/${encodeURIComponent(id)}?locale=${encodeURIComponent(locale)}`, { accessToken, signal });
}

export async function saveLearningReview(accessToken: string, payload: LearningReviewPayload): Promise<LearningAttemptResult> {
  return authedRequest<LearningAttemptResult>("/api/v1/learning/reviews", { method: "POST", accessToken, body: payload });
}

export async function saveLearningAttempt(accessToken: string, payload: LearningAttemptPayload): Promise<LearningAttemptResult> {
  return authedRequest<LearningAttemptResult>("/api/v1/learning/attempts", { method: "POST", accessToken, body: payload });
}
