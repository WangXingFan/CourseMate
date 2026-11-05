package classroom

import (
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"time"
)

type HomeworkPublishRequest struct {
	BankID   string    `json:"bankId" binding:"required,max=64"`
	StartsAt time.Time `json:"startsAt" binding:"required"`
	Deadline time.Time `json:"deadline" binding:"required"`
}
type HomeworkSubmitRequest struct {
	Answers [][]string `json:"answers" binding:"required,min=1,max=40,dive,min=1,max=10,dive,required,max=200"`
}
type HomeworkQuestionResponse struct {
	ID         string     `json:"id"`
	Kind       string     `json:"kind"`
	Prompt     string     `json:"prompt"`
	Options    []string   `json:"options"`
	Points     int        `json:"points"`
	BlankCount int        `json:"blankCount"`
	Accepted   [][]string `json:"accepted,omitempty"`
}
type HomeworkPaperResponse struct {
	ID        string                     `json:"id"`
	Title     string                     `json:"title"`
	Questions []HomeworkQuestionResponse `json:"questions"`
	Total     int                        `json:"total"`
}
type HomeworkBankResponse struct {
	Papers []HomeworkPaperResponse `json:"papers"`
}
type HomeworkResultResponse struct {
	QuestionID string `json:"questionId"`
	Score      int    `json:"score"`
	Total      int    `json:"total"`
	Correct    []bool `json:"correct"`
}
type HomeworkSubmissionResponse struct {
	StudentID   string                   `json:"studentId"`
	StudentName string                   `json:"studentName"`
	Username    string                   `json:"username"`
	Answers     [][]string               `json:"answers"`
	Results     []HomeworkResultResponse `json:"results"`
	Score       int                      `json:"score"`
	SubmittedAt time.Time                `json:"submittedAt"`
}
type HomeworkResponse struct {
	ID              string                      `json:"id"`
	BankID          string                      `json:"bankId"`
	Title           string                      `json:"title"`
	StartsAt        time.Time                   `json:"startsAt"`
	Deadline        time.Time                   `json:"deadline"`
	Status          string                      `json:"status"`
	QuestionCount   int                         `json:"questionCount"`
	Total           int                         `json:"total"`
	Questions       []HomeworkQuestionResponse  `json:"questions"`
	SubmissionCount int64                       `json:"submissionCount"`
	Submission      *HomeworkSubmissionResponse `json:"submission" extensions:"x-nullable"`
}
type HomeworkListResponse struct {
	Items      []HomeworkResponse `json:"items"`
	ServerTime time.Time          `json:"serverTime"`
}
type StudentHomeworksResponse struct {
	Classroom  ClassroomResponse  `json:"classroom"`
	Items      []HomeworkResponse `json:"items"`
	ServerTime time.Time          `json:"serverTime"`
}
type HomeworkReportResponse struct {
	Homework    HomeworkResponse             `json:"homework"`
	Students    []StudentResponse            `json:"students"`
	Submissions []HomeworkSubmissionResponse `json:"submissions"`
}

func homeworkQuestions(questions []domain.HomeworkQuestion, teacher bool) []HomeworkQuestionResponse {
	views := make([]HomeworkQuestionResponse, 0, len(questions))
	for _, q := range questions {
		view := HomeworkQuestionResponse{ID: q.ID, Kind: q.Kind, Prompt: q.Prompt, Options: q.Options, Points: q.Points, BlankCount: len(q.Accepted)}
		if teacher {
			view.Accepted = q.Accepted
		}
		views = append(views, view)
	}
	return views
}

func homeworkView(item domain.Homework, teacher bool, now time.Time) HomeworkResponse {
	questions := homeworkQuestions(item.Questions, teacher)
	if !teacher && item.Status(now) == "scheduled" {
		questions = []HomeworkQuestionResponse{}
	}
	return HomeworkResponse{ID: item.PublicID, BankID: item.BankID, Title: item.Title, StartsAt: item.StartsAt, Deadline: item.Deadline, Status: item.Status(now), QuestionCount: len(item.Questions), Total: item.Total(), Questions: questions, SubmissionCount: item.SubmissionCount}
}

func homeworkSubmissionView(sub domain.HomeworkSubmission) HomeworkSubmissionResponse {
	results := make([]HomeworkResultResponse, 0, len(sub.Results))
	for _, result := range sub.Results {
		results = append(results, HomeworkResultResponse{QuestionID: result.QuestionID, Score: result.Score, Total: result.Total, Correct: result.Correct})
	}
	return HomeworkSubmissionResponse{StudentID: sub.StudentPublicID, StudentName: sub.StudentName, Username: sub.Username, Answers: sub.Answers, Score: sub.Score, SubmittedAt: sub.SubmittedAt, Results: results}
}
