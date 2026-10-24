package learning

import "time"

// Question identifies a versioned self-practice question. Keep IDs immutable
// when changing the meaning or correct option of an existing question.
type Question struct {
	ID             string
	ChapterID      string
	Answer         int
	Topic          string
	Lesson         string
	Misconceptions map[int]string
}

type Attempt struct {
	ID           string
	UserID       uint
	QuestionID   string
	Selected     int
	Correct      bool
	Mode         string
	VariantID    string
	ReviewStage  int
	NextReviewAt *time.Time
	CreatedAt    time.Time
}

type QuestionProgress struct {
	QuestionID         string
	Attempts           int64
	CorrectCount       int64
	Latest             Attempt
	LatestWrong        *Attempt
	ReviewStage        int
	NextReviewAt       *time.Time
	SuggestedVariantID string
}

type Progress struct {
	Questions []QuestionProgress
	Recent    []Attempt
}

const (
	AttemptModeQuiz   = "quiz"
	AttemptModeReview = "review"
)
