package learning

import (
	"errors"
	"net/http"

	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/learning"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

type Module struct{ service *app.Service }

func NewModule(service *app.Service) *Module { return &Module{service: service} }

func (m *Module) RegisterRoutes(group *gin.RouterGroup) {
	group.GET("/learning/progress", m.Progress)
	group.POST("/learning/attempts", m.Submit)
}

// Progress godoc
// @Summary Read personal practice progress and the latest 40 answers
// @Tags learning
// @Produce json
// @Security BearerAuth
// @Success 200 {object} LearningProgressResponse
// @Failure 401 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /learning/progress [get]
func (m *Module) Progress(c *gin.Context) {
	progress, err := m.service.Progress(c.Request.Context(), middleware.MustUserID(c))
	if err != nil {
		writeError(c, err)
		return
	}
	view := LearningProgressResponse{AccountID: middleware.MustUserID(c), Questions: make([]LearningQuestionResponse, 0), Recent: make([]LearningAttemptResponse, 0)}
	byQuestion := make(map[string]domain.QuestionProgress, len(progress.Questions))
	for _, item := range progress.Questions {
		byQuestion[item.QuestionID] = item
	}
	for _, question := range domain.Questions() {
		item := byQuestion[question.ID]
		entry := LearningQuestionResponse{ID: question.ID, Answer: question.Answer, Topic: question.Topic, Lesson: question.Lesson, Attempts: item.Attempts, CorrectCount: item.CorrectCount}
		if item.Attempts > 0 {
			latest := toResponse(item.Latest)
			entry.Latest = &latest
		}
		view.Questions = append(view.Questions, entry)
	}
	for _, attempt := range progress.Recent {
		view.Recent = append(view.Recent, toResponse(attempt))
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, view)
}

// Submit godoc
// @Summary Save a personal practice answer, deduplicated by account and attempt ID
// @Tags learning
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body LearningAttemptRequest true "Practice answer"
// @Success 200 {object} LearningAttemptData
// @Failure 400 {object} response.Envelope
// @Failure 401 {object} response.Envelope
// @Failure 409 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /learning/attempts [post]
func (m *Module) Submit(c *gin.Context) {
	var input LearningAttemptRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	attempt, err := m.service.Submit(c.Request.Context(), middleware.MustUserID(c), input.ID, input.QuestionID, *input.Selected)
	if err != nil {
		writeError(c, err)
		return
	}
	response.Success(c, LearningAttemptData{Attempt: toResponse(*attempt)})
}

func toResponse(item domain.Attempt) LearningAttemptResponse {
	return LearningAttemptResponse{ID: item.ID, QuestionID: item.QuestionID, Selected: item.Selected, Correct: item.Correct, CreatedAt: item.CreatedAt}
}

func writeError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, app.ErrInvalid):
		response.ErrorFrom(c, http.StatusBadRequest, err)
	case errors.Is(err, app.ErrConflict):
		response.ErrorFrom(c, http.StatusConflict, err)
	default:
		response.InternalError(c)
	}
}
