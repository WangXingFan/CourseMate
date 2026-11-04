package learning

import (
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/learningview"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

// Mastery godoc
// @Summary Read personal knowledge mastery from graded evidence
// @Tags learning
// @Produce json
// @Security BearerAuth
// @Success 200 {object} learningview.LearningMasteryResponse
// @Failure 401 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /learning/mastery [get]
func (m *Module) Mastery(c *gin.Context) {
	profile, err := m.service.Mastery(c.Request.Context(), middleware.MustUserID(c))
	if err != nil {
		writeError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, learningview.MasteryResponse(profile))
}
