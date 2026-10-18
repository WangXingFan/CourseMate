package classroom

import "time"

// QuizQuestionRequest is one question supplied by a teacher.
type QuizQuestionRequest struct {
	Prompt  string   `json:"prompt"`
	Options []string `json:"options"`
	Answer  int      `json:"answer"`
}

// CreateQuizRequest creates a draft quiz for a classroom.
type CreateQuizRequest struct {
	Title     string                `json:"title"`
	Phase     string                `json:"phase"`
	Questions []QuizQuestionRequest `json:"questions"`
}

// QuizQuestionResponse is the teacher view and includes the correct option.
type QuizQuestionResponse struct {
	ID      string   `json:"id"`
	Prompt  string   `json:"prompt"`
	Options []string `json:"options"`
	Answer  int      `json:"answer"`
}

// QuizResponse is the teacher-facing quiz summary.
type QuizResponse struct {
	ID              string                 `json:"id"`
	Title           string                 `json:"title"`
	Phase           string                 `json:"phase"`
	Status          string                 `json:"status"`
	Questions       []QuizQuestionResponse `json:"questions"`
	SubmissionCount int64                  `json:"submissionCount"`
	CreatedAt       time.Time              `json:"createdAt"`
	OpenedAt        *time.Time             `json:"openedAt"`
	ClosedAt        *time.Time             `json:"closedAt"`
}

// QuizListResponse is a teacher quiz list.
type QuizListResponse struct {
	Quizzes []QuizResponse `json:"quizzes"`
}

// QuizDataResponse wraps a single quiz.
type QuizDataResponse struct {
	Quiz QuizResponse `json:"quiz"`
}

// QuizSubmissionResponse is one student's submitted answer sheet.
type QuizSubmissionResponse struct {
	StudentID   string    `json:"studentId"`
	StudentName string    `json:"studentName"`
	Username    string    `json:"username"`
	Answers     []int     `json:"answers"`
	Score       int       `json:"score"`
	SubmittedAt time.Time `json:"submittedAt"`
}

// QuizQuestionStatisticsResponse aggregates the option distribution.
type QuizQuestionStatisticsResponse struct {
	ID           string   `json:"id"`
	Prompt       string   `json:"prompt"`
	Options      []string `json:"options"`
	Answer       int      `json:"answer"`
	OptionCounts []int    `json:"optionCounts"`
	CorrectCount int      `json:"correctCount"`
}

// QuizStatisticsResponse summarizes completion and correctness.
type QuizStatisticsResponse struct {
	StudentCount    int                              `json:"studentCount"`
	SubmissionCount int                              `json:"submissionCount"`
	AverageScore    float64                          `json:"averageScore"`
	Questions       []QuizQuestionStatisticsResponse `json:"questions"`
}

// QuizReportResponse is the teacher statistics view.
type QuizReportResponse struct {
	Quiz        QuizResponse             `json:"quiz"`
	Students    []StudentResponse        `json:"students"`
	Submissions []QuizSubmissionResponse `json:"submissions"`
	Missing     []StudentResponse        `json:"missing"`
	Statistics  QuizStatisticsResponse   `json:"statistics"`
}

// StudentQuizQuestionResponse never contains the correct option.
type StudentQuizQuestionResponse struct {
	ID      string   `json:"id"`
	Prompt  string   `json:"prompt"`
	Options []string `json:"options"`
}

// StudentQuizResponse is the student-facing quiz view.
type StudentQuizResponse struct {
	ID        string                        `json:"id"`
	Title     string                        `json:"title"`
	Phase     string                        `json:"phase"`
	Status    string                        `json:"status"`
	Questions []StudentQuizQuestionResponse `json:"questions"`
	OpenedAt  *time.Time                    `json:"openedAt"`
	Submitted bool                          `json:"submitted"`
	Score     int                           `json:"score"`
	Answers   []int                         `json:"answers"`
}

// StudentQuizListResponse is the current classroom and its open quizzes.
type StudentQuizListResponse struct {
	Classroom ClassroomResponse     `json:"classroom"`
	Quizzes   []StudentQuizResponse `json:"quizzes"`
}

// SubmitQuizRequest contains one option index per question.
type SubmitQuizRequest struct {
	Answers []int `json:"answers" binding:"required"`
}

// QuizSubmissionResultResponse reports the score without revealing answers.
type QuizSubmissionResultResponse struct {
	Score     int  `json:"score"`
	Total     int  `json:"total"`
	Submitted bool `json:"submitted"`
}
