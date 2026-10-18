export type ClassroomDraft = {
  id?: string;
  name: string;
  description: string;
};

export type ClassroomMobileView = "list" | "detail";

export type ClassroomDetailTab = "students" | "activities";

export type QuizDraftQuestion = {
  prompt: string;
  options: string[];
  answer: number;
};

export type QuizDraft = {
  title: string;
  phase: "pre_class" | "in_class";
  questions: QuizDraftQuestion[];
};
