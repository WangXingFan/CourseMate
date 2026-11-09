package exports

import (
	"net/http"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

type ClassroomExportProfile struct {
	AcademicTerm     string `json:"academicTerm" binding:"required,max=64"`
	CourseCode       string `json:"courseCode" binding:"required,max=64"`
	CourseName       string `json:"courseName" binding:"required,max=120"`
	TeacherName      string `json:"teacherName" binding:"required,max=80"`
	College          string `json:"college" binding:"required,max=120"`
	TeachingLocation string `json:"teachingLocation" binding:"required,max=120"`
}

func exportProfileView(p domain.ExportProfile) ClassroomExportProfile {
	return ClassroomExportProfile{p.AcademicTerm, p.CourseCode, p.CourseName, p.TeacherName, p.College, p.TeachingLocation}
}

// ExportProfile godoc
// @Summary Read the classroom's saved archive header information
// @Tags exports
// @Produce json
// @Security BearerAuth
// @Param id path string true "Owned classroom ID"
// @Success 200 {object} response.Envelope{data=ClassroomExportProfile}
// @Failure 403,404,500 {object} response.Envelope
// @Router /classrooms/{id}/export-profile [get]
func (m *Module) ExportProfile(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	p, err := m.service.ExportProfile(c.Request.Context(), middleware.MustUserID(c), c.Param("id"))
	if err != nil {
		gradeError(c, err)
		return
	}
	response.Success(c, exportProfileView(p))
}

// SaveExportProfile godoc
// @Summary Save the classroom's archive header information for subsequent exports
// @Tags exports
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Owned classroom ID"
// @Param body body ClassroomExportProfile true "Archive header fields"
// @Success 200 {object} response.Envelope{data=ClassroomExportProfile}
// @Failure 400,403,404,500 {object} response.Envelope
// @Router /classrooms/{id}/export-profile [put]
func (m *Module) SaveExportProfile(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	var in ClassroomExportProfile
	if err := c.ShouldBindJSON(&in); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	p, err := m.service.SaveExportProfile(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), domain.ExportProfile{
		AcademicTerm: in.AcademicTerm, CourseCode: in.CourseCode, CourseName: in.CourseName,
		TeacherName: in.TeacherName, College: in.College, TeachingLocation: in.TeachingLocation,
	})
	if err != nil {
		gradeError(c, err)
		return
	}
	response.Success(c, exportProfileView(p))
}
