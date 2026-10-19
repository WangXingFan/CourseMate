package learning

import (
	"errors"
	"math"
	"net/http"
	"strconv"
	"time"

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
	group.POST("/learning/reviews", m.SubmitReview)
	group.POST("/learning/tutor", m.Tutor)
}

// Progress godoc
// @Summary Read personal practice, diagnosis, and spaced-review progress
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
		entry := LearningQuestionResponse{
			ID:                 question.ID,
			Answer:             question.Answer,
			Topic:              question.Topic,
			Lesson:             question.Lesson,
			Attempts:           item.Attempts,
			CorrectCount:       item.CorrectCount,
			SuggestedVariantID: item.SuggestedVariantID,
			ReviewStage:        item.ReviewStage,
			NextReviewAt:       item.NextReviewAt,
			ReviewDue:          reviewDue(item.ReviewStage, item.NextReviewAt),
		}
		if item.Attempts > 0 {
			latest := toResponse(item.Latest)
			entry.Latest = &latest
		}
		if item.LatestWrong != nil {
			wrong := toResponse(*item.LatestWrong)
			entry.LatestWrong = &wrong
			if wrong.Mode == domain.AttemptModeReview {
				entry.Misconception = question.Misconceptions[(question.Answer+1)%4]
			} else {
				entry.Misconception = question.Misconceptions[wrong.Selected]
			}
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

// SubmitReview godoc
// @Summary Submit a server-graded variant review and schedule the next review
// @Tags learning
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body LearningReviewRequest true "Variant review answer"
// @Success 200 {object} LearningAttemptData
// @Failure 400 {object} response.Envelope
// @Failure 401 {object} response.Envelope
// @Failure 409 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /learning/reviews [post]
func (m *Module) SubmitReview(c *gin.Context) {
	var input LearningReviewRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	attempt, err := m.service.SubmitReview(c.Request.Context(), middleware.MustUserID(c), input.ID, input.BaseQuestionID, input.VariantID, *input.Selected)
	if err != nil {
		writeError(c, err)
		return
	}
	response.Success(c, LearningAttemptData{Attempt: toResponse(*attempt)})
}

// Tutor godoc
// @Summary Request a grounded hint or explanation for an interactive experiment
// @Tags learning
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body LearningTutorRequest true "Experiment context"
// @Success 200 {object} LearningTutorResponse
// @Failure 400 {object} response.Envelope
// @Failure 401 {object} response.Envelope
// @Router /learning/tutor [post]
func (m *Module) Tutor(c *gin.Context) {
	var input LearningTutorRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	parameters, ok := tutorParameters(input.Parameters)
	if !ok {
		writeError(c, app.ErrInvalid)
		return
	}
	result, err := m.service.Tutor(c.Request.Context(), middleware.MustUserID(c), app.TutorInput{
		ExperimentID: input.ExperimentID,
		Action:       input.Action,
		Locale:       input.Locale,
		Parameters:   parameters,
		PlotSummary:  input.PlotSummary,
		Selected:     input.Selected,
		Reason:       input.Reason,
		Correct:      input.Correct,
	})
	if err != nil {
		writeError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	citations := make([]LearningTutorCitation, 0, len(result.Citations))
	for _, citation := range result.Citations {
		citations = append(citations, LearningTutorCitation{ID: citation.ID, Chapter: citation.Chapter, Section: citation.Section, Href: citation.Href})
	}
	response.Success(c, LearningTutorResponse{Source: result.Source, Summary: result.Summary, Steps: result.Steps, Citations: citations})
}

func tutorParameters(values map[string]any) (map[string]string, bool) {
	if len(values) > 16 {
		return nil, false
	}
	result := make(map[string]string, len(values))
	for key, value := range values {
		switch typed := value.(type) {
		case string:
			result[key] = typed
		case float64:
			if math.IsNaN(typed) || math.IsInf(typed, 0) {
				return nil, false
			}
			result[key] = strconv.FormatFloat(typed, 'g', -1, 64)
		case bool:
			result[key] = strconv.FormatBool(typed)
		default:
			return nil, false
		}
	}
	return result, true
}

func toResponse(item domain.Attempt) LearningAttemptResponse {
	return LearningAttemptResponse{
		ID:           item.ID,
		QuestionID:   item.QuestionID,
		Answer:       attemptAnswer(item),
		Selected:     item.Selected,
		Correct:      item.Correct,
		Mode:         item.Mode,
		VariantID:    item.VariantID,
		ReviewStage:  item.ReviewStage,
		NextReviewAt: item.NextReviewAt,
		CreatedAt:    item.CreatedAt,
	}
}

func attemptAnswer(item domain.Attempt) int {
	if item.Mode == domain.AttemptModeReview {
		if variant := domain.FindVariant(item.VariantID); variant != nil {
			return variant.Answer
		}
	}
	if question := domain.FindQuestion(item.QuestionID); question != nil {
		return question.Answer
	}
	return 0
}

func reviewDue(stage int, next *time.Time) bool {
	return stage < 5 && next != nil && !next.After(time.Now())
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
