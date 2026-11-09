package classroom

import (
	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/classroom"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	learning "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
	"time"
)

type PracticePublishRequest struct {
	ConceptID   string    `json:"conceptId" binding:"required,max=64"`
	Title       string    `json:"title" binding:"required,max=120"`
	Locale      string    `json:"locale" binding:"omitempty,oneof=zh-CN en-US"`
	QuestionIDs []string  `json:"questionIds" binding:"required,min=3,max=5,dive,required,max=96"`
	StudentIDs  []string  `json:"studentIds" binding:"required,min=1,max=200,dive,required,max=64"`
	Deadline    time.Time `json:"deadline" binding:"required"`
}
type AssignedPracticeSubmitRequest struct {
	Answers map[string]map[string]string `json:"answers" binding:"required,min=3,max=5,dive,required,min=1,max=12,dive,required,max=64"`
}
type AssignedPracticeField struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Unit  string `json:"unit"`
}
type AssignedPracticeQuestion struct {
	ID      string                  `json:"id"`
	Prompt  string                  `json:"prompt"`
	Options []string                `json:"options"`
	Fields  []AssignedPracticeField `json:"fields"`
}
type PracticeCandidatesResponse struct {
	Questions []AssignedPracticeQuestion `json:"questions"`
}
type AssignedPracticeResult struct {
	QuestionID  string            `json:"questionId"`
	Answers     map[string]string `json:"answers"`
	Correct     bool              `json:"correct"`
	Expected    []string          `json:"expected"`
	Explanation string            `json:"explanation"`
}
type AssignedPracticeSubmissionResponse struct {
	Correct     int                      `json:"correct"`
	SubmittedAt time.Time                `json:"submittedAt"`
	Results     []AssignedPracticeResult `json:"results"`
}
type PracticeRecipientResponse struct {
	StudentID      string                              `json:"studentId"`
	Name           string                              `json:"name"`
	BaselineStatus string                              `json:"baselineStatus"`
	Submission     *AssignedPracticeSubmissionResponse `json:"submission" extensions:"x-nullable"`
}
type PracticeAssignmentResponse struct {
	ID         string                              `json:"id"`
	ConceptID  string                              `json:"conceptId"`
	Title      string                              `json:"title"`
	Deadline   time.Time                           `json:"deadline"`
	CreatedAt  time.Time                           `json:"createdAt"`
	Open       bool                                `json:"open"`
	Questions  []AssignedPracticeQuestion          `json:"questions"`
	Students   []PracticeRecipientResponse         `json:"students"`
	Submission *AssignedPracticeSubmissionResponse `json:"submission" extensions:"x-nullable"`
}
type PracticeAssignmentsResponse struct {
	Items      []PracticeAssignmentResponse `json:"items"`
	ServerTime time.Time                    `json:"serverTime"`
}

func assignedPracticeQuestions(items []learning.PracticeQuestion) []AssignedPracticeQuestion {
	result := make([]AssignedPracticeQuestion, 0, len(items))
	for _, q := range items {
		fields := make([]AssignedPracticeField, 0, len(q.Fields))
		for _, field := range q.Fields {
			fields = append(fields, AssignedPracticeField{ID: field.ID, Label: field.Label, Unit: field.Unit})
		}
		options := append([]string{}, q.Options...)
		result = append(result, AssignedPracticeQuestion{ID: q.ID, Prompt: q.Prompt, Options: options, Fields: fields})
	}
	return result
}
func assignedPracticeSubmission(sub domain.PracticeSubmission) AssignedPracticeSubmissionResponse {
	view := AssignedPracticeSubmissionResponse{Correct: sub.Correct, SubmittedAt: sub.SubmittedAt, Results: []AssignedPracticeResult{}}
	for _, attempt := range sub.Attempts {
		expected := []string{}
		for _, field := range attempt.Results {
			expected = append(expected, field.Expected)
		}
		view.Results = append(view.Results, AssignedPracticeResult{QuestionID: attempt.QuestionID, Answers: attempt.Answers, Correct: attempt.Score == attempt.Total, Expected: expected, Explanation: attempt.Explanation})
	}
	return view
}
func practiceAssignmentView(item app.PracticeAssignmentView, teacher bool, now time.Time) PracticeAssignmentResponse {
	a := item.Assignment
	view := PracticeAssignmentResponse{ID: a.PublicID, ConceptID: a.ConceptID, Title: a.Title, Deadline: a.Deadline, CreatedAt: a.CreatedAt, Open: now.Before(a.Deadline), Questions: assignedPracticeQuestions(a.Questions), Students: []PracticeRecipientResponse{}}
	if teacher {
		for _, recipient := range a.Recipients {
			student := PracticeRecipientResponse{StudentID: recipient.PublicID, Name: recipient.Name, BaselineStatus: recipient.BaselineStatus}
			for _, sub := range item.Submissions {
				if sub.StudentID == recipient.StudentID {
					saved := assignedPracticeSubmission(sub)
					student.Submission = &saved
					break
				}
			}
			view.Students = append(view.Students, student)
		}
	} else if len(item.Submissions) > 0 {
		saved := assignedPracticeSubmission(item.Submissions[0])
		view.Submission = &saved
	}
	return view
}

// PracticeCandidates godoc
// @Summary 教师为薄弱知识点选择巩固题
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "班级 ID"
// @Param conceptId query string true "知识点 ID"
// @Param locale query string false "zh-CN or en-US"
// @Success 200 {object} PracticeCandidatesResponse
// @Router /classrooms/{id}/practice-candidates [get]
func (h *Handler) PracticeCandidates(c *gin.Context) {
	bank, err := h.service.PracticeCandidates(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), c.Query("conceptId"), c.Query("locale"))
	if err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, PracticeCandidatesResponse{Questions: assignedPracticeQuestions(bank.Questions)})
}

// PublishPractice godoc
// @Summary 给本班指定学生发布 3 至 5 道巩固练习
// @Tags classrooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "班级 ID"
// @Param body body PracticePublishRequest true "知识点、题目、学生和期限"
// @Success 200 {object} PracticeAssignmentResponse
// @Router /classrooms/{id}/practice-assignments [post]
func (h *Handler) PublishPractice(c *gin.Context) {
	var req PracticePublishRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	item, err := h.service.PublishPractice(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), req.ConceptID, req.Title, req.Locale, req.QuestionIDs, req.StudentIDs, req.Deadline)
	if err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, practiceAssignmentView(app.PracticeAssignmentView{Assignment: *item}, true, time.Now()))
}

// PracticeAssignments godoc
// @Summary 教师查看巩固任务、发布时掌握状态及完成结果
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "班级 ID"
// @Success 200 {object} PracticeAssignmentsResponse
// @Router /classrooms/{id}/practice-assignments [get]
func (h *Handler) PracticeAssignments(c *gin.Context) {
	items, err := h.service.PracticeAssignments(c.Request.Context(), middleware.MustUserID(c), c.Param("id"))
	if err != nil {
		h.writeError(c, err)
		return
	}
	h.writePracticeAssignments(c, items, true)
}

// StudentPracticeAssignments godoc
// @Summary 学生仅查看分配给自己的巩固任务与本人结果
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Success 200 {object} PracticeAssignmentsResponse
// @Router /student/practice-assignments [get]
func (h *Handler) StudentPracticeAssignments(c *gin.Context) {
	items, err := h.service.StudentPracticeAssignments(c.Request.Context(), middleware.MustUserID(c))
	if err != nil {
		h.writeError(c, err)
		return
	}
	h.writePracticeAssignments(c, items, false)
}
func (h *Handler) writePracticeAssignments(c *gin.Context, items []app.PracticeAssignmentView, teacher bool) {
	now := time.Now().UTC()
	views := make([]PracticeAssignmentResponse, 0, len(items))
	for _, item := range items {
		views = append(views, practiceAssignmentView(item, teacher, now))
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, PracticeAssignmentsResponse{Items: views, ServerTime: now})
}

// SubmitAssignedPractice godoc
// @Summary 提交巩固练习并更新知识掌握证据，重复请求返回原结果
// @Tags classrooms
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "巩固任务 ID"
// @Param body body AssignedPracticeSubmitRequest true "按题目 ID 提交答案"
// @Success 200 {object} AssignedPracticeSubmissionResponse
// @Router /practice-assignments/{id}/submissions [post]
func (h *Handler) SubmitAssignedPractice(c *gin.Context) {
	var req AssignedPracticeSubmitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.InvalidRequestBody(c, err)
		return
	}
	sub, err := h.service.SubmitAssignedPractice(c.Request.Context(), middleware.MustUserID(c), c.Param("id"), req.Answers)
	if err != nil {
		h.writeError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	response.Success(c, assignedPracticeSubmission(*sub))
}
