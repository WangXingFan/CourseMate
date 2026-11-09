export type ClassroomDraft = {
  id?: string;
  name: string;
  description: string;
};

export type ClassroomMobileView = "list" | "detail";

export type ClassroomDetailTab = "overview" | "practice" | "students" | "activities" | "mastery" | "performance" | "ai_activity" | "attendance" | "homeworks";

export type QuizDraft = {
  phase: "pre_class" | "in_class" | "after_class";
  title: string;
  lessonIds: string[];
};
