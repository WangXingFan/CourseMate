package learning

import "time"

type LearningCourseLessonSummary struct {
	ID              string `json:"id"`
	Number          string `json:"number"`
	Title           string `json:"title"`
	Chapter         string `json:"chapter"`
	CompletedStages int    `json:"completedStages"`
	MasteredStages  int    `json:"masteredStages"`
}

type LearningCourseResponse struct {
	ID         string                        `json:"id"`
	Version    string                        `json:"version"`
	Title      string                        `json:"title"`
	Language   string                        `json:"language"`
	SourceName string                        `json:"sourceName"`
	Lessons    []LearningCourseLessonSummary `json:"lessons"`
}

type LearningCourseField struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Unit  string `json:"unit"`
}

type LearningCourseQuestion struct {
	ID      string                `json:"id"`
	Stage   string                `json:"stage"`
	Prompt  string                `json:"prompt"`
	Options []string              `json:"options"`
	Formula string                `json:"formula"`
	Fields  []LearningCourseField `json:"fields"`
}

type LearningLessonFieldResult struct {
	ID       string `json:"id"`
	Correct  bool   `json:"correct"`
	Expected string `json:"expected"`
}

type LearningLessonAttemptResponse struct {
	ID          string                      `json:"id"`
	Version     string                      `json:"version"`
	LessonID    string                      `json:"lessonId"`
	QuestionID  string                      `json:"questionId"`
	Stage       string                      `json:"stage"`
	Answers     map[string]string           `json:"answers"`
	Score       int                         `json:"score"`
	Total       int                         `json:"total"`
	Results     []LearningLessonFieldResult `json:"results"`
	Explanation string                      `json:"explanation"`
	CreatedAt   time.Time                   `json:"createdAt"`
}

type LearningCourseLessonResponse struct {
	Version   string                          `json:"version"`
	Lesson    LearningCourseLessonSummary     `json:"lesson"`
	Markdown  string                          `json:"markdown"`
	Questions []LearningCourseQuestion        `json:"questions"`
	Attempts  []LearningLessonAttemptResponse `json:"attempts"`
}

type LearningLessonAttemptRequest struct {
	ID         string            `json:"id" binding:"required,uuid"`
	Version    string            `json:"version" binding:"required,max=32"`
	LessonID   string            `json:"lessonId" binding:"required,max=64"`
	QuestionID string            `json:"questionId" binding:"required,max=96"`
	Answers    map[string]string `json:"answers" binding:"required,max=12,dive,max=64"`
}
