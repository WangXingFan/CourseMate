import type {
  AddStudentRequest as ContractAddStudentRequest,
  ClassroomDataResponse,
  ClassroomListResponse,
  ClassroomMutationResponse,
  ClassroomResponse,
  CreateClassroomRequest as ContractCreateClassroomRequest,
  StudentListResponse,
  StudentResponse,
  UpdateClassroomRequest as ContractUpdateClassroomRequest,
} from "@deeix/api-contract";

export type ClassroomDTO = ClassroomResponse;
export type ClassroomListData = ClassroomListResponse;
export type ClassroomData = ClassroomDataResponse;
export type ClassroomMutationData = ClassroomMutationResponse;
export type ClassroomStudentDTO = StudentResponse;
export type ClassroomStudentListData = StudentListResponse;
export type CreateClassroomPayload = ContractCreateClassroomRequest;
export type UpdateClassroomPayload = ContractUpdateClassroomRequest;
export type AddClassroomStudentPayload = ContractAddStudentRequest;

export type ClassroomQuizPhase = "pre_class" | "in_class";
export type ClassroomQuizStatus = "draft" | "open" | "closed";

export type ClassroomQuizQuestionDTO = {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
};

export type ClassroomQuizDTO = {
  id: string;
  title: string;
  phase: ClassroomQuizPhase;
  status: ClassroomQuizStatus;
  questions: ClassroomQuizQuestionDTO[];
  submissionCount: number;
  createdAt: string;
  openedAt: string | null;
  closedAt: string | null;
};

export type ClassroomQuizListData = {
  quizzes: ClassroomQuizDTO[];
};

export type ClassroomQuizData = {
  quiz: ClassroomQuizDTO;
};

export type CreateClassroomQuizPayload = {
  title: string;
  phase: ClassroomQuizPhase;
  questions: Array<{
    prompt: string;
    options: string[];
    answer: number;
  }>;
};

export type ClassroomQuizSubmissionDTO = {
  studentId: string;
  studentName: string;
  username: string;
  answers: number[];
  score: number;
  submittedAt: string;
};

export type ClassroomQuizQuestionStatisticsDTO = {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  optionCounts: number[];
  correctCount: number;
};

export type ClassroomQuizReportDTO = {
  quiz: ClassroomQuizDTO;
  students: ClassroomStudentDTO[];
  submissions: ClassroomQuizSubmissionDTO[];
  missing: ClassroomStudentDTO[];
  statistics: {
    studentCount: number;
    submissionCount: number;
    averageScore: number;
    questions: ClassroomQuizQuestionStatisticsDTO[];
  };
};

export type StudentClassroomQuizQuestionDTO = {
  id: string;
  prompt: string;
  options: string[];
};

export type StudentClassroomQuizDTO = {
  id: string;
  title: string;
  phase: ClassroomQuizPhase;
  status: ClassroomQuizStatus;
  questions: StudentClassroomQuizQuestionDTO[];
  openedAt: string | null;
  submitted: boolean;
  score: number;
  answers: number[] | null;
};

export type StudentClassroomQuizListData = {
  classroom: ClassroomDTO;
  quizzes: StudentClassroomQuizDTO[];
};

export type SubmitClassroomQuizPayload = {
  answers: number[];
};

export type SubmitClassroomQuizData = {
  score: number;
  total: number;
  submitted: boolean;
};
