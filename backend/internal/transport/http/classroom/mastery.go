package classroom

import (
	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/learningview"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

type ClassroomMasteryStudentResponse struct {
	ID             string                                     `json:"id"`
	Name           string                                     `json:"name"`
	Username       string                                     `json:"username"`
	Counts         learningview.LearningMasteryCountsResponse `json:"counts"`
	WeakConceptIDs []string                                   `json:"weakConceptIds"`
}
type ClassroomMasteryConceptResponse struct {
	Concept    learningview.LearningMasteryConceptResponse `json:"concept"`
	Assessed   int                                         `json:"assessed"`
	Weak       int                                         `json:"weak"`
	Developing int                                         `json:"developing"`
	Secure     int                                         `json:"secure"`
}
type ClassroomMasteryResponse struct {
	ClassroomID string                            `json:"classroomId"`
	Students    []ClassroomMasteryStudentResponse `json:"students"`
	Concepts    []ClassroomMasteryConceptResponse `json:"concepts"`
}

// MasteryReport godoc
// @Summary Read the classroom's knowledge gaps and student summaries
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "Classroom ID"
// @Success 200 {object} ClassroomMasteryResponse
// @Failure 401 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Router /classrooms/{id}/mastery [get]
func (h *Handler) MasteryReport(c *gin.Context) {
	item, err := h.service.MasteryReport(c.Request.Context(), middleware.MustUserID(c), c.Param("id"))
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, masteryReportResponse(item))
}

// StudentMastery godoc
// @Summary Read mastery for a current student in an authorized classroom
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "Classroom ID"
// @Param student_id path string true "Student public ID"
// @Success 200 {object} learningview.LearningMasteryResponse
// @Failure 401 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Router /classrooms/{id}/students/{student_id}/mastery [get]
func (h *Handler) StudentMastery(c *gin.Context) {
	item, err := h.service.StudentMastery(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), c.Param("student_id"))
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, learningview.MasteryResponse(item))
}

func masteryReportResponse(item *app.MasteryReport) ClassroomMasteryResponse {
	result := ClassroomMasteryResponse{ClassroomID: item.ClassroomID, Students: []ClassroomMasteryStudentResponse{}, Concepts: []ClassroomMasteryConceptResponse{}}
	for _, s := range item.Students {
		result.Students = append(result.Students, ClassroomMasteryStudentResponse{ID: s.ID, Name: s.Name, Username: s.Username, Counts: learningview.MasteryCountsResponse(s.Counts), WeakConceptIDs: s.WeakConceptIDs})
	}
	for _, q := range item.Concepts {
		result.Concepts = append(result.Concepts, ClassroomMasteryConceptResponse{Concept: learningview.MasteryConceptResponse(q.Concept), Assessed: q.Assessed, Weak: q.Weak, Developing: q.Developing, Secure: q.Secure})
	}
	return result
}
