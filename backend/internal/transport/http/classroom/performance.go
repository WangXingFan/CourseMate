package classroom

import (
	"net/http"

	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

type PerformanceResponse struct {
	Report PerformanceReport `json:"report"`
}
type PerformanceRecordResponse struct {
	Record *PerformanceRecord `json:"record" extensions:"x-nullable"`
}
type PerformanceRecordItem struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	CreatedAt string `json:"createdAt"`
}
type PerformanceRecordListResponse struct {
	Records []PerformanceRecordItem `json:"records"`
}

// PreviewPerformance godoc
// @Summary Preview classroom performance from closed activities
// @Tags classrooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Owned classroom ID"
// @Param body body PerformanceOptions true "Activity IDs and inclusive start / exclusive end (RFC3339); omit for all closed activities"
// @Success 200 {object} PerformanceResponse
// @Failure 400 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Router /classrooms/{id}/performance/preview [post]
func (h *Handler) PreviewPerformance(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 65536)
	var in PerformanceOptions
	if err := c.ShouldBindJSON(&in); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	r, err := h.service.Performance(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), in.application())
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, PerformanceResponse{Report: performanceReportResponse(*r)})
}

// FinalizePerformance godoc
// @Summary Save and publish an immutable classroom performance record
// @Tags classrooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Owned classroom ID"
// @Param body body FinalizePerformance true "Preview fingerprint, scope, title and justified corrections"
// @Success 200 {object} PerformanceRecordResponse
// @Failure 400 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Router /classrooms/{id}/performance/records [post]
func (h *Handler) FinalizePerformance(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 1048576)
	var in FinalizePerformance
	if err := c.ShouldBindJSON(&in); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	r, err := h.service.FinalizePerformance(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), in.application())
	if err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, PerformanceRecordResponse{Record: performanceRecordResponse(r)})
}

// PerformanceRecords godoc
// @Summary List published classroom performance records
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "Owned classroom ID"
// @Success 200 {object} PerformanceRecordListResponse
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Router /classrooms/{id}/performance/records [get]
func (h *Handler) PerformanceRecords(c *gin.Context) {
	items, err := h.service.PerformanceRecords(c.Request.Context(), middleware.MustUserID(c), c.Param("id"))
	if err != nil {
		h.writeError(c, err)
		return
	}
	r := PerformanceRecordListResponse{Records: []PerformanceRecordItem{}}
	for _, item := range items {
		r.Records = append(r.Records, PerformanceRecordItem{item.ID, item.Title, item.CreatedAt.Format("2006-01-02T15:04:05Z07:00")})
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, r)
}

// PerformanceRecord godoc
// @Summary Read a published classroom performance record
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "Owned classroom ID"
// @Param record_id path string true "Record ID"
// @Success 200 {object} PerformanceRecordResponse
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Router /classrooms/{id}/performance/records/{record_id} [get]
func (h *Handler) PerformanceRecord(c *gin.Context) {
	r, err := h.service.PerformanceRecord(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), c.Param("record_id"))
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, PerformanceRecordResponse{Record: performanceRecordResponse(r)})
}

// StudentPerformance godoc
// @Summary Read the current student's latest published classroom performance
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Success 200 {object} PerformanceRecordResponse
// @Failure 403 {object} response.Envelope
// @Router /student/performance [get]
func (h *Handler) StudentPerformance(c *gin.Context) {
	r, err := h.service.StudentPerformance(c.Request.Context(), middleware.MustUserID(c))
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, PerformanceRecordResponse{Record: performanceRecordResponse(r)})
}
