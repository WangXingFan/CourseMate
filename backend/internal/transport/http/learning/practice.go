package learning

import (
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

type LearningPracticeProgress struct {
	QuestionID string `json:"questionId"`
	Correct    bool   `json:"correct"`
}

type LearningPracticeBankResponse struct {
	ConceptID  string                     `json:"conceptId"`
	Title      string                     `json:"title"`
	Topic      string                     `json:"topic"`
	ReviewHref string                     `json:"reviewHref"`
	Questions  []LearningCourseQuestion   `json:"questions"`
	Progress   []LearningPracticeProgress `json:"progress"`
}

type LearningPracticeAnswerRequest struct {
	ID         string            `json:"id" binding:"required,uuid"`
	ConceptID  string            `json:"conceptId" binding:"required,max=64"`
	QuestionID string            `json:"questionId" binding:"required,max=96"`
	Locale     string            `json:"locale" binding:"omitempty,oneof=zh-CN en-US"`
	Answers    map[string]string `json:"answers" binding:"required,max=12,dive,max=64"`
}

// PracticeBank godoc
// @Summary Read a personal topic practice bank without answer keys
// @Tags learning
// @Produce json
// @Security BearerAuth
// @Param conceptId query string true "Mastery concept ID"
// @Param locale query string false "zh-CN or en-US"
// @Success 200 {object} LearningPracticeBankResponse
// @Failure 400 {object} response.Envelope
// @Failure 401 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /learning/practice-bank [get]
func (m *Module) PracticeBank(c *gin.Context) {
	bank, attempts, err := m.service.PracticeBank(c.Request.Context(), middleware.MustUserID(c), c.Query("conceptId"), c.Query("locale"))
	if err != nil {
		writeError(c, err)
		return
	}
	view := LearningPracticeBankResponse{ConceptID: bank.Concept.ID, Title: bank.Concept.Title, Topic: bank.Concept.Topic, ReviewHref: bank.Concept.ReviewHref,
		Questions: []LearningCourseQuestion{}, Progress: []LearningPracticeProgress{}}
	for _, q := range bank.Questions {
		fields := []LearningCourseField{}
		for _, field := range q.Fields {
			fields = append(fields, LearningCourseField{ID: field.ID, Label: field.Label, Unit: field.Unit})
		}
		view.Questions = append(view.Questions, LearningCourseQuestion{ID: q.ID, Stage: q.Stage, Prompt: q.Prompt, Options: q.Options, Formula: q.Formula, Fields: fields})
	}
	for _, item := range attempts {
		view.Progress = append(view.Progress, LearningPracticeProgress{QuestionID: item.QuestionID, Correct: item.Score == item.Total})
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, view)
}

// SubmitPractice godoc
// @Summary Grade and save a topic practice answer and update mastery evidence
// @Tags learning
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body LearningPracticeAnswerRequest true "Topic practice answer"
// @Success 200 {object} LearningLessonAttemptResponse
// @Failure 400 {object} response.Envelope
// @Failure 401 {object} response.Envelope
// @Failure 409 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /learning/practice-attempts [post]
func (m *Module) SubmitPractice(c *gin.Context) {
	var input LearningPracticeAnswerRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	attempt, err := m.service.SubmitPractice(c.Request.Context(), middleware.MustUserID(c), input.ID, input.ConceptID, input.QuestionID, input.Locale, input.Answers)
	if err != nil {
		writeError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, lessonAttemptResponse(*attempt))
}
