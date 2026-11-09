package classroom

import (
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

type RemediationRequest struct {
	Title       string   `json:"title" binding:"required,max=120"`
	ConceptID   string   `json:"conceptId" binding:"required,max=64"`
	QuestionIDs []string `json:"questionIds" binding:"required,min=1,max=10,dive,required,max=96"`
	StudentIDs  []string `json:"studentIds" binding:"required,min=1,max=500,dive,required,max=64"`
}
type RemediationBankResponse struct {
	Questions []QuizQuestionResponse `json:"questions"`
}
type CopyQuizRequest struct {
	ClassroomID string   `json:"classroomId" binding:"required,max=64"`
	Title       string   `json:"title" binding:"required,max=120"`
	StudentIDs  []string `json:"studentIds" binding:"max=500,dive,required,max=64"`
}

// RemediationBank godoc
// @Summary 教师预览知识点巩固题及解析
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "班级 ID"
// @Param conceptId query string true "知识点 ID"
// @Success 200 {object} RemediationBankResponse
// @Router /classrooms/{id}/remediation-bank [get]
func (h *Handler) RemediationBank(c *gin.Context) {
	bank, err := h.service.RemediationBank(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), c.Query("conceptId"))
	if err != nil {
		h.writeError(c, err)
		return
	}
	questions := []QuizQuestionResponse{}
	for _, q := range bank.Questions {
		fields := []QuizFieldResponse{}
		for _, f := range q.Fields {
			fields = append(fields, QuizFieldResponse{ID: f.ID, Label: f.Label, Unit: f.Unit, Expected: f.Expected})
		}
		questions = append(questions, QuizQuestionResponse{ID: q.ID, Prompt: q.Prompt, Options: q.Options, Answer: q.Answer, Formula: q.Formula, Fields: fields, Explanation: q.Explanation, ConceptID: bank.Concept.ID, ConceptTitle: bank.Concept.Title, LessonID: bank.Concept.LessonID})
	}
	response.Success(c, RemediationBankResponse{Questions: questions})
}

// CreateRemediation godoc
// @Summary 为指定学生创建巩固任务草稿
// @Tags classrooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "班级 ID"
// @Param body body RemediationRequest true "题目与学生"
// @Success 200 {object} QuizDataResponse
// @Router /classrooms/{id}/remediations [post]
func (h *Handler) CreateRemediation(c *gin.Context) {
	var req RemediationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	item, err := h.service.CreateRemediation(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), req.Title, req.ConceptID, req.QuestionIDs, req.StudentIDs)
	if err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, QuizDataResponse{Quiz: toQuizResponse(*item)})
}

// CopyQuiz godoc
// @Summary 将题目快照复制到本人其他班级，生成独立草稿
// @Tags classrooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "活动 ID"
// @Param body body CopyQuizRequest true "目标班级与标题"
// @Success 200 {object} QuizDataResponse
// @Router /quizzes/{id}/copy [post]
func (h *Handler) CopyQuiz(c *gin.Context) {
	var req CopyQuizRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	item, err := h.service.CopyQuiz(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), req.ClassroomID, req.Title, req.StudentIDs)
	if err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, QuizDataResponse{Quiz: toQuizResponse(*item)})
}
