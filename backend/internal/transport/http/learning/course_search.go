package learning

import (
	app "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/learning"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/gin-gonic/gin"
	"strings"
	"unicode/utf8"
)

type LearningCourseSearchResult struct {
	ID      string `json:"id"`
	Snippet string `json:"snippet"`
}
type LearningCourseSearchResponse struct {
	Items []LearningCourseSearchResult `json:"items"`
}

// SearchCourse godoc
// @Summary 搜索课程标题与讲义正文，不包含评分答案
// @Tags learning
// @Produce json
// @Security BearerAuth
// @Param q query string true "关键词"
// @Success 200 {object} LearningCourseSearchResponse
// @Router /learning/course/search [get]
func (m *Module) SearchCourse(c *gin.Context) {
	q := strings.ToLower(strings.TrimSpace(c.Query("q")))
	if q == "" || utf8.RuneCountInString(q) > 100 {
		writeError(c, app.ErrInvalid)
		return
	}
	items := []LearningCourseSearchResult{}
	for _, lesson := range domain.CourseCatalog().Lessons {
		if strings.Contains(strings.ToLower(lesson.Number+" "+lesson.Title+" "+lesson.Chapter+" "+lesson.Markdown), q) {
			snippet := []rune(lesson.Markdown)
			index := strings.Index(strings.ToLower(lesson.Markdown), q)
			if index >= 0 {
				snippet = []rune(lesson.Markdown[index:])
			}
			if len(snippet) > 140 {
				snippet = snippet[:140]
			}
			items = append(items, LearningCourseSearchResult{ID: lesson.ID, Snippet: string(snippet)})
		}
	}
	response.Success(c, LearningCourseSearchResponse{Items: items})
}
