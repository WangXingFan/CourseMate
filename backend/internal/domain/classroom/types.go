package classroom

import "time"

type Classroom struct {
	ID           uint
	PublicID     string
	TeacherID    uint
	TeacherName  string
	Name         string
	Description  string
	StudentCount int64
	CreatedAt    time.Time
}

type Student struct {
	PublicID    string
	Username    string
	DisplayName string
}

const (
	QuizPhasePreClass = "pre_class"
	QuizPhaseInClass  = "in_class"

	QuizStatusDraft  = "draft"
	QuizStatusOpen   = "open"
	QuizStatusClosed = "closed"
)

// QuizQuestion is stored as JSON on the quiz record. Answer is the zero-based
// index of the correct option and is never exposed to students.
type QuizQuestion struct {
	ID      string
	Prompt  string
	Options []string
	Answer  int
}

// QuizLesson describes a course lesson whose preview question can be assigned.
type QuizLesson struct {
	ID      string
	Number  string
	Title   string
	Chapter string
	Prompt  string
	Options []string
}

type Quiz struct {
	ID              uint
	PublicID        string
	ClassroomID     uint
	TeacherID       uint
	Title           string
	Phase           string
	Status          string
	Questions       []QuizQuestion
	CreatedAt       time.Time
	OpenedAt        *time.Time
	ClosedAt        *time.Time
	SubmissionCount int64
	Submitted       bool
	Score           int
	Answers         []int
}

type QuizSubmission struct {
	ID              uint
	QuizID          uint
	StudentID       uint
	StudentPublicID string
	StudentName     string
	Username        string
	Answers         []int
	Score           int
	SubmittedAt     time.Time
}
