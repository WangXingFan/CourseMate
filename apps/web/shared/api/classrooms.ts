import { authedRequest } from "@/shared/api/authed-client";
import { pathParam } from "@/shared/api/http-client";
import type {
  AddClassroomStudentPayload,
  ClassroomData,
  ClassroomListData,
  ClassroomMutationData,
  ClassroomQuizData,
  ClassroomQuizListData,
  ClassroomQuizLessonListData,
  ClassroomQuizReportDTO,
  ClassroomStudentListData,
  CreateStudentAccountPayload,
  CreateStudentAccountData,
  CreateClassroomQuizPayload,
  CreateClassroomPayload,
  StudentClassroomQuizListData,
  SubmitClassroomQuizData,
  SubmitClassroomQuizPayload,
  StudentCredentialDTO,
  StudentImportResultDTO,
  ImportStudentsPayload,
  UpdateClassroomPayload,
} from "@/shared/api/classroom-types";

const CLASSROOMS_PATH = "/api/v1/classrooms";

export async function listClassrooms(accessToken: string, signal?: AbortSignal): Promise<ClassroomListData> {
  return authedRequest<ClassroomListData>(CLASSROOMS_PATH, { accessToken, signal }, true);
}

export async function createClassroom(accessToken: string, payload: CreateClassroomPayload): Promise<ClassroomData> {
  return authedRequest<ClassroomData>(CLASSROOMS_PATH, { method: "POST", accessToken, body: payload }, true);
}

export async function updateClassroom(
  accessToken: string,
  classroomID: string,
  payload: UpdateClassroomPayload,
): Promise<ClassroomMutationData> {
  return authedRequest<ClassroomMutationData>(
    `${CLASSROOMS_PATH}/${pathParam(classroomID)}`,
    { method: "PATCH", accessToken, body: payload },
    true,
  );
}

export async function deleteClassroom(accessToken: string, classroomID: string): Promise<ClassroomMutationData> {
  return authedRequest<ClassroomMutationData>(
    `${CLASSROOMS_PATH}/${pathParam(classroomID)}`,
    { method: "DELETE", accessToken },
    true,
  );
}

export async function listClassroomStudents(
  accessToken: string,
  classroomID: string,
  signal?: AbortSignal,
): Promise<ClassroomStudentListData> {
  return authedRequest<ClassroomStudentListData>(
    `${CLASSROOMS_PATH}/${pathParam(classroomID)}/students`,
    { accessToken, signal },
    true,
  );
}

export async function addClassroomStudent(
  accessToken: string,
  classroomID: string,
  payload: AddClassroomStudentPayload,
): Promise<ClassroomMutationData> {
  return authedRequest<ClassroomMutationData>(
    `${CLASSROOMS_PATH}/${pathParam(classroomID)}/students`,
    { method: "POST", accessToken, body: payload },
    true,
  );
}

export async function createClassroomStudentAccount(
  accessToken: string,
  classroomID: string,
  payload: CreateStudentAccountPayload,
): Promise<StudentCredentialDTO> {
  const data = await authedRequest<CreateStudentAccountData>(
    `${CLASSROOMS_PATH}/${pathParam(classroomID)}/students/accounts`,
    { method: "POST", accessToken, body: payload },
    true,
  );
  return data.student;
}

export async function importClassroomStudentAccounts(
  accessToken: string,
  classroomID: string,
  csv: string,
): Promise<StudentImportResultDTO> {
  return authedRequest<StudentImportResultDTO>(
    `${CLASSROOMS_PATH}/${pathParam(classroomID)}/students/accounts/import`,
    { method: "POST", accessToken, body: { csv } satisfies ImportStudentsPayload },
    true,
  );
}

export async function removeClassroomStudent(
  accessToken: string,
  classroomID: string,
  studentID: string,
): Promise<ClassroomMutationData> {
  return authedRequest<ClassroomMutationData>(
    `${CLASSROOMS_PATH}/${pathParam(classroomID)}/students/${pathParam(studentID)}`,
    { method: "DELETE", accessToken },
    true,
  );
}

export async function listClassroomQuizzes(
  accessToken: string,
  classroomID: string,
  signal?: AbortSignal,
): Promise<ClassroomQuizListData> {
  return authedRequest<ClassroomQuizListData>(
    `${CLASSROOMS_PATH}/${pathParam(classroomID)}/quizzes`,
    { accessToken, signal },
    true,
  );
}

export async function listClassroomQuizLessons(
  accessToken: string,
  classroomID: string,
  signal?: AbortSignal,
): Promise<ClassroomQuizLessonListData> {
  return authedRequest<ClassroomQuizLessonListData>(
    `${CLASSROOMS_PATH}/${pathParam(classroomID)}/quiz-lessons`,
    { accessToken, signal },
    true,
  );
}

export async function createClassroomQuiz(
  accessToken: string,
  classroomID: string,
  payload: CreateClassroomQuizPayload,
): Promise<ClassroomQuizData> {
  return authedRequest<ClassroomQuizData>(
    `${CLASSROOMS_PATH}/${pathParam(classroomID)}/quizzes`,
    { method: "POST", accessToken, body: payload },
    true,
  );
}

export async function openClassroomQuiz(accessToken: string, quizID: string): Promise<ClassroomMutationData> {
  return authedRequest<ClassroomMutationData>(
    `/api/v1/quizzes/${pathParam(quizID)}/open`,
    { method: "POST", accessToken },
    true,
  );
}

export async function closeClassroomQuiz(accessToken: string, quizID: string): Promise<ClassroomMutationData> {
  return authedRequest<ClassroomMutationData>(
    `/api/v1/quizzes/${pathParam(quizID)}/close`,
    { method: "POST", accessToken },
    true,
  );
}

export async function getClassroomQuizReport(
  accessToken: string,
  quizID: string,
  signal?: AbortSignal,
): Promise<ClassroomQuizReportDTO> {
  return authedRequest<ClassroomQuizReportDTO>(
    `/api/v1/quizzes/${pathParam(quizID)}/submissions`,
    { accessToken, signal },
    true,
  );
}

export async function listStudentQuizzes(
  accessToken: string,
  signal?: AbortSignal,
): Promise<StudentClassroomQuizListData> {
  return authedRequest<StudentClassroomQuizListData>("/api/v1/student/quizzes", { accessToken, signal }, true);
}

export async function submitClassroomQuiz(
  accessToken: string,
  quizID: string,
  payload: SubmitClassroomQuizPayload,
): Promise<SubmitClassroomQuizData> {
  return authedRequest<SubmitClassroomQuizData>(
    `/api/v1/quizzes/${pathParam(quizID)}/submissions`,
    { method: "POST", accessToken, body: payload },
    true,
  );
}
