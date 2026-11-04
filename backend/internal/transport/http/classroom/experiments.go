package classroom

import (
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

type ClassroomExperimentRequest struct {
	Open *bool `json:"open" binding:"required"`
}

// SetExperiment godoc
// @Summary Open or close one experiment for the teacher's classroom
// @Tags classrooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Classroom ID"
// @Param course_id path string true "L1, L2 or L3"
// @Param body body ClassroomExperimentRequest true "Access state"
// @Success 200 {object} ClassroomMutationResponse
// @Failure 400 {object} response.Envelope
// @Failure 401 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Router /classrooms/{id}/experiments/{course_id} [put]
func (h *Handler) SetExperiment(c *gin.Context) {
	id, ok := classroomIDFromPath(c)
	if !ok {
		return
	}
	var input ClassroomExperimentRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	if err := h.service.SetExperiment(c.Request.Context(), middleware.MustUserID(c), id, c.Param("course_id"), *input.Open); err != nil {
		h.writeError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, ClassroomMutationResponse{Updated: true})
}
