package attendance

import (
	"errors"
	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/attendance"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/attendance"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
	"log/slog"
	"net/http"
	"time"
)

type Module struct{ service *app.Service }

func NewModule(s *app.Service) *Module { return &Module{service: s} }
func (m *Module) RegisterRoutes(g *gin.RouterGroup) {
	g.GET("/classrooms/:id/attendance", m.List)
	g.POST("/classrooms/:id/attendance", m.Create)
	g.GET("/attendance/:id", m.Report)
	g.POST("/attendance/:id/close", m.Close)
	g.PUT("/attendance/:id/students/:student_id", m.Correct)
	g.GET("/student/attendance", m.StudentList)
	g.POST("/student/attendance/:id/check-in", m.CheckIn)
}
func fail(c *gin.Context, err error) {
	status := http.StatusInternalServerError
	switch {
	case errors.Is(err, domain.ErrInvalid), errors.Is(err, domain.ErrCode):
		status = http.StatusBadRequest
	case errors.Is(err, domain.ErrForbidden), errors.Is(err, domain.ErrActivation):
		status = http.StatusForbidden
	case errors.Is(err, domain.ErrNotFound):
		status = http.StatusNotFound
	case errors.Is(err, domain.ErrClosed):
		status = http.StatusConflict
	case errors.Is(err, domain.ErrAttempts):
		status = http.StatusTooManyRequests
	}
	if status == http.StatusInternalServerError {
		slog.ErrorContext(c.Request.Context(), "attendance request failed", "path", c.FullPath(), "error", err)
		response.InternalError(c)
		return
	}
	response.ErrorFrom(c, status, err)
}
func success(c *gin.Context, v any) { c.Header("Cache-Control", "no-store"); response.Success(c, v) }
func bind(c *gin.Context, v any) bool {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	if err := c.ShouldBindJSON(v); err != nil {
		response.InvalidRequestBody(c, err)
		return false
	}
	return true
}

// List godoc
// @Summary List attendance sessions in my classroom
// @Tags attendance
// @Produce json
// @Security BearerAuth
// @Param id path string true "Classroom ID"
// @Success 200 {object} AttendanceListResponse
// @Router /classrooms/{id}/attendance [get]
func (m *Module) List(c *gin.Context) {
	items, err := m.service.List(c.Request.Context(), middleware.MustUserID(c), c.Param("id"))
	if err != nil {
		fail(c, err)
		return
	}
	v := AttendanceListResponse{Items: []AttendanceSessionResponse{}}
	now := time.Now().UTC()
	for _, item := range items {
		v.Items = append(v.Items, sessionView(item, now))
	}
	success(c, v)
}

// Create godoc
// @Summary Start attendance and snapshot the expected student roster
// @Tags attendance
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Classroom ID"
// @Param body body AttendanceCreateRequest true "Schedule"
// @Success 200 {object} AttendanceSessionResponse
// @Router /classrooms/{id}/attendance [post]
func (m *Module) Create(c *gin.Context) {
	var in AttendanceCreateRequest
	if !bind(c, &in) {
		return
	}
	a, err := m.service.Create(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), in.Title, in.Minutes, in.LateAfter)
	if err != nil {
		fail(c, err)
		return
	}
	success(c, sessionView(a, time.Now().UTC()))
}

// Report godoc
// @Summary Read attendance records and the current teacher-only check-in code
// @Tags attendance
// @Produce json
// @Security BearerAuth
// @Param id path string true "Attendance ID"
// @Success 200 {object} AttendanceReportResponse
// @Router /attendance/{id} [get]
func (m *Module) Report(c *gin.Context) {
	a, rows, err := m.service.Report(c.Request.Context(), middleware.MustUserID(c), c.Param("id"))
	if err != nil {
		fail(c, err)
		return
	}
	now := time.Now().UTC()
	v := AttendanceReportResponse{Session: sessionView(a, now), Records: []AttendanceRecordResponse{}, ServerTime: now}
	if a.Open(now) {
		code, expires := a.Code(now)
		v.Code, v.CodeExpiresAt = code, &expires
	}
	for _, row := range rows {
		v.Records = append(v.Records, recordView(row))
	}
	success(c, v)
}

// Close godoc
// @Summary End attendance immediately
// @Tags attendance
// @Produce json
// @Security BearerAuth
// @Param id path string true "Attendance ID"
// @Success 200 {object} AttendanceMutationResponse
// @Router /attendance/{id}/close [post]
func (m *Module) Close(c *gin.Context) {
	if err := m.service.Close(c.Request.Context(), middleware.MustUserID(c), c.Param("id")); err != nil {
		fail(c, err)
		return
	}
	success(c, AttendanceMutationResponse{Updated: true})
}

// Correct godoc
// @Summary Correct a student's attendance and retain the reason and operator
// @Tags attendance
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Attendance ID"
// @Param student_id path string true "Student public ID"
// @Param body body AttendanceCorrectionRequest true "Correction"
// @Success 200 {object} AttendanceRecordResponse
// @Router /attendance/{id}/students/{student_id} [put]
func (m *Module) Correct(c *gin.Context) {
	var in AttendanceCorrectionRequest
	if !bind(c, &in) {
		return
	}
	r, err := m.service.Correct(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), c.Param("student_id"), in.Status, in.Reason)
	if err != nil {
		fail(c, err)
		return
	}
	success(c, recordView(r))
}

// StudentList godoc
// @Summary Read my attendance sessions and my own records only
// @Tags attendance
// @Produce json
// @Security BearerAuth
// @Success 200 {object} AttendanceStudentListResponse
// @Router /student/attendance [get]
func (m *Module) StudentList(c *gin.Context) {
	items, err := m.service.StudentList(c.Request.Context(), middleware.MustUserID(c))
	if err != nil {
		fail(c, err)
		return
	}
	v := AttendanceStudentListResponse{Items: []AttendanceStudentItemResponse{}}
	now := time.Now().UTC()
	for _, item := range items {
		v.Items = append(v.Items, AttendanceStudentItemResponse{Session: sessionView(item.Session, now), Record: recordView(item.Record)})
	}
	success(c, v)
}

// CheckIn godoc
// @Summary Check in as the authenticated student using the current classroom code
// @Tags attendance
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Attendance ID"
// @Param body body AttendanceCheckInRequest true "Code"
// @Success 200 {object} AttendanceRecordResponse
// @Router /student/attendance/{id}/check-in [post]
func (m *Module) CheckIn(c *gin.Context) {
	var in AttendanceCheckInRequest
	if !bind(c, &in) {
		return
	}
	r, err := m.service.CheckIn(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), in.Code)
	if err != nil {
		fail(c, err)
		return
	}
	success(c, recordView(r))
}
