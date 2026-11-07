package classroom

import (
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

type AIActivityWeek struct {
	StartDate     string `json:"startDate"`
	EndDate       string `json:"endDate"`
	Status        string `json:"status" enums:"closed,provisional"`
	ActiveDays    int    `json:"activeDays"`
	ValidRounds   int    `json:"validRounds"`
	CountedRounds int    `json:"countedRounds"`
	DayScore      int    `json:"dayScore"`
	RoundScore    int    `json:"roundScore"`
	Score         int    `json:"score"`
}

type AIActivityStudent struct {
	StudentID     string           `json:"studentId"`
	Username      string           `json:"username"`
	Name          string           `json:"name"`
	ExpectedWeeks int              `json:"expectedWeeks"`
	ActiveWeeks   int              `json:"activeWeeks"`
	ActiveDays    int              `json:"activeDays"`
	ValidRounds   int              `json:"validRounds"`
	Final         *float64         `json:"final" extensions:"x-nullable"`
	Weeks         []AIActivityWeek `json:"weeks"`
}

type AIActivityReport struct {
	Version     string              `json:"version"`
	ClassroomID string              `json:"classroomId"`
	StartDate   string              `json:"startDate"`
	EndDate     string              `json:"endDate"`
	GeneratedAt time.Time           `json:"generatedAt"`
	Students    []AIActivityStudent `json:"students"`
}

type AIActivityResponse struct {
	Report *AIActivityReport `json:"report" extensions:"x-nullable"`
}

func aiActivityResponse(r *domain.AIActivityReport) AIActivityResponse {
	if r == nil {
		return AIActivityResponse{}
	}
	out := &AIActivityReport{Version: r.Version, ClassroomID: r.ClassroomID, StartDate: r.StartDate, EndDate: r.EndDate, GeneratedAt: r.GeneratedAt, Students: []AIActivityStudent{}}
	for _, st := range r.Students {
		row := AIActivityStudent{StudentID: st.StudentID, Username: st.Username, Name: st.Name, ExpectedWeeks: st.ExpectedWeeks, ActiveWeeks: st.ActiveWeeks, ActiveDays: st.ActiveDays, ValidRounds: st.ValidRounds, Final: st.Final, Weeks: []AIActivityWeek{}}
		for _, w := range st.Weeks {
			row.Weeks = append(row.Weeks, AIActivityWeek{StartDate: w.StartDate, EndDate: w.EndDate, Status: w.Status, ActiveDays: w.ActiveDays, ValidRounds: w.ValidRounds, CountedRounds: w.CountedRounds, DayScore: w.DayScore, RoundScore: w.RoundScore, Score: w.Score})
		}
		out.Students = append(out.Students, row)
	}
	return AIActivityResponse{Report: out}
}

// AIActivity godoc
// @Summary Read classroom AI usage activity scores and weekly counts
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "Owned classroom ID"
// @Param startDate query string false "Inclusive Beijing date YYYY-MM-DD; defaults to class creation"
// @Param endDate query string false "Inclusive Beijing date YYYY-MM-DD; defaults to today"
// @Success 200 {object} AIActivityResponse
// @Failure 400 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Router /classrooms/{id}/ai-activity [get]
func (h *Handler) AIActivity(c *gin.Context) {
	r, err := h.service.AIActivity(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), domain.AIActivityOptions{StartDate: c.Query("startDate"), EndDate: c.Query("endDate")})
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, aiActivityResponse(r))
}

// StudentAIActivity godoc
// @Summary Read only the current student's cumulative AI usage activity
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Success 200 {object} AIActivityResponse
// @Failure 403 {object} response.Envelope
// @Router /student/ai-activity [get]
func (h *Handler) StudentAIActivity(c *gin.Context) {
	r, err := h.service.StudentAIActivity(c.Request.Context(), middleware.MustUserID(c))
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, aiActivityResponse(r))
}
