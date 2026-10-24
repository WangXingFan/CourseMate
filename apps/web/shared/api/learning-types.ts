import type {
  LearningAttemptData,
  LearningAttemptRequest,
  LearningAttemptResponse,
  LearningProgressResponse,
  LearningQuestionResponse,
  LearningTutorRequest,
  LearningTutorResponse,
  LearningReviewRequest,
  LearningVariantResponse,
  LearningCourseResponse,
  LearningCourseLessonResponse,
  LearningCourseQuestion,
  LearningLessonAttemptRequest,
  LearningLessonAttemptResponse,
} from "@deeix/api-contract";

export type LearningAttemptDTO = LearningAttemptResponse;
export type LearningAttemptPayload = LearningAttemptRequest;
export type LearningAttemptResult = LearningAttemptData;
export type LearningProgressData = LearningProgressResponse;
export type LearningQuestionDTO = LearningQuestionResponse;
export type LearningTutorPayload = LearningTutorRequest;
export type LearningTutorData = LearningTutorResponse;
export type LearningReviewPayload = LearningReviewRequest;
export type LearningVariantData = LearningVariantResponse;
export type LearningCourseData = LearningCourseResponse;
export type LearningCourseLessonData = LearningCourseLessonResponse;
export type LearningCourseQuestionDTO = LearningCourseQuestion;
export type LearningLessonAnswerPayload = LearningLessonAttemptRequest;
export type LearningLessonAnswerData = LearningLessonAttemptResponse;
