package exports

import (
	"errors"
	"log/slog"
	"mime"
	"net/http"

	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/exports"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

type Module struct{ service *app.Service }

func NewModule(s *app.Service) *Module { return &Module{s} }
func (m *Module) RegisterRoutes(g *gin.RouterGroup) {
	g.GET("/classrooms/:id/export-profile", m.ExportProfile)
	g.PUT("/classrooms/:id/export-profile", m.SaveExportProfile)
	g.POST("/classrooms/:id/exports", m.Export)
	g.POST("/classrooms/:id/grade-preview", m.GradePreview)
	g.GET("/classrooms/:id/grade-records", m.GradeRecords)
	g.POST("/classrooms/:id/grade-records", m.FinalizeGrades)
	g.GET("/classrooms/:id/grade-records/:record_id", m.GradeRecord)
	g.GET("/classrooms/:id/grade-records/:record_id/export", m.ExportGradeRecord)
}

type ClassroomExportRequest struct {
	Kind                string             `json:"kind" binding:"required" enums:"homeworks,labs,attendance,performance,ai_activity,summary,reports,homework_reports"`
	AIActivityStartDate string             `json:"aiActivityStartDate,omitempty"`
	AIActivityEndDate   string             `json:"aiActivityEndDate,omitempty"`
	PerformanceRecordID string             `json:"performanceRecordId"`
	IncludeOngoing      bool               `json:"includeOngoing"`
	Weights             map[string]float64 `json:"weights"`
	FilenameTemplate    string             `json:"filenameTemplate"`
	CourseID            string             `json:"courseID" enums:"L1,L2,L3"`
	HomeworkID          string             `json:"homeworkId,omitempty" binding:"max=64"`
}

func (in ClassroomExportRequest) options() app.Options {
	return app.Options{Kind: in.Kind, IncludeOngoing: in.IncludeOngoing, Weights: in.Weights, FilenameTemplate: in.FilenameTemplate, CourseID: in.CourseID, HomeworkID: in.HomeworkID, PerformanceRecordID: in.PerformanceRecordID, AIActivity: domain.AIActivityOptions{StartDate: in.AIActivityStartDate, EndDate: in.AIActivityEndDate}}
}

// Export godoc
// @Summary Export classroom scores as XLSX or individual PDF reports in a ZIP
// @Tags exports
// @Accept json
// @Produce application/octet-stream
// @Security BearerAuth
// @Param id path string true "Owned classroom ID"
// @Param body body ClassroomExportRequest true "Export settings"
// @Success 200 {file} binary
// @Failure 400 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /classrooms/{id}/exports [post]
func (m *Module) Export(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	var in ClassroomExportRequest
	if err := c.ShouldBindJSON(&in); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	f, err := m.service.Export(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), in.options())
	if err != nil {
		switch {
		case errors.Is(err, app.ErrInvalid), errors.Is(err, app.ErrProfileRequired):
			response.ErrorFrom(c, 400, err)
		case errors.Is(err, app.ErrForbidden):
			response.ErrorFrom(c, 403, err)
		case errors.Is(err, app.ErrNotFound):
			response.ErrorFrom(c, 404, err)
		default:
			slog.ErrorContext(c.Request.Context(), "classroom export failed", "classroom", c.Param("id"), "kind", in.Kind, "error", err)
			response.InternalError(c)
		}
		return
	}
	c.Header("Cache-Control", "no-store")
	c.Header("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": f.Name}))
	c.Data(http.StatusOK, f.ContentType, f.Data)
}
