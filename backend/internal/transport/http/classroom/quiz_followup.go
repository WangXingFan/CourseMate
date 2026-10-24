package classroom

import (
	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/transport/http/middleware"
	"github.com/gin-gonic/gin"
)

// CreateQuizFollowup godoc
// @Summary 为已截止的预习测创建同知识点复测草稿
// @Description 每份预习测最多关联一份复测，重复请求返回同一份；题目使用创建预习测时保存的变式快照。
// @Tags classrooms
// @Produce json
// @Security BearerAuth
// @Param id path string true "预习测公开 ID"
// @Success 200 {object} QuizDataResponse
// @Failure 400 {object} response.Envelope
// @Failure 403 {object} response.Envelope
// @Failure 404 {object} response.Envelope
// @Router /quizzes/{id}/followup [post]
func (h *Handler) CreateQuizFollowup(c *gin.Context) {
	id, ok := quizIDFromPath(c)
	if !ok {
		return
	}
	item, err := h.service.CreateQuizFollowup(c.Request.Context(), middleware.MustUserID(c), id)
	if err != nil {
		h.writeError(c, err)
		return
	}
	response.Success(c, QuizDataResponse{Quiz: toQuizResponse(*item)})
}

type QuizConceptComparisonResponse struct {
	ConceptID     string `json:"conceptId"`
	ConceptTitle  string `json:"conceptTitle"`
	PairedCount   int    `json:"pairedCount"`
	BeforeCorrect int    `json:"beforeCorrect"`
	AfterCorrect  int    `json:"afterCorrect"`
	Improved      int    `json:"improved"`
	Retained      int    `json:"retained"`
	Regressed     int    `json:"regressed"`
	Unresolved    int    `json:"unresolved"`
}

type QuizConceptChangeResponse struct {
	ConceptID string `json:"conceptId"`
	Outcome   string `json:"outcome"`
}

type QuizStudentComparisonResponse struct {
	StudentID       string                      `json:"studentId"`
	StudentName     string                      `json:"studentName"`
	Username        string                      `json:"username"`
	BeforeSubmitted bool                        `json:"beforeSubmitted"`
	AfterSubmitted  bool                        `json:"afterSubmitted"`
	BeforeScore     int                         `json:"beforeScore"`
	AfterScore      int                         `json:"afterScore"`
	Changes         []QuizConceptChangeResponse `json:"changes"`
}

type QuizComparisonResponse struct {
	BeforeID    string                          `json:"beforeId"`
	BeforeTitle string                          `json:"beforeTitle"`
	AfterID     string                          `json:"afterId"`
	AfterTitle  string                          `json:"afterTitle"`
	AfterStatus string                          `json:"afterStatus"`
	PairedCount int                             `json:"pairedCount"`
	BeforeOnly  int                             `json:"beforeOnly"`
	AfterOnly   int                             `json:"afterOnly"`
	Neither     int                             `json:"neither"`
	Questions   []QuizConceptComparisonResponse `json:"questions"`
	Students    []QuizStudentComparisonResponse `json:"students"`
}

func toComparisonResponse(value *app.QuizComparison) *QuizComparisonResponse {
	if value == nil {
		return nil
	}
	result := &QuizComparisonResponse{BeforeID: value.BeforeID, BeforeTitle: value.BeforeTitle, AfterID: value.AfterID, AfterTitle: value.AfterTitle, AfterStatus: value.AfterStatus, PairedCount: value.PairedCount, BeforeOnly: value.BeforeOnly, AfterOnly: value.AfterOnly, Neither: value.Neither, Questions: []QuizConceptComparisonResponse{}, Students: []QuizStudentComparisonResponse{}}
	for _, q := range value.Questions {
		result.Questions = append(result.Questions, QuizConceptComparisonResponse{ConceptID: q.ConceptID, ConceptTitle: q.ConceptTitle, PairedCount: q.PairedCount, BeforeCorrect: q.BeforeCorrect, AfterCorrect: q.AfterCorrect, Improved: q.Improved, Retained: q.Retained, Regressed: q.Regressed, Unresolved: q.Unresolved})
	}
	for _, s := range value.Students {
		row := QuizStudentComparisonResponse{StudentID: s.StudentID, StudentName: s.StudentName, Username: s.Username, BeforeSubmitted: s.BeforeSubmitted, AfterSubmitted: s.AfterSubmitted, BeforeScore: s.BeforeScore, AfterScore: s.AfterScore, Changes: []QuizConceptChangeResponse{}}
		for _, c := range s.Changes {
			row.Changes = append(row.Changes, QuizConceptChangeResponse{ConceptID: c.ConceptID, Outcome: c.Outcome})
		}
		result.Students = append(result.Students, row)
	}
	return result
}
