package learning

import "time"

type LearningAttemptRequest struct {
	ID         string `json:"id" binding:"required,uuid"`
	QuestionID string `json:"questionId" binding:"required,max=64"`
	Selected   *int   `json:"selected" binding:"required,min=0,max=3"`
}

type LearningReviewRequest struct {
	ID             string `json:"id" binding:"required,uuid"`
	BaseQuestionID string `json:"baseQuestionId" binding:"required,max=64"`
	VariantID      string `json:"variantId" binding:"required,max=64"`
	Selected       *int   `json:"selected" binding:"required,min=0,max=3"`
	Locale         string `json:"locale" binding:"omitempty,max=16"`
}

type LearningAttemptResponse struct {
	ID           string     `json:"id"`
	QuestionID   string     `json:"questionId"`
	Answer       int        `json:"answer"`
	Selected     int        `json:"selected"`
	Correct      bool       `json:"correct"`
	Mode         string     `json:"mode"`
	VariantID    string     `json:"variantId"`
	ReviewStage  int        `json:"reviewStage"`
	NextReviewAt *time.Time `json:"nextReviewAt" extensions:"x-nullable"`
	CreatedAt    time.Time  `json:"createdAt"`
}

type LearningAttemptData struct {
	Attempt     LearningAttemptResponse `json:"attempt"`
	Explanation string                  `json:"explanation"`
}

type LearningVariantResponse struct {
	ID             string   `json:"id"`
	BaseQuestionID string   `json:"baseQuestionId"`
	Prompt         string   `json:"prompt"`
	Options        []string `json:"options"`
	Lesson         string   `json:"lesson"`
}

type LearningQuestionResponse struct {
	ID                 string                   `json:"id"`
	Answer             int                      `json:"answer"`
	Topic              string                   `json:"topic"`
	Lesson             string                   `json:"lesson"`
	Attempts           int64                    `json:"attempts"`
	CorrectCount       int64                    `json:"correctCount"`
	Latest             *LearningAttemptResponse `json:"latest" extensions:"x-nullable"`
	LatestWrong        *LearningAttemptResponse `json:"latestWrong" extensions:"x-nullable"`
	Misconception      string                   `json:"misconception"`
	SuggestedVariantID string                   `json:"suggestedVariantId"`
	ReviewStage        int                      `json:"reviewStage"`
	NextReviewAt       *time.Time               `json:"nextReviewAt" extensions:"x-nullable"`
	ReviewDue          bool                     `json:"reviewDue"`
}

type LearningProgressResponse struct {
	AccountID uint                       `json:"accountId"`
	Questions []LearningQuestionResponse `json:"questions"`
	Recent    []LearningAttemptResponse  `json:"recent"`
}

type LearningTutorRequest struct {
	ExperimentID string         `json:"experimentId" binding:"required,max=64"`
	Action       string         `json:"action" binding:"required,oneof=hint explain"`
	Locale       string         `json:"locale" binding:"omitempty,max=16"`
	Parameters   map[string]any `json:"parameters"`
	PlotSummary  string         `json:"plotSummary" binding:"max=2000"`
	Selected     string         `json:"selected" binding:"max=200"`
	Reason       string         `json:"reason" binding:"max=1200"`
	Correct      bool           `json:"correct"`
}

type LearningTutorCitation struct {
	ID      string `json:"id"`
	Chapter string `json:"chapter"`
	Section string `json:"section"`
	Href    string `json:"href"`
}

type LearningTutorResponse struct {
	Source    string                  `json:"source"`
	Summary   string                  `json:"summary"`
	Steps     []string                `json:"steps"`
	Citations []LearningTutorCitation `json:"citations"`
}
