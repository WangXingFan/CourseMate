package learningview

import (
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/shared/response"
	"github.com/gin-gonic/gin"
	"time"
)

type LearningMasteryEvidenceResponse struct {
	QuestionID string    `json:"questionId"`
	Source     string    `json:"source"`
	Prompt     string    `json:"prompt"`
	Correct    bool      `json:"correct"`
	At         time.Time `json:"at"`
}
type LearningMasteryConceptResponse struct {
	ID             string                            `json:"id"`
	Kind           string                            `json:"kind"`
	Title          string                            `json:"title"`
	Topic          string                            `json:"topic"`
	Chapter        string                            `json:"chapter"`
	ReviewHref     string                            `json:"reviewHref"`
	PracticeHref   string                            `json:"practiceHref"`
	ExperimentHref string                            `json:"experimentHref"`
	Status         string                            `json:"status"`
	Questions      int                               `json:"questions"`
	Correct        int                               `json:"correct"`
	LastAt         *time.Time                        `json:"lastAt" extensions:"x-nullable"`
	Evidence       []LearningMasteryEvidenceResponse `json:"evidence"`
}
type LearningMasteryCountsResponse struct {
	Total      int `json:"total"`
	Assessed   int `json:"assessed"`
	Weak       int `json:"weak"`
	Developing int `json:"developing"`
	Secure     int `json:"secure"`
}
type LearningMasteryWeekResponse struct {
	Start   string `json:"start"`
	Answers int    `json:"answers"`
	Correct int    `json:"correct"`
}
type LearningMasteryResponse struct {
	Concepts  []LearningMasteryConceptResponse `json:"concepts"`
	Counts    LearningMasteryCountsResponse    `json:"counts"`
	Weeks     []LearningMasteryWeekResponse    `json:"weeks"`
	UpdatedAt *time.Time                       `json:"updatedAt" extensions:"x-nullable"`
}

func MasteryCountsResponse(value domain.MasteryCounts) LearningMasteryCountsResponse {
	return LearningMasteryCountsResponse{Total: value.Total, Assessed: value.Assessed, Weak: value.Weak, Developing: value.Developing, Secure: value.Secure}
}
func MasteryConceptResponse(value domain.MasteryConcept) LearningMasteryConceptResponse {
	item := LearningMasteryConceptResponse{ID: value.ID, Kind: value.Kind, Title: value.Title, Topic: value.Topic, Chapter: value.Chapter, ReviewHref: value.ReviewHref, PracticeHref: value.PracticeHref, ExperimentHref: value.ExperimentHref, Status: value.Status, Questions: value.Questions, Correct: value.Correct, LastAt: value.LastAt, Evidence: []LearningMasteryEvidenceResponse{}}
	for _, e := range value.Evidence {
		item.Evidence = append(item.Evidence, LearningMasteryEvidenceResponse{QuestionID: e.QuestionID, Source: e.Source, Prompt: e.Prompt, Correct: e.Correct, At: e.At})
	}
	return item
}
func MasteryResponse(value domain.MasteryProfile) LearningMasteryResponse {
	result := LearningMasteryResponse{Counts: MasteryCountsResponse(value.Counts), Concepts: []LearningMasteryConceptResponse{}, Weeks: []LearningMasteryWeekResponse{}, UpdatedAt: value.UpdatedAt}
	for _, item := range value.Concepts {
		result.Concepts = append(result.Concepts, MasteryConceptResponse(item))
	}
	for _, item := range value.Weeks {
		result.Weeks = append(result.Weeks, LearningMasteryWeekResponse{Start: item.Start, Answers: item.Answers, Correct: item.Correct})
	}
	return result
}

// ParseMasteryPeriod accepts RFC3339 instants so clients can use local calendar dates.
func ParseMasteryPeriod(c *gin.Context) (domain.MasteryPeriod, bool) {
	var period domain.MasteryPeriod
	for _, bound := range []struct {
		key   string
		value *time.Time
	}{{"startAt", &period.StartAt}, {"endAt", &period.EndAt}} {
		if raw := c.Query(bound.key); raw != "" {
			parsed, err := time.Parse(time.RFC3339, raw)
			if err != nil {
				response.InvalidQueryParam(c, bound.key)
				return period, false
			}
			*bound.value = parsed.UTC()
		}
	}
	if !period.StartAt.IsZero() && !period.EndAt.IsZero() && !period.StartAt.Before(period.EndAt) {
		response.InvalidQueryParam(c, "endAt")
		return period, false
	}
	return period, true
}
