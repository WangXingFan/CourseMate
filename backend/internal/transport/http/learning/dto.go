package learning

import "time"

type LearningAttemptRequest struct {
	ID         string `json:"id" binding:"required,uuid"`
	QuestionID string `json:"questionId" binding:"required,max=64"`
	Selected   *int   `json:"selected" binding:"required,min=0,max=3"`
}

type LearningAttemptResponse struct {
	ID         string    `json:"id"`
	QuestionID string    `json:"questionId"`
	Selected   int       `json:"selected"`
	Correct    bool      `json:"correct"`
	CreatedAt  time.Time `json:"createdAt"`
}

type LearningAttemptData struct {
	Attempt LearningAttemptResponse `json:"attempt"`
}

type LearningQuestionResponse struct {
	ID           string                   `json:"id"`
	Answer       int                      `json:"answer"`
	Topic        string                   `json:"topic"`
	Lesson       string                   `json:"lesson"`
	Attempts     int64                    `json:"attempts"`
	CorrectCount int64                    `json:"correctCount"`
	Latest       *LearningAttemptResponse `json:"latest" extensions:"x-nullable"`
}

type LearningProgressResponse struct {
	AccountID uint                       `json:"accountId"`
	Questions []LearningQuestionResponse `json:"questions"`
	Recent    []LearningAttemptResponse  `json:"recent"`
}
