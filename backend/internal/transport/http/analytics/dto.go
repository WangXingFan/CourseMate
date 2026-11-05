package analytics

import "time"

type AssessmentStatsResponse struct {
	ID            string  `json:"id"`
	ClassroomID   string  `json:"classroomId"`
	ClassroomName string  `json:"classroomName"`
	ItemKey       string  `json:"itemKey"`
	Title         string  `json:"title"`
	Expected      int64   `json:"expected"`
	Started       int64   `json:"started"`
	Completed     int64   `json:"completed"`
	ScoreCount    int64   `json:"scoreCount"`
	ScoreSum      float64 `json:"scoreSum"`
	Distribution  []int64 `json:"distribution"`
}
type LessonStatsResponse struct {
	QuizID      string `json:"quizId"`
	QuizTitle   string `json:"quizTitle"`
	ClassroomID string `json:"classroomId"`
	LessonID    string `json:"lessonId"`
	Number      string `json:"number"`
	Title       string `json:"title"`
	Expected    int64  `json:"expected"`
	Answered    int64  `json:"answered"`
	Correct     int64  `json:"correct"`
}

type UsageVisitRequest struct {
	EventID string `json:"eventId" binding:"required,uuid"`
	Path    string `json:"path" binding:"required,max=100"`
}
type UsageVisitResponse struct {
	Recorded bool `json:"recorded"`
}
type UsageSummaryResponse struct {
	Visits              int64 `json:"visits"`
	Users               int64 `json:"users"`
	PracticeAnswers     int64 `json:"practiceAnswers"`
	HomeworkSubmissions int64 `json:"homeworkSubmissions"`
	QuizSubmissions     int64 `json:"quizSubmissions"`
}
type UsageDailyResponse struct {
	Date   string `json:"date"`
	Visits int64  `json:"visits"`
}
type UsageResourceResponse struct {
	Key      string `json:"key"`
	Category string `json:"category"`
	Visits   int64  `json:"visits"`
}
type UsageClassroomResponse struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Students int64  `json:"students"`
	Visits   int64  `json:"visits"`
}
type UsageReportResponse struct {
	Homeworks    []AssessmentStatsResponse `json:"homeworks"`
	Labs         []AssessmentStatsResponse `json:"labs"`
	Lessons      []LessonStatsResponse     `json:"lessons"`
	Scope        string                    `json:"scope"`
	From         string                    `json:"from"`
	Through      string                    `json:"through"`
	Timezone     string                    `json:"timezone"`
	GeneratedAt  time.Time                 `json:"generatedAt"`
	FirstVisitAt *time.Time                `json:"firstVisitAt" extensions:"x-nullable"`
	Summary      UsageSummaryResponse      `json:"summary"`
	Daily        []UsageDailyResponse      `json:"daily"`
	Resources    []UsageResourceResponse   `json:"resources"`
	Classrooms   []UsageClassroomResponse  `json:"classrooms"`
}
