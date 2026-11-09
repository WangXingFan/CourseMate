package learning

import (
	"context"
	"encoding/json"
	"fmt"
	classroom "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"strconv"
	"strings"
	"time"
)

func (r *Repo) CorrectionSources(ctx context.Context, userID uint) ([]domain.CorrectionSource, error) {
	items := []domain.CorrectionSource{}
	for _, version := range []string{domain.PracticeBankVersion, domain.CourseCatalog().Version} {
		var rows []models.LearningLessonAttempt
		if err := r.db.WithContext(ctx).Where("user_id = ? AND version = ?", userID, version).Order("id DESC").Find(&rows).Error; err != nil {
			return nil, err
		}
		seen := map[string]bool{}
		for _, row := range rows {
			attempt, err := decodeLessonAttempt(row)
			if err != nil {
				return nil, err
			}
			if attempt.Total == 0 || attempt.Score == attempt.Total {
				continue
			}
			if seen[attempt.QuestionID] {
				continue
			}
			seen[attempt.QuestionID] = true
			var questions []domain.CourseQuestion
			source, concept, title := "course", "lesson:"+attempt.LessonID, attempt.LessonID
			if version == domain.PracticeBankVersion {
				source, concept = "practice", attempt.ConceptID
				if bank := domain.FindPracticeBank(concept, "zh-CN"); bank != nil {
					title = bank.Concept.Title
					for _, question := range bank.Questions {
						questions = append(questions, question.CourseQuestion)
					}
				}
			} else if lesson := domain.FindCourseLesson(attempt.LessonID); lesson != nil {
				title, questions = lesson.Title, lesson.Questions
			}
			for _, question := range questions {
				if question.ID != attempt.QuestionID {
					continue
				}
				evidenceID := "course:" + question.ID
				if source == "practice" {
					if bank := domain.FindPracticeBank(concept, "zh-CN"); bank != nil {
						for _, q := range bank.Questions {
							if q.ID == question.ID {
								evidenceID = "practice:" + q.CanonicalID
							}
						}
					}
				}
				items = append(items, domain.CorrectionSource{EvidenceID: evidenceID, ID: domain.CorrectionID(source, concept, question.ID), Source: source, Title: title, ConceptID: concept, LessonID: attempt.LessonID, At: attempt.CreatedAt, Question: question, Answers: attempt.Answers, OriginHref: "/learn/practice?concept=" + concept})
			}
		}
	}
	var quizzes []struct {
		ID                                      string
		Questions, Answers, FieldAnswers, Title string
		CreatedAt                               time.Time
	}
	if err := r.db.WithContext(ctx).Table("classroom_quiz_submissions s").Select("q.public_id AS id, q.questions, q.title, s.answers, s.field_answers, s.created_at").Joins("JOIN classroom_quizzes q ON q.id = s.quiz_id").Where("s.student_id = ? AND q.status = ?", userID, "closed").Scan(&quizzes).Error; err != nil {
		return nil, err
	}
	for _, row := range quizzes {
		var questions []classroom.QuizQuestion
		var answers []int
		var fields map[string]map[string]string
		if err := json.Unmarshal([]byte(row.Questions), &questions); err != nil {
			return nil, fmt.Errorf("correction quiz %s questions: %w", row.ID, err)
		}
		if err := json.Unmarshal([]byte(row.Answers), &answers); err != nil {
			return nil, fmt.Errorf("correction quiz %s answers: %w", row.ID, err)
		}
		if err := json.Unmarshal([]byte(row.FieldAnswers), &fields); err != nil {
			return nil, fmt.Errorf("correction quiz %s fields: %w", row.ID, err)
		}
		for i, q := range questions {
			score, total, valid := classroom.QuizAnswerScore(classroom.QuizSubmission{Answers: answers, FieldAnswers: fields}, i, q)
			if !valid {
				return nil, fmt.Errorf("correction quiz %s question %s: invalid answer", row.ID, q.ID)
			}
			if score == total {
				continue
			}
			question := domain.CourseQuestion{ID: q.ID, Prompt: q.Prompt, Formula: q.Formula, Options: q.Options, Answer: q.Answer, Explanation: q.Explanation}
			for _, field := range q.Fields {
				question.Fields = append(question.Fields, domain.CourseField{ID: field.ID, Label: field.Label, Unit: field.Unit, Expected: field.Expected})
			}
			original := fields[q.ID]
			if len(q.Options) > 0 {
				original = map[string]string{"choice": strconv.Itoa(answers[i])}
			}
			concept := q.ConceptID
			if !strings.HasPrefix(concept, "lesson:") && !strings.HasPrefix(concept, "topic:") {
				concept = "lesson:" + q.LessonID
			}
			items = append(items, domain.CorrectionSource{EvidenceID: "course:" + q.ID, ID: domain.CorrectionID("classroom", row.ID, q.ID), Source: "classroom", Title: row.Title, ConceptID: concept, LessonID: q.LessonID, At: row.CreatedAt, Question: question, Answers: original, OriginHref: "/activities#quiz-" + row.ID})
		}
	}
	var homeworks []struct {
		ID, Questions, Answers, Results, Title string
		CreatedAt                              time.Time
	}
	if err := r.db.WithContext(ctx).Table("classroom_homework_submissions s").Select("h.public_id AS id, h.questions, h.title, s.answers, s.results, s.created_at").Joins("JOIN classroom_homeworks h ON h.id = s.homework_id").Where("s.student_id = ? AND h.feedback_at IS NOT NULL AND h.withdrawn = ?", userID, false).Scan(&homeworks).Error; err != nil {
		return nil, err
	}
	for _, row := range homeworks {
		var questions []classroom.HomeworkQuestion
		var answers [][]string
		var results []classroom.HomeworkResult
		if err := json.Unmarshal([]byte(row.Questions), &questions); err != nil {
			return nil, fmt.Errorf("correction homework %s questions: %w", row.ID, err)
		}
		if err := json.Unmarshal([]byte(row.Answers), &answers); err != nil {
			return nil, fmt.Errorf("correction homework %s answers: %w", row.ID, err)
		}
		if err := json.Unmarshal([]byte(row.Results), &results); err != nil {
			return nil, fmt.Errorf("correction homework %s results: %w", row.ID, err)
		}
		if len(answers) != len(questions) || len(results) != len(questions) {
			return nil, fmt.Errorf("correction homework %s: answer count mismatch", row.ID)
		}
		for i, q := range questions {
			if results[i].Score == results[i].Total {
				continue
			}
			question := domain.CourseQuestion{ID: q.ID, Prompt: q.Prompt, Options: q.Options, Explanation: q.Explanation}
			original := map[string]string{}
			if len(q.Options) > 0 {
				original["choice"] = answers[i][0]
			} else {
				for j, answer := range answers[i] {
					key := strconv.Itoa(j + 1)
					original[key] = answer
					question.Fields = append(question.Fields, domain.CourseField{ID: key, Label: key})
				}
			}
			items = append(items, domain.CorrectionSource{ID: domain.CorrectionID("homework", row.ID, q.ID), Source: "homework", Title: row.Title, At: row.CreatedAt, Question: question, TextAnswers: q.Accepted, Answers: original, OriginHref: "/homeworks#" + row.ID})
		}
	}
	return items, nil
}
