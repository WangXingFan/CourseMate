package exports

import (
	"errors"
	"log/slog"
	"mime"
	"net/http"
	"time"

	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/exports"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

type GradeComponentResponse struct {
	Kind  string   `json:"kind"`
	Score *float64 `json:"score" extensions:"x-nullable"`
}
type GradeStudentResponse struct {
	StudentID  string                   `json:"studentId"`
	Username   string                   `json:"username"`
	Name       string                   `json:"name"`
	Components []GradeComponentResponse `json:"components"`
	Final      *float64                 `json:"final" extensions:"x-nullable"`
}
type GradePreviewResponse struct {
	Version             string                 `json:"version"`
	ClassroomID         string                 `json:"classroomId"`
	ClassroomName       string                 `json:"classroomName"`
	Fingerprint         string                 `json:"fingerprint"`
	GeneratedAt         time.Time              `json:"generatedAt"`
	Weights             map[string]float64     `json:"weights"`
	PerformanceRecordID string                 `json:"performanceRecordId"`
	AIStartDate         string                 `json:"aiStartDate"`
	AIEndDate           string                 `json:"aiEndDate"`
	Students            []GradeStudentResponse `json:"students"`
}
type GradeRecordInfoResponse struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"createdAt"`
}
type GradeRecordListResponse struct {
	Records []GradeRecordInfoResponse `json:"records"`
}
type GradeRecordResponse struct {
	ID        string               `json:"id"`
	Title     string               `json:"title"`
	CreatedAt time.Time            `json:"createdAt"`
	Report    GradePreviewResponse `json:"report"`
}
type GradeFinalizeRequest struct {
	Title       string                 `json:"title" binding:"required,max=120"`
	Fingerprint string                 `json:"fingerprint" binding:"required,len=64"`
	Options     ClassroomExportRequest `json:"options" binding:"required"`
}

func gradeView(r domain.GradeReport) GradePreviewResponse {
	v := GradePreviewResponse{Version: r.Version, ClassroomID: r.ClassroomID, ClassroomName: r.ClassroomName, Fingerprint: r.Fingerprint, GeneratedAt: r.GeneratedAt, Weights: r.Weights, PerformanceRecordID: r.PerformanceRecordID, AIStartDate: r.AIStartDate, AIEndDate: r.AIEndDate, Students: []GradeStudentResponse{}}
	for _, row := range r.Students {
		item := GradeStudentResponse{StudentID: row.StudentID, Username: row.Username, Name: row.Name, Final: row.Final, Components: []GradeComponentResponse{}}
		for _, key := range []string{"homeworks", "labs", "attendance", "performance", "ai_activity"} {
			if r.Weights[key] > 0 {
				item.Components = append(item.Components, GradeComponentResponse{Kind: key, Score: row.Scores[key]})
			}
		}
		v.Students = append(v.Students, item)
	}
	return v
}
func recordView(r *domain.GradeRecord) GradeRecordResponse {
	return GradeRecordResponse{ID: r.ID, Title: r.Title, CreatedAt: r.CreatedAt, Report: gradeView(r.Report)}
}
func gradeError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, app.ErrInvalid), errors.Is(err, app.ErrProfileRequired):
		response.ErrorFrom(c, 400, err)
	case errors.Is(err, app.ErrForbidden):
		response.ErrorFrom(c, 403, err)
	case errors.Is(err, app.ErrNotFound):
		response.ErrorFrom(c, 404, err)
	case errors.Is(err, app.ErrStalePreview):
		response.ErrorFrom(c, 409, err)
	default:
		slog.ErrorContext(c.Request.Context(), "classroom grade record failed", "classroom", c.Param("id"), "record", c.Param("record_id"), "error", err)
		response.InternalError(c)
	}
}

// GradePreview godoc
// @Summary Preview a final classroom grade sheet
// @Tags exports
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Owned classroom ID"
// @Param body body ClassroomExportRequest true "Summary settings, excluding ongoing assignments"
// @Success 200 {object} response.Envelope{data=GradePreviewResponse}
// @Failure 400,403,404,500 {object} response.Envelope
// @Router /classrooms/{id}/grade-preview [post]
func (m *Module) GradePreview(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	var in ClassroomExportRequest
	if err := c.ShouldBindJSON(&in); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	r, err := m.service.PreviewGrades(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), in.options())
	if err != nil {
		gradeError(c, err)
		return
	}
	response.Success(c, gradeView(*r))
}

// FinalizeGrades godoc
// @Summary Save an immutable classroom grade sheet and its evidence workbook
// @Tags exports
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Owned classroom ID"
// @Param body body GradeFinalizeRequest true "Preview fingerprint and finalization settings"
// @Success 200 {object} response.Envelope{data=GradeRecordResponse}
// @Failure 400,403,404,409,500 {object} response.Envelope
// @Router /classrooms/{id}/grade-records [post]
func (m *Module) FinalizeGrades(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 8192)
	var in GradeFinalizeRequest
	if err := c.ShouldBindJSON(&in); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	r, err := m.service.FinalizeGrades(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), in.Title, in.Fingerprint, in.Options.options())
	if err != nil {
		gradeError(c, err)
		return
	}
	response.Success(c, recordView(r))
}

// GradeRecords godoc
// @Summary List finalized classroom grade sheets
// @Tags exports
// @Produce json
// @Security BearerAuth
// @Param id path string true "Owned classroom ID"
// @Success 200 {object} response.Envelope{data=GradeRecordListResponse}
// @Failure 403,404,500 {object} response.Envelope
// @Router /classrooms/{id}/grade-records [get]
func (m *Module) GradeRecords(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	items, err := m.service.GradeRecords(c.Request.Context(), middleware.MustUserID(c), c.Param("id"))
	if err != nil {
		gradeError(c, err)
		return
	}
	v := GradeRecordListResponse{Records: []GradeRecordInfoResponse{}}
	for _, item := range items {
		v.Records = append(v.Records, GradeRecordInfoResponse{ID: item.ID, Title: item.Title, CreatedAt: item.CreatedAt})
	}
	response.Success(c, v)
}

// GradeRecord godoc
// @Summary Read a finalized classroom grade sheet
// @Tags exports
// @Produce json
// @Security BearerAuth
// @Param id path string true "Owned classroom ID"
// @Param record_id path string true "Grade record ID"
// @Success 200 {object} response.Envelope{data=GradeRecordResponse}
// @Failure 403,404,500 {object} response.Envelope
// @Router /classrooms/{id}/grade-records/{record_id} [get]
func (m *Module) GradeRecord(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	r, err := m.service.GradeRecord(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), c.Param("record_id"))
	if err != nil {
		gradeError(c, err)
		return
	}
	response.Success(c, recordView(r))
}

// ExportGradeRecord godoc
// @Summary Download the original finalized grade workbook
// @Tags exports
// @Produce application/octet-stream
// @Security BearerAuth
// @Param id path string true "Owned classroom ID"
// @Param record_id path string true "Grade record ID"
// @Success 200 {file} binary
// @Failure 403,404,500 {object} response.Envelope
// @Router /classrooms/{id}/grade-records/{record_id}/export [get]
func (m *Module) ExportGradeRecord(c *gin.Context) {
	f, err := m.service.ExportGradeRecord(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), c.Param("record_id"))
	if err != nil {
		gradeError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.Header("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": f.Name}))
	c.Data(http.StatusOK, f.ContentType, f.Data)
}
