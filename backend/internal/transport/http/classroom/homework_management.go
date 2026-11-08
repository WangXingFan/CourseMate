package classroom

import (
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

// ManageHomework godoc
// @Summary 延期、撤回无提交的作业，或截止后发布解析
// @Tags classrooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "作业 ID"
// @Param body body HomeworkManageRequest true "操作及原因"
// @Success 200 {object} response.Envelope
// @Router /homeworks/{id}/manage [post]
func (h *Handler) ManageHomework(c *gin.Context) {
	var req HomeworkManageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	if err := h.service.ManageHomework(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), req.Action, req.Deadline, req.Reason); err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}

// CorrectHomework godoc
// @Summary 教师更正作业分数，保留原始答卷与历次更正
// @Tags classrooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "作业 ID"
// @Param student_id path string true "学生 ID"
// @Param body body HomeworkCorrectRequest true "分数及原因"
// @Success 200 {object} response.Envelope
// @Router /homeworks/{id}/students/{student_id}/corrections [post]
func (h *Handler) CorrectHomework(c *gin.Context) {
	var req HomeworkCorrectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	if err := h.service.CorrectHomework(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), c.Param("student_id"), req.Score, req.Reason); err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, gin.H{"ok": true})
}
