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
// @Param startAt query string false "Inclusive start time (RFC3339); omitted for all history"
// @Param endAt query string false "Exclusive end time (RFC3339); omitted for no end limit"
// @Success 200 {object} learningview.LearningMasteryResponse
// @Failure 400 {object} response.Envelope
// @Failure 401 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /learning/mastery [get]
func (m *Module) Mastery(c *gin.Context) {
	period, ok := learningview.ParseMasteryPeriod(c)
	if !ok {
		return
	}
	profile, err := m.service.Mastery(c.Request.Context(), middleware.MustUserID(c), period)
	if err != nil {
		writeError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, learningview.MasteryResponse(profile))
}
