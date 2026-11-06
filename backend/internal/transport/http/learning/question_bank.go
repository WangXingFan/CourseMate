package learning

import (
	"net/http"

	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

type QuestionBankPartResponse struct {
	Label       string   `json:"label"`
	Options     []string `json:"options"`
	Answers     []string `json:"answers"`
	Explanation string   `json:"explanation"`
}

type QuestionBankItemResponse struct {
	ID          string                     `json:"id"`
	Category    string                     `json:"category"`
	Title       string                     `json:"title"`
	Prompt      string                     `json:"prompt"`
	Formula     string                     `json:"formula"`
	Explanation string                     `json:"explanation"`
	Language    string                     `json:"language"`
	LessonURL   string                     `json:"lessonUrl"`
	Parts       []QuestionBankPartResponse `json:"parts"`
}

type QuestionBankCategoryResponse struct {
	ID    string `json:"id"`
	Count int    `json:"count"`
}

type QuestionBankResponse struct {
	Questions  []QuestionBankItemResponse     `json:"questions"`
	Categories []QuestionBankCategoryResponse `json:"categories"`
	Total      int                            `json:"total"`
	Page       int                            `json:"page"`
	PageSize   int                            `json:"pageSize"`
}

// QuestionBank godoc
// @Summary Browse all authored questions, answers and explanations (teacher/admin only)
// @Tags learning
// @Produce json
// @Security BearerAuth
// @Param category query string false "Question bank category"
// @Param q query string false "Keywords in question, answer, explanation or identifier"
// @Param locale query string false "Preferred language (zh-CN or en-US)"
// @Param page query int false "Page number, starting at 1"
// @Param pageSize query int false "Items per page (1–100, default 20)"
// @Success 200 {object} QuestionBankResponse
// @Failure 400 {object} response.Envelope
// @Failure 401 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Router /learning/question-bank [get]
func (m *Module) QuestionBank(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	role := middleware.MustUserRole(c)
	if !app.CanReadQuestionBank(role) {
		response.ErrorFrom(c, http.StatusForbidden, app.ErrQuestionBankForbidden)
		return
	}
	query := struct {
		Category string `form:"category" binding:"max=64"`
		Q        string `form:"q" binding:"max=200"`
		Locale   string `form:"locale" binding:"max=16"`
		Page     int    `form:"page" binding:"min=1"`
		PageSize int    `form:"pageSize" binding:"min=1,max=100"`
	}{Page: 1, PageSize: 20}
	if err := c.ShouldBindQuery(&query); err != nil {
		response.ErrorFrom(c, http.StatusBadRequest, app.ErrInvalid)
		return
	}
	bank, err := m.service.QuestionBank(role, query.Locale, query.Category, query.Q, query.Page, query.PageSize)
	if err != nil {
		writeError(c, err)
		return
	}
	view := QuestionBankResponse{Questions: []QuestionBankItemResponse{}, Categories: []QuestionBankCategoryResponse{}, Total: bank.Total, Page: bank.Page, PageSize: bank.PageSize}
	for _, category := range bank.Categories {
		view.Categories = append(view.Categories, QuestionBankCategoryResponse{ID: category.ID, Count: category.Count})
	}
	for _, q := range bank.Questions {
		item := QuestionBankItemResponse{ID: q.ID, Category: q.Category, Title: q.Title, Prompt: q.Prompt, Formula: q.Formula, Explanation: q.Explanation, Language: q.Language, LessonURL: q.LessonURL, Parts: []QuestionBankPartResponse{}}
		for _, part := range q.Parts {
			options := append([]string{}, part.Options...)
			item.Parts = append(item.Parts, QuestionBankPartResponse{Label: part.Label, Options: options, Answers: part.Answers, Explanation: part.Explanation})
		}
		view.Questions = append(view.Questions, item)
	}
	response.Success(c, view)
}
