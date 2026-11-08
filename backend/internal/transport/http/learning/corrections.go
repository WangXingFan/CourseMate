package learning

import (
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
	"time"
)

type LearningCorrectionField struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Unit  string `json:"unit"`
}
type LearningCorrectionResponse struct {
	ID              string                    `json:"id"`
	Source          string                    `json:"source"`
	Title           string                    `json:"title"`
	ConceptID       string                    `json:"conceptId"`
	LessonID        string                    `json:"lessonId"`
	OriginHref      string                    `json:"originHref"`
	Prompt          string                    `json:"prompt"`
	Formula         string                    `json:"formula"`
	Options         []string                  `json:"options"`
	Fields          []LearningCorrectionField `json:"fields"`
	OriginalAnswers map[string]string         `json:"originalAnswers"`
	At              time.Time                 `json:"at"`
	ReviewStage     int                       `json:"reviewStage"`
	NextReviewAt    *time.Time                `json:"nextReviewAt" extensions:"x-nullable"`
	ReviewDue       bool                      `json:"reviewDue"`
}
type LearningCorrectionsResponse struct {
	Items []LearningCorrectionResponse `json:"items"`
}
type LearningCorrectionSubmitRequest struct {
	ID           string            `json:"id" binding:"required,uuid"`
	CorrectionID string            `json:"correctionId" binding:"required,len=32"`
	Answers      map[string]string `json:"answers" binding:"required,max=16,dive,max=200"`
}
type LearningCorrectionResultResponse struct {
	Attempt      LearningLessonAttemptResponse `json:"attempt"`
	ReviewStage  int                           `json:"reviewStage"`
	NextReviewAt *time.Time                    `json:"nextReviewAt" extensions:"x-nullable"`
}

// Corrections godoc
// @Summary 学生查看已开放订正的作业、课堂测验与自主练习错题
// @Tags learning
// @Produce json
// @Security BearerAuth
// @Success 200 {object} LearningCorrectionsResponse
// @Router /learning/corrections [get]
func (m *Module) Corrections(c *gin.Context) {
	items, err := m.service.Corrections(c.Request.Context(), middleware.MustUserID(c))
	if err != nil {
		writeError(c, err)
		return
	}
	views := make([]LearningCorrectionResponse, 0, len(items))
	for _, item := range items {
		views = append(views, correctionView(item))
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, LearningCorrectionsResponse{Items: views})
}

func correctionView(item domain.CorrectionSource) LearningCorrectionResponse {
	fields := make([]LearningCorrectionField, 0, len(item.Question.Fields))
	for _, field := range item.Question.Fields {
		fields = append(fields, LearningCorrectionField{ID: field.ID, Label: field.Label, Unit: field.Unit})
	}
	options := append([]string{}, item.Question.Options...)
	return LearningCorrectionResponse{ID: item.ID, Source: item.Source, Title: item.Title, ConceptID: item.ConceptID, LessonID: item.LessonID, OriginHref: item.OriginHref, Prompt: item.Question.Prompt, Formula: item.Question.Formula, Options: options, Fields: fields, OriginalAnswers: item.Answers, At: item.At, ReviewStage: item.ReviewStage, NextReviewAt: item.NextReviewAt, ReviewDue: item.NextReviewAt != nil && !time.Now().Before(*item.NextReviewAt)}
}

// SubmitCorrection godoc
// @Summary 订正并安排间隔复习，不改变正式成绩
// @Tags learning
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body LearningCorrectionSubmitRequest true "错题与答案"
// @Success 200 {object} LearningCorrectionResultResponse
// @Router /learning/correction-attempts [post]
func (m *Module) SubmitCorrection(c *gin.Context) {
	var req LearningCorrectionSubmitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	item, err := m.service.SubmitCorrection(c.Request.Context(), middleware.MustUserID(c), req.ID, req.CorrectionID, req.Answers)
	if err != nil {
		writeError(c, err)
		return
	}
	response.Success(c, LearningCorrectionResultResponse{Attempt: lessonAttemptResponse(*item), ReviewStage: item.ReviewStage, NextReviewAt: item.NextReviewAt})
}
