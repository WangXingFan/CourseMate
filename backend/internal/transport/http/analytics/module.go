package analytics

import (
	"errors"
	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/analytics"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/analytics"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
	"time"
)

type Module struct{ service *app.Service }

func NewModule(service *app.Service) *Module { return &Module{service: service} }
func (m *Module) RegisterRoutes(group *gin.RouterGroup) {
	group.POST("/analytics/visits", m.RecordVisit)
	group.GET("/analytics/usage", m.Report)
}

// RecordVisit godoc
// @Summary Record an authenticated product page visit (idempotent by event ID)
// @Tags analytics
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body UsageVisitRequest true "Page visit"
// @Success 200 {object} UsageVisitResponse
// @Failure 400 {object} response.Envelope
// @Failure 401 {object} response.Envelope
// @Router /analytics/visits [post]
func (m *Module) RecordVisit(c *gin.Context) {
	var input UsageVisitRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	if err := m.service.RecordVisit(c.Request.Context(), middleware.MustUserID(c), input.EventID, input.Path); err != nil {
		writeError(c, err)
		return
	}
	response.Success(c, UsageVisitResponse{Recorded: true})
}

// Report godoc
// @Summary Usage statistics for a teacher's classrooms or the administrator's entire site
// @Tags analytics
// @Produce json
// @Security BearerAuth
// @Param days query int false "Reporting days: 7, 30 or 90" default(30)
// @Param classroomId query string false "Optional classroom public ID"
// @Success 200 {object} UsageReportResponse
// @Failure 400 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Router /analytics/usage [get]
func (m *Module) Report(c *gin.Context) {
	days, err := strconv.Atoi(c.DefaultQuery("days", "30"))
	if err != nil {
		writeError(c, app.ErrInvalid)
		return
	}
	report, err := m.service.Report(c.Request.Context(), middleware.MustUserID(c), days, c.Query("classroomId"))
	if err != nil {
		writeError(c, err)
		return
	}
	summary := report.Summary
	view := UsageReportResponse{Scope: report.Scope, From: report.From.In(domain.ReportingZone).Format("2006-01-02"), Through: report.Until.Add(-time.Nanosecond).In(domain.ReportingZone).Format("2006-01-02"), Timezone: "Asia/Shanghai", GeneratedAt: report.GeneratedAt, FirstVisitAt: report.FirstVisitAt,
		Summary: UsageSummaryResponse{Visits: summary.Visits, Users: summary.Users, PracticeAnswers: summary.PracticeAnswers, HomeworkSubmissions: summary.HomeworkSubmissions, QuizSubmissions: summary.QuizSubmissions},
		Daily:   []UsageDailyResponse{}, Resources: []UsageResourceResponse{}, Classrooms: []UsageClassroomResponse{}}
	for _, day := range report.Daily {
		view.Daily = append(view.Daily, UsageDailyResponse{Date: day.Date, Visits: day.Visits})
	}
	categories := make(map[string]string)
	for _, resource := range domain.Resources {
		categories[resource.Key] = resource.Category
	}
	for _, resource := range report.Resources {
		view.Resources = append(view.Resources, UsageResourceResponse{Key: resource.Resource, Category: categories[resource.Resource], Visits: resource.Visits})
	}
	for _, class := range report.Classrooms {
		view.Classrooms = append(view.Classrooms, UsageClassroomResponse{ID: class.PublicID, Name: class.Name, Students: class.Students, Visits: class.Visits})
	}
	view.Homeworks = assessmentViews(report.Homeworks)
	view.Labs = assessmentViews(report.Labs)
	view.Lessons = make([]LessonStatsResponse, 0, len(report.Lessons))
	for _, item := range report.Lessons {
		view.Lessons = append(view.Lessons, LessonStatsResponse{QuizID: item.QuizID, QuizTitle: item.QuizTitle, ClassroomID: item.ClassroomID, LessonID: item.LessonID, Number: item.Number, Title: item.Title, Expected: item.Expected, Answered: item.Answered, Correct: item.Correct})
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, view)
}

func writeError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, app.ErrForbidden):
		response.ErrorFrom(c, http.StatusForbidden, err)
	case errors.Is(err, app.ErrInvalid):
		response.ErrorFrom(c, http.StatusBadRequest, err)
	case errors.Is(err, app.ErrClassroom):
		response.ErrorFrom(c, http.StatusNotFound, err)
	default:
		_ = c.Error(err)
		response.InternalError(c)
	}
}

func assessmentViews(items []domain.Assessment) []AssessmentStatsResponse {
	views := make([]AssessmentStatsResponse, 0, len(items))
	for _, item := range items {
		views = append(views, AssessmentStatsResponse{ID: item.ID, ClassroomID: item.ClassroomID, ClassroomName: item.ClassroomName, ItemKey: item.ItemKey, Title: item.Title, Expected: item.Expected, Started: item.Started, Completed: item.Completed, ScoreCount: item.ScoreCount, ScoreSum: item.ScoreSum, Distribution: item.Distribution[:]})
	}
	return views
}
