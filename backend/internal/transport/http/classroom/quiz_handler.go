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

// ListQuizzes godoc
// @Summary 查询班级小测
// @Description 教师查询自己班级内的小测，包含正确答案与提交人数。
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "班级公开 ID"
// @Success 200 {object} QuizListResponse
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /classrooms/{id}/quizzes [get]
func (h *Handler) ListQuizzes(c *gin.Context) {
	classroomID, ok := classroomIDFromPath(c)
	if !ok {
		return
	}
	items, err := h.service.Quizzes(c.Request.Context(), middleware.MustUserID(c), classroomID)
	if err != nil {
		h.writeError(c, err)
		return
	}
	views := make([]QuizResponse, 0, len(items))
	for _, item := range items {
		views = append(views, toQuizResponse(item))
	}
	response.Success(c, QuizListResponse{Quizzes: views})
}

// CreateQuiz godoc
// @Summary 创建班级小测
// @Description 教师创建草稿小测；题目答案只返回给教师。
// @Tags classrooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "班级公开 ID"
// @Param body body CreateQuizRequest true "小测内容"
// @Success 200 {object} QuizDataResponse
// @Failure 400 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /classrooms/{id}/quizzes [post]
func (h *Handler) CreateQuiz(c *gin.Context) {
	classroomID, ok := classroomIDFromPath(c)
	if !ok {
		return
	}
	var req CreateQuizRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	questions := make([]domainclassroom.QuizQuestion, 0, len(req.Questions))
	for _, item := range req.Questions {
		questions = append(questions, domainclassroom.QuizQuestion{
			Prompt:  item.Prompt,
			Options: item.Options,
			Answer:  item.Answer,
		})
	}
	item, err := h.service.CreateQuiz(
		c.Request.Context(),
		middleware.MustUserID(c),
		classroomID,
		req.Title,
		req.Phase,
		questions,
	)
	if err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, QuizDataResponse{Quiz: toQuizResponse(*item)})
}

// OpenQuiz godoc
// @Summary 发布班级小测
// @Description 教师发布小测后，班级学生可在学生端看到题目。
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "小测公开 ID"
// @Success 200 {object} ClassroomMutationResponse
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /quizzes/{id}/open [post]
func (h *Handler) OpenQuiz(c *gin.Context) {
	quizID, ok := quizIDFromPath(c)
	if !ok {
		return
	}
	if err := h.service.OpenQuiz(c.Request.Context(), middleware.MustUserID(c), quizID); err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, ClassroomMutationResponse{Updated: true})
}

// CloseQuiz godoc
// @Summary 截止班级小测
// @Description 教师截止小测后，学生不能再提交答案。
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "小测公开 ID"
// @Success 200 {object} ClassroomMutationResponse
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /quizzes/{id}/close [post]
func (h *Handler) CloseQuiz(c *gin.Context) {
	quizID, ok := quizIDFromPath(c)
	if !ok {
		return
	}
	if err := h.service.CloseQuiz(c.Request.Context(), middleware.MustUserID(c), quizID); err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, ClassroomMutationResponse{Updated: true})
}

// QuizReport godoc
// @Summary 查询小测统计
// @Description 教师查看提交率、选项分布、未提交名单与逐份提交记录。
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "小测公开 ID"
// @Success 200 {object} QuizReportResponse
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /quizzes/{id}/submissions [get]
func (h *Handler) QuizReport(c *gin.Context) {
	quizID, ok := quizIDFromPath(c)
	if !ok {
		return
	}
	report, err := h.service.QuizReport(c.Request.Context(), middleware.MustUserID(c), quizID)
	if err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, toQuizReportResponse(*report))
}

// StudentQuizzes godoc
// @Summary 查询学生端小测
// @Description 学生查询当前班级已发布的小测；响应不包含正确答案。
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Success 200 {object} StudentQuizListResponse
// @Failure 403 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /student/quizzes [get]
func (h *Handler) StudentQuizzes(c *gin.Context) {
	classroom, items, err := h.service.StudentQuizzes(c.Request.Context(), middleware.MustUserID(c))
	if err != nil {
		h.writeError(c, err)
		return
	}
	views := make([]StudentQuizResponse, 0, len(items))
	for _, item := range items {
		views = append(views, toStudentQuizResponse(item))
	}
	response.Success(c, StudentQuizListResponse{
		Classroom: toClassroomResponse(*classroom),
		Quizzes:   views,
	})
}

// SubmitQuiz godoc
// @Summary 提交小测答案
// @Description 学生提交一次答案并得到得分；重复提交返回 409。
// @Tags classrooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "小测公开 ID"
// @Param body body SubmitQuizRequest true "答案"
// @Success 200 {object} QuizSubmissionResultResponse
// @Failure 400 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Failure 409 {object} response.Envelope
// @Failure 500 {object} response.Envelope
// @Router /quizzes/{id}/submissions [post]
func (h *Handler) SubmitQuiz(c *gin.Context) {
	quizID, ok := quizIDFromPath(c)
	if !ok {
		return
	}
	var req SubmitQuizRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	result, err := h.service.SubmitQuiz(c.Request.Context(), middleware.MustUserID(c), quizID, req.Answers)
	if err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, QuizSubmissionResultResponse{
		Score:     result.Score,
		Total:     result.Total,
		Submitted: result.Submitted,
	})
}

func quizIDFromPath(c *gin.Context) (string, bool) {
	quizID := strings.TrimSpace(c.Param("id"))
	if quizID == "" {
		response.ErrorFrom(c, http.StatusBadRequest, errInvalidQuizID)
		return "", false
	}
	return quizID, true
}

func toQuizResponse(item domainclassroom.Quiz) QuizResponse {
	questions := make([]QuizQuestionResponse, 0, len(item.Questions))
	for _, question := range item.Questions {
		questions = append(questions, QuizQuestionResponse{
			ID:      question.ID,
			Prompt:  question.Prompt,
			Options: question.Options,
			Answer:  question.Answer,
		})
	}
	return QuizResponse{
		ID:              item.PublicID,
		Title:           item.Title,
		Phase:           item.Phase,
		Status:          item.Status,
		Questions:       questions,
		SubmissionCount: item.SubmissionCount,
		CreatedAt:       item.CreatedAt,
		OpenedAt:        item.OpenedAt,
		ClosedAt:        item.ClosedAt,
	}
}

func toStudentQuizResponse(item domainclassroom.Quiz) StudentQuizResponse {
	questions := make([]StudentQuizQuestionResponse, 0, len(item.Questions))
	for _, question := range item.Questions {
		questions = append(questions, StudentQuizQuestionResponse{
			ID:      question.ID,
			Prompt:  question.Prompt,
			Options: question.Options,
		})
	}
	return StudentQuizResponse{
		ID:        item.PublicID,
		Title:     item.Title,
		Phase:     item.Phase,
		Status:    item.Status,
		Questions: questions,
		OpenedAt:  item.OpenedAt,
		Submitted: item.Submitted,
		Score:     item.Score,
		Answers:   item.Answers,
	}
}

func toQuizReportResponse(report appclassroom.QuizReport) QuizReportResponse {
	students := make([]StudentResponse, 0, len(report.Students))
	for _, item := range report.Students {
		students = append(students, toStudentResponse(item))
	}
	missing := make([]StudentResponse, 0, len(report.Missing))
	for _, item := range report.Missing {
		missing = append(missing, toStudentResponse(item))
	}
	submissions := make([]QuizSubmissionResponse, 0, len(report.Submissions))
	for _, item := range report.Submissions {
		submissions = append(submissions, QuizSubmissionResponse{
			StudentID:   item.StudentPublicID,
			StudentName: item.StudentName,
			Username:    item.Username,
			Answers:     item.Answers,
			Score:       item.Score,
			SubmittedAt: item.SubmittedAt,
		})
	}
	questions := make([]QuizQuestionStatisticsResponse, 0, len(report.Questions))
	for _, item := range report.Questions {
		questions = append(questions, QuizQuestionStatisticsResponse{
			ID:           item.Question.ID,
			Prompt:       item.Question.Prompt,
			Options:      item.Question.Options,
			Answer:       item.Question.Answer,
			OptionCounts: item.OptionCounts,
			CorrectCount: item.CorrectCount,
		})
	}
	return QuizReportResponse{
		Quiz:        toQuizResponse(report.Quiz),
		Students:    students,
		Submissions: submissions,
		Missing:     missing,
		Statistics: QuizStatisticsResponse{
			StudentCount:    report.StudentCount,
			SubmissionCount: report.SubmissionCount,
			AverageScore:    report.AverageScore,
			Questions:       questions,
		},
	}
}

func toStudentResponse(item domainclassroom.Student) StudentResponse {
	return StudentResponse{
		ID:          item.PublicID,
		Username:    item.Username,
		DisplayName: item.DisplayName,
	}
}

func (h *Handler) writeQuizError(c *gin.Context, err error) bool {
	switch {
	case errors.Is(err, appclassroom.ErrQuizNotFound):
		response.ErrorFrom(c, http.StatusNotFound, err)
	case errors.Is(err, appclassroom.ErrQuizInvalid):
		response.ErrorFrom(c, http.StatusBadRequest, err)
	case errors.Is(err, appclassroom.ErrQuizClosed), errors.Is(err, appclassroom.ErrQuizSubmitted):
		response.ErrorFrom(c, http.StatusConflict, err)
	case errors.Is(err, appclassroom.ErrNotInClassroom):
		response.ErrorFrom(c, http.StatusForbidden, err)
	default:
		return false
	}
	return true
}
