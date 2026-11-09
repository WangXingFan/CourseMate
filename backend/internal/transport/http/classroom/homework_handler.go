package classroom

import (
	"errors"
	"net/http"
	"time"

	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

// HomeworkBank godoc
// @Summary 教师查看作业库与参考答案
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "班级 ID"
// @Success 200 {object} HomeworkBankResponse
// @Router /classrooms/{id}/homework-bank [get]
func (h *Handler) HomeworkBank(c *gin.Context) {
	papers, err := h.service.HomeworkBank(c.Request.Context(), middleware.MustUserID(c), c.Param("id"))
	if err != nil {
		h.writeError(c, err)
		return
	}
	views := make([]HomeworkPaperResponse, 0, len(papers))
	for _, p := range papers {
		total := 0
		for _, q := range p.Questions {
			total += q.Points
		}
		views = append(views, HomeworkPaperResponse{ID: p.ID, Title: p.Title, Questions: homeworkQuestions(p.Questions, true), Total: total})
	}
	response.Success(c, HomeworkBankResponse{Papers: views})
}

// PublishHomework godoc
// @Summary 选择作业库作业并设置开始与截止时间发布
// @Tags classrooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "班级 ID"
// @Param body body HomeworkPublishRequest true "作业与时间"
// @Success 200 {object} HomeworkResponse
// @Router /classrooms/{id}/homeworks [post]
func (h *Handler) PublishHomework(c *gin.Context) {
	var req HomeworkPublishRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	item, err := h.service.PublishHomework(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), req.BankID, req.StartsAt, req.Deadline)
	if err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, homeworkView(*item, true, time.Now()))
}

// Homeworks godoc
// @Summary 查询班级已发布作业
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "班级 ID"
// @Success 200 {object} HomeworkListResponse
// @Router /classrooms/{id}/homeworks [get]
func (h *Handler) Homeworks(c *gin.Context) {
	items, err := h.service.Homeworks(c.Request.Context(), middleware.MustUserID(c), c.Param("id"))
	if err != nil {
		h.writeError(c, err)
		return
	}
	now := time.Now().UTC()
	views := make([]HomeworkResponse, 0, len(items))
	for _, item := range items {
		views = append(views, homeworkView(item, true, now))
	}
	response.Success(c, HomeworkListResponse{Items: views, ServerTime: now})
}

// StudentHomeworks godoc
// @Summary 学生查看本班作业与个人成绩，不返回参考答案
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Success 200 {object} StudentHomeworksResponse
// @Router /student/homeworks [get]
func (h *Handler) StudentHomeworks(c *gin.Context) {
	classroom, items, err := h.service.StudentHomeworks(c.Request.Context(), middleware.MustUserID(c))
	if err != nil {
		h.writeError(c, err)
		return
	}
	now := time.Now().UTC()
	views := make([]HomeworkResponse, 0, len(items))
	for _, item := range items {
		view := homeworkView(item.Homework, false, now)
		view.Makeup = item.Makeup
		if item.Submission != nil {
			sub := homeworkSubmissionView(*item.Submission)
			view.Submission = &sub
		}
		views = append(views, view)
	}
	response.Success(c, StudentHomeworksResponse{Classroom: toClassroomResponse(*classroom), Items: views, ServerTime: now})
}

// SubmitHomework godoc
// @Summary 学生在规定时间内提交一次作业并自动评分
// @Tags classrooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "作业 ID"
// @Param body body HomeworkSubmitRequest true "按题目与空格顺序的答案，选项为从 0 开始的索引字符串"
// @Success 200 {object} HomeworkSubmissionResponse
// @Router /homeworks/{id}/submissions [post]
func (h *Handler) SubmitHomework(c *gin.Context) {
	var req HomeworkSubmitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	sub, err := h.service.SubmitHomework(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), req.Answers)
	if err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, homeworkSubmissionView(*sub))
}

// HomeworkReport godoc
// @Summary 教师查看作业成绩与逐题提交记录
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "作业 ID"
// @Success 200 {object} HomeworkReportResponse
// @Router /homeworks/{id}/report [get]
func (h *Handler) HomeworkReport(c *gin.Context) {
	report, err := h.service.HomeworkReport(c.Request.Context(), middleware.MustUserID(c), c.Param("id"))
	if err != nil {
		h.writeError(c, err)
		return
	}
	students := make([]StudentResponse, 0, len(report.Students))
	for _, student := range report.Students {
		students = append(students, toStudentResponse(student))
	}
	subs := make([]HomeworkSubmissionResponse, 0, len(report.Submissions))
	for _, sub := range report.Submissions {
		subs = append(subs, homeworkSubmissionView(sub))
	}
	changes := make([]HomeworkDeadlineChangeResponse, 0, len(report.Homework.DeadlineChanges))
	for _, change := range report.Homework.DeadlineChanges {
		changes = append(changes, HomeworkDeadlineChangeResponse{StudentID: change.StudentPublicID, StudentName: change.StudentName, PreviousDeadline: change.PreviousDeadline, Deadline: change.Deadline, Reason: change.Reason, CreatedAt: change.CreatedAt})
	}
	response.Success(c, HomeworkReportResponse{Homework: homeworkView(report.Homework, true, time.Now()), Students: students, Submissions: subs, DeadlineChanges: changes})
}

// ExtendHomeworkDeadline godoc
// @Summary 延长全班作业期限或允许指定未提交学生补交，记录原因
// @Tags classrooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "作业 ID"
// @Param body body HomeworkDeadlineRequest true "新期限、原因和可选学生 ID"
// @Success 200 {object} response.Envelope
// @Failure 400 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Failure 409 {object} response.Envelope
// @Router /homeworks/{id}/deadline [patch]
func (h *Handler) ExtendHomeworkDeadline(c *gin.Context) {
	var req HomeworkDeadlineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	if err := h.service.ExtendHomeworkDeadline(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), req.StudentID, req.Deadline, req.Reason); err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, nil)
}

func (h *Handler) writeHomeworkError(c *gin.Context, err error) bool {
	switch {
	case errors.Is(err, app.ErrHomeworkNotFound):
		response.ErrorFrom(c, http.StatusNotFound, err)
	case errors.Is(err, app.ErrHomeworkInvalid), errors.Is(err, app.ErrHomeworkAnswers):
		response.ErrorFrom(c, http.StatusBadRequest, err)
	case errors.Is(err, app.ErrHomeworkWindow), errors.Is(err, app.ErrHomeworkSubmitted):
		response.ErrorFrom(c, http.StatusConflict, err)
	default:
		return false
	}
	return true
}
