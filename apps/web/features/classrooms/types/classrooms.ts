export type ClassroomDraft = {
  id?: string;
  name: string;
  description: string;
};

export type ClassroomMobileView = "list" | "detail";

export type ClassroomDetailTab = "students" | "activities";

export type QuizDraft = {
  title: string;
  lessonIds: string[];
};
