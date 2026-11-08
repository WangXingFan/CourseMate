package labassessment

import (
	"errors"
	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/labassessment"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/labassessment"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
	"log/slog"
)

type Module struct{ service *app.Service }

func NewModule(s *app.Service) *Module { return &Module{s} }
func (m *Module) RegisterRoutes(g *gin.RouterGroup) {
	g.GET("/classrooms/:id/lab-assessments", m.List)
	g.POST("/classrooms/:id/lab-assessments", m.Publish)
	g.PATCH("/lab-assessments/:id", m.SetOpen)
	g.GET("/lab-assessments/:id/report", m.Report)
	g.GET("/lab-assessments/:id/preview", m.Preview)
	g.PUT("/lab-assessments/:id/students/:student_id/tasks/:task/correction", m.Correct)
	g.GET("/learning/lab-assessments", m.StudentList)
	g.GET("/learning/lab-assessments/:id", m.Read)
	g.POST("/learning/lab-assessments/:id/tasks/:task/checkpoints/:key", m.Checkpoint)
	g.POST("/learning/lab-assessments/:id/tasks/:task/attempts", m.Start)
	g.POST("/learning/lab-assessments/:id/tasks/:task/attempts/:attempt/submit", m.Submit)
	g.POST("/learning/lab-assessments/:id/tasks/:task/explanations", m.Explain)
}
func fail(c *gin.Context, err error) {
	status := 500
	switch {
	case errors.Is(err, domain.ErrInvalid):
		status = 400
	case errors.Is(err, domain.ErrForbidden):
		status = 403
	case errors.Is(err, domain.ErrNotFound):
		status = 404
	case errors.Is(err, domain.ErrClosed), errors.Is(err, domain.ErrLimit), errors.Is(err, domain.ErrConflict):
		status = 409
	}
	if status == 500 {
		slog.ErrorContext(c.Request.Context(), "lab assessment request failed", "path", c.FullPath(), "error", err)
	}
	response.ErrorFrom(c, status, err)
}
func success(c *gin.Context, v any) { c.Header("Cache-Control", "no-store"); response.Success(c, v) }
func (m *Module) list(c *gin.Context, student bool) {
	var items []domain.Assignment
	var err error
	if student {
		items, err = m.service.StudentList(c.Request.Context(), middleware.MustUserID(c))
	} else {
		items, err = m.service.List(c.Request.Context(), middleware.MustUserID(c), c.Param("id"))
	}
	if err != nil {
		fail(c, err)
		return
	}
	v := LabAssignmentsResponse{Items: []LabAssignmentResponse{}}
	for _, a := range items {
		view := assignmentView(a)
		if student {
			view.PendingTaskID, view.InProgress, err = m.service.StudentPendingTask(c.Request.Context(), middleware.MustUserID(c), a.ID)
			if err != nil {
				fail(c, err)
				return
			}
		}
		v.Items = append(v.Items, view)
	}
	success(c, v)
}

// List godoc
// @Summary List a classroom's lab assessments
// @Tags lab-assessments
// @Produce json
// @Security BearerAuth
// @Param id path string true "Classroom ID"
// @Success 200 {object} LabAssignmentsResponse
// @Router /classrooms/{id}/lab-assessments [get]
func (m *Module) List(c *gin.Context) { m.list(c, false) }

// StudentList godoc
// @Summary List my lab assessments
// @Tags lab-assessments
// @Produce json
// @Security BearerAuth
// @Success 200 {object} LabAssignmentsResponse
// @Router /learning/lab-assessments [get]
func (m *Module) StudentList(c *gin.Context) { m.list(c, true) }

// Publish godoc
// @Summary Publish one lab course assessment
// @Tags lab-assessments
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Classroom ID"
// @Param body body LabPublishRequest true "Schedule"
// @Success 200 {object} LabAssignmentResponse
// @Router /classrooms/{id}/lab-assessments [post]
func (m *Module) Publish(c *gin.Context) {
	var in LabPublishRequest
	if err := c.ShouldBindJSON(&in); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	a, err := m.service.Publish(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), in.CourseID, in.StartsAt, in.Deadline)
	if err != nil {
		fail(c, err)
		return
	}
	success(c, assignmentView(a))
}

// SetOpen godoc
// @Summary Open or close a lab assessment
// @Tags lab-assessments
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Assessment ID"
// @Param body body LabOpenRequest true "Status"
// @Success 200 {object} LabUpdatedResponse
// @Router /lab-assessments/{id} [patch]
func (m *Module) SetOpen(c *gin.Context) {
	var in LabOpenRequest
	if err := c.ShouldBindJSON(&in); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	if err := m.service.SetOpen(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), *in.Open); err != nil {
		fail(c, err)
		return
	}
	success(c, LabUpdatedResponse{true})
}

// Read godoc
// @Summary Read my lab assessment, without unreleased answers
// @Tags lab-assessments
// @Produce json
// @Security BearerAuth
// @Param id path string true "Assessment ID"
// @Success 200 {object} LabAssessmentResponse
// @Router /learning/lab-assessments/{id} [get]
func (m *Module) Read(c *gin.Context) {
	a, s, err := m.service.Read(c.Request.Context(), middleware.MustUserID(c), c.Param("id"))
	if err != nil {
		fail(c, err)
		return
	}
	success(c, assessmentView(a, s, false))
}
func (m *Module) changed(c *gin.Context, err error) {
	if err != nil {
		fail(c, err)
		return
	}
	m.Read(c)
}

// Start godoc
// @Summary Start or resume an immutable assessment attempt
// @Tags lab-assessments
// @Produce json
// @Security BearerAuth
// @Param id path string true "Assessment ID"
// @Param task path string true "Task ID"
// @Success 200 {object} LabAssessmentResponse
// @Router /learning/lab-assessments/{id}/tasks/{task}/attempts [post]
func (m *Module) Start(c *gin.Context) {
	_, err := m.service.Start(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), c.Param("task"))
	m.changed(c, err)
}

// Submit godoc
// @Summary Grade a formal attempt once, with idempotent retries
// @Tags lab-assessments
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Assessment ID"
// @Param task path string true "Task ID"
// @Param attempt path string true "Attempt ID"
// @Param body body LabAnswersRequest true "Answers"
// @Success 200 {object} LabAssessmentResponse
// @Router /learning/lab-assessments/{id}/tasks/{task}/attempts/{attempt}/submit [post]
func (m *Module) Submit(c *gin.Context) {
	var in LabAnswersRequest
	if err := c.ShouldBindJSON(&in); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	_, err := m.service.Submit(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), c.Param("task"), c.Param("attempt"), in.RequestID, in.Answers, in.ConfirmBlank)
	m.changed(c, err)
}

// Checkpoint godoc
// @Summary Verify an operation checkpoint, unlimited retries
// @Tags lab-assessments
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Assessment ID"
// @Param task path string true "Task ID"
// @Param key path string true "O1 or O2"
// @Param body body LabAnswersRequest true "Readings"
// @Success 200 {object} LabAssessmentResponse
// @Router /learning/lab-assessments/{id}/tasks/{task}/checkpoints/{key} [post]
func (m *Module) Checkpoint(c *gin.Context) {
	var in LabAnswersRequest
	if err := c.ShouldBindJSON(&in); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	_, err := m.service.Checkpoint(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), c.Param("task"), c.Param("key"), in.Answers)
	m.changed(c, err)
}

// Explain godoc
// @Summary Reveal explanations and forfeit remaining attempts
// @Tags lab-assessments
// @Produce json
// @Security BearerAuth
// @Param id path string true "Assessment ID"
// @Param task path string true "Task ID"
// @Success 200 {object} LabAssessmentResponse
// @Router /learning/lab-assessments/{id}/tasks/{task}/explanations [post]
func (m *Module) Explain(c *gin.Context) {
	_, err := m.service.Explain(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), c.Param("task"))
	m.changed(c, err)
}

// Report godoc
// @Summary Read classroom lab grades and original submissions
// @Tags lab-assessments
// @Produce json
// @Security BearerAuth
// @Param id path string true "Assessment ID"
// @Success 200 {object} LabReportResponse
// @Router /lab-assessments/{id}/report [get]
func (m *Module) Report(c *gin.Context) {
	r, err := m.service.Report(c.Request.Context(), middleware.MustUserID(c), c.Param("id"))
	if err != nil {
		fail(c, err)
		return
	}
	out := LabReportResponse{Assignment: assignmentView(r.Assignment), Students: []LabStudentGradeResponse{}}
	states := map[uint]domain.State{}
	for _, s := range r.States {
		states[s.UserID] = s
	}
	for _, u := range r.Students {
		out.Students = append(out.Students, LabStudentGradeResponse{ID: u.PublicID, Name: u.DisplayName, Username: u.Username, Grade: assessmentView(r.Assignment, states[u.ID], true)})
	}
	success(c, out)
}

// Preview godoc
// @Summary Preview a teacher sample with answers; creates no grade
// @Tags lab-assessments
// @Produce json
// @Security BearerAuth
// @Param id path string true "Assessment ID"
// @Param task query string true "Task ID"
// @Success 200 {object} LabPreviewResponse
// @Router /lab-assessments/{id}/preview [get]
func (m *Module) Preview(c *gin.Context) {
	p, err := m.service.Preview(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), c.Query("task"))
	if err != nil {
		fail(c, err)
		return
	}
	r, _ := domain.Grade(p, map[string]string{})
	success(c, LabPreviewResponse{paperView(p), resultView(r, true)})
}

// Correct godoc
// @Summary Correct a task total, preserving the original score and audit history
// @Tags lab-assessments
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Assessment ID"
// @Param student_id path string true "Student public ID"
// @Param task path string true "Task ID"
// @Param body body LabCorrectionRequest true "Correction and reason"
// @Success 200 {object} LabUpdatedResponse
// @Router /lab-assessments/{id}/students/{student_id}/tasks/{task}/correction [put]
func (m *Module) Correct(c *gin.Context) {
	var in LabCorrectionRequest
	if err := c.ShouldBindJSON(&in); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	if err := m.service.Correct(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), c.Param("student_id"), c.Param("task"), *in.Score, in.Reason); err != nil {
		fail(c, err)
		return
	}
	success(c, LabUpdatedResponse{true})
}
