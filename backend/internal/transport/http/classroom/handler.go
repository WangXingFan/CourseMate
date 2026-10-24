package classroom

import (
	"errors"
	"net/http"
	"strings"

	appclassroom "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/classroom"
	domainclassroom "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

// Handler 封装班级 HTTP 处理。
type Handler struct {
	service *appclassroom.Service
}

func NewHandler(service *appclassroom.Service) *Handler {
	return &Handler{service: service}
}

// ListClassrooms godoc
// @Summary 查询班级
// @Description 教师查询自己创建的班级，管理员查询全部班级。
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Success 200 {object} ClassroomListResponse
// @Failure 403 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /classrooms [get]
func (h *Handler) ListClassrooms(c *gin.Context) {
	items, err := h.service.List(c.Request.Context(), middleware.MustUserID(c))
	if err != nil {
		h.writeError(c, err)
		return
	}
	views := make([]ClassroomResponse, 0, len(items))
	for _, item := range items {
		views = append(views, toClassroomResponse(item))
	}
	response.Success(c, ClassroomListResponse{Classrooms: views})
}

// CreateClassroom godoc
// @Summary 创建班级
// @Description 仅教师账号可创建班级，并成为班级的唯一管理者。
// @Tags classrooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body CreateClassroomRequest true "班级信息"
// @Success 200 {object} ClassroomDataResponse
// @Failure 400 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /classrooms [post]
func (h *Handler) CreateClassroom(c *gin.Context) {
	var req CreateClassroomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	item, err := h.service.Create(c.Request.Context(), middleware.MustUserID(c), req.Name, req.Description)
	if err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, ClassroomDataResponse{Classroom: toClassroomResponse(*item)})
}

// UpdateClassroom godoc
// @Summary 更新班级
// @Description 教师更新自己创建的班级名称或说明。
// @Tags classrooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "班级公开 ID"
// @Param body body UpdateClassroomRequest true "班级信息"
// @Success 200 {object} ClassroomMutationResponse
// @Failure 400 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /classrooms/{id} [patch]
func (h *Handler) UpdateClassroom(c *gin.Context) {
	classroomID, ok := classroomIDFromPath(c)
	if !ok {
		return
	}
	var req UpdateClassroomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	if err := h.service.Update(c.Request.Context(), middleware.MustUserID(c), classroomID, req.Name, req.Description); err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, ClassroomMutationResponse{Updated: true})
}

// DeleteClassroom godoc
// @Summary 删除班级
// @Description 教师删除自己创建的班级；班级内学生随即恢复为未分班状态。
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "班级公开 ID"
// @Success 200 {object} ClassroomMutationResponse
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /classrooms/{id} [delete]
func (h *Handler) DeleteClassroom(c *gin.Context) {
	classroomID, ok := classroomIDFromPath(c)
	if !ok {
		return
	}
	if err := h.service.Delete(c.Request.Context(), middleware.MustUserID(c), classroomID); err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, ClassroomMutationResponse{Updated: true})
}

// ListStudents godoc
// @Summary 查询班级学生
// @Description 教师查询自己的班级成员，管理员可查看全部班级成员。
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "班级公开 ID"
// @Success 200 {object} StudentListResponse
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /classrooms/{id}/students [get]
func (h *Handler) ListStudents(c *gin.Context) {
	classroomID, ok := classroomIDFromPath(c)
	if !ok {
		return
	}
	items, err := h.service.Students(c.Request.Context(), middleware.MustUserID(c), classroomID)
	if err != nil {
		h.writeError(c, err)
		return
	}
	views := make([]StudentResponse, 0, len(items))
	for _, item := range items {
		views = append(views, StudentResponse{ID: item.PublicID, Username: item.Username, DisplayName: item.DisplayName})
	}
	response.Success(c, StudentListResponse{Students: views})
}

// AddStudent godoc
// @Summary 添加班级学生
// @Description 教师按用户名添加学生。一名学生最多属于一个班级，已分班学生须先从原班级移出。
// @Tags classrooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "班级公开 ID"
// @Param body body AddStudentRequest true "学生用户名"
// @Success 200 {object} ClassroomMutationResponse
// @Failure 400 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Failure 409 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /classrooms/{id}/students [post]
func (h *Handler) AddStudent(c *gin.Context) {
	classroomID, ok := classroomIDFromPath(c)
	if !ok {
		return
	}
	var req AddStudentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	if err := h.service.AddStudent(c.Request.Context(), middleware.MustUserID(c), classroomID, req.Username); err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, ClassroomMutationResponse{Updated: true})
}

// RemoveStudent godoc
// @Summary 移出班级学生
// @Description 教师把学生从自己的班级移出；移出后学生可以加入其他班级。
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "班级公开 ID"
// @Param student_id path string true "学生公开 ID"
// @Success 200 {object} ClassroomMutationResponse
// @Failure 400 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /classrooms/{id}/students/{student_id} [delete]
func (h *Handler) RemoveStudent(c *gin.Context) {
	classroomID, ok := classroomIDFromPath(c)
	if !ok {
		return
	}
	studentID := strings.TrimSpace(c.Param("student_id"))
	if studentID == "" {
		response.ErrorFrom(c, http.StatusBadRequest, errInvalidStudentID)
		return
	}
	if err := h.service.RemoveStudent(c.Request.Context(), middleware.MustUserID(c), classroomID, studentID); err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, ClassroomMutationResponse{Updated: true})
}

func classroomIDFromPath(c *gin.Context) (string, bool) {
	classroomID := strings.TrimSpace(c.Param("id"))
	if classroomID == "" {
		response.ErrorFrom(c, http.StatusBadRequest, errInvalidClassroomID)
		return "", false
	}
	return classroomID, true
}

func (h *Handler) writeError(c *gin.Context, err error) {
	if h.writeQuizError(c, err) {
		return
	}
	switch {
	case errors.Is(err, appclassroom.ErrForbidden):
		response.ErrorFrom(c, http.StatusForbidden, err)
	case errors.Is(err, appclassroom.ErrNotFound):
		response.ErrorFrom(c, http.StatusNotFound, err)
	case errors.Is(err, appclassroom.ErrInvalid):
		response.ErrorFrom(c, http.StatusBadRequest, err)
	case errors.Is(err, appclassroom.ErrStudentInvalid), errors.Is(err, appclassroom.ErrStudentCSV):
		response.ErrorFrom(c, http.StatusBadRequest, err)
	case errors.Is(err, appclassroom.ErrStudentExists):
		response.ErrorFrom(c, http.StatusConflict, err)
	case errors.Is(err, appclassroom.ErrStudentNotFound):
		response.ErrorFrom(c, http.StatusNotFound, err)
	case errors.Is(err, appclassroom.ErrAssigned):
		response.ErrorFrom(c, http.StatusConflict, err)
	default:
		response.InternalError(c)
	}
}

func toClassroomResponse(item domainclassroom.Classroom) ClassroomResponse {
	return ClassroomResponse{
		ID:           item.PublicID,
		Name:         item.Name,
		Description:  item.Description,
		TeacherName:  item.TeacherName,
		StudentCount: item.StudentCount,
		CreatedAt:    item.CreatedAt,
	}
}
