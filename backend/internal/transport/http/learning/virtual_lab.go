package learning

import (
	"errors"
	"net/http"
	"time"

	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/learning"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

type LearningVirtualLabResponse struct {
	AccountID uint       `json:"accountId"`
	Revision  uint64     `json:"revision"`
	Document  string     `json:"document"`
	UpdatedAt *time.Time `json:"updatedAt"`
}

type LearningVirtualLabRequest struct {
	Revision *uint64 `json:"revision" binding:"required,max=9007199254740990"`
	Document string  `json:"document" binding:"required"`
}

type LearningVirtualLabGuideResponse struct {
	HTML string `json:"html"`
}

// VirtualLab godoc
// @Summary Read the current account's three-experiment evidence
// @Tags learning
// @Produce json
// @Security BearerAuth
// @Success 200 {object} LearningVirtualLabResponse
// @Failure 401 {object} response.Envelope
// @Router /learning/virtual-lab [get]
func (m *Module) VirtualLab(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	record, err := m.service.VirtualLab(c.Request.Context(), middleware.MustUserID(c))
	writeLabResponse(c, record, err)
}

// SaveVirtualLab godoc
// @Summary Save account-scoped experiment evidence with optimistic concurrency
// @Tags learning
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body LearningVirtualLabRequest true "Evidence and last known revision"
// @Success 200 {object} LearningVirtualLabResponse
// @Failure 400 {object} response.Envelope
// @Failure 401 {object} response.Envelope
// @Failure 409 {object} response.Envelope
// @Router /learning/virtual-lab [put]
func (m *Module) SaveVirtualLab(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 24*1024*1024)
	var input LearningVirtualLabRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	record, err := m.service.SaveVirtualLab(c.Request.Context(), middleware.MustUserID(c), *input.Revision, input.Document)
	writeLabResponse(c, record, err)
}

// VirtualLabGuide godoc
// @Summary Read the teacher-only guide for all twelve tasks
// @Tags learning
// @Produce json
// @Security BearerAuth
// @Success 200 {object} LearningVirtualLabGuideResponse
// @Failure 401 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Router /learning/virtual-lab/guide [get]
func (m *Module) VirtualLabGuide(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	html, allowed := m.service.VirtualLabGuide(middleware.MustUserRole(c))
	if !allowed {
		response.ErrorFrom(c, http.StatusForbidden, nil)
		return
	}
	response.Success(c, LearningVirtualLabGuideResponse{HTML: html})
}

func writeLabResponse(c *gin.Context, record *domain.VirtualLab, err error) {
	if errors.Is(err, domain.ErrVirtualLabConflict) {
		response.ErrorFrom(c, http.StatusConflict, app.ErrVirtualLabConflict)
		return
	}
	if err != nil {
		writeError(c, err)
		return
	}
	response.Success(c, LearningVirtualLabResponse{AccountID: record.UserID, Revision: record.Revision, Document: record.Document, UpdatedAt: record.UpdatedAt})
}
