package learning

import (
	"context"
	"encoding/json"
	"fmt"
	classdomain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/infra/persistence/models"
	"gorm.io/gorm"
	"time"
)

func (r *Repo) MasteryEvidence(ctx context.Context, users []uint, classroomID uint, period domain.MasteryPeriod) ([]domain.MasteryEvidence, error) {
	result := []domain.MasteryEvidence{}
	if len(users) == 0 {
		return result, nil
	}
	var attempts []models.LearningAttempt
	if err := r.db.WithContext(ctx).Scopes(masteryPeriodScope("created_at", period)).Where("user_id IN ?", users).Order("created_at ASC, id ASC").Find(&attempts).Error; err != nil {
		return nil, err
	}
	for _, item := range attempts {
		question := domain.FindQuestion(item.QuestionID)
		if question == nil {
			continue
		}
		questionID, source, prompt := item.QuestionID, "practice", ""
		if item.Mode == domain.AttemptModeReview {
			questionID = item.VariantID
			source = "review"
			if variant := domain.FindVariant(item.VariantID); variant != nil {
				prompt = variant.ZH.Prompt
			}
		}
		result = append(result, domain.MasteryEvidence{UserID: item.UserID, ConceptID: "topic:" + question.Topic, QuestionID: "practice:" + questionID, Source: source, Prompt: prompt, Correct: item.Correct, At: item.CreatedAt})
	}
	var lessons []models.LearningLessonAttempt
	if err := r.db.WithContext(ctx).Scopes(masteryPeriodScope("created_at", period)).Where("user_id IN ? AND version IN ?", users, []string{domain.CourseCatalog().Version, domain.PracticeBankVersion}).Order("created_at ASC, id ASC").Find(&lessons).Error; err != nil {
		return nil, err
	}
	practiceBanks := map[string]*domain.PracticeBank{}
	for _, row := range lessons {
		item, err := decodeLessonAttempt(row)
		if err != nil {
			return nil, fmt.Errorf("mastery lesson attempt %d: %w", row.ID, err)
		}
		if row.Version == domain.PracticeBankVersion {
			bank, found := practiceBanks[item.ConceptID]
			if !found {
				bank = domain.FindPracticeBank(item.ConceptID, "zh-CN")
				practiceBanks[item.ConceptID] = bank
			}
			if bank != nil && item.Total > 0 {
				for _, q := range bank.Questions {
					if q.ID == item.QuestionID {
						result = append(result, domain.MasteryEvidence{UserID: row.UserID, ConceptID: item.ConceptID, QuestionID: "practice:" + q.CanonicalID, Source: "practice", Prompt: q.Prompt, Correct: item.Score == item.Total, At: row.CreatedAt})
						break
					}
				}
			}
			continue
		}
		lesson := domain.FindCourseLesson(item.LessonID)
		if lesson == nil || item.Total <= 0 {
			continue
		}
		prompt := ""
		for _, q := range lesson.Questions {
			if q.ID == item.QuestionID {
				prompt = q.Prompt
				break
			}
		}
		result = append(result, domain.MasteryEvidence{UserID: row.UserID, ConceptID: "lesson:" + lesson.ID, QuestionID: "course:" + item.QuestionID, Source: "course", Prompt: prompt, Correct: item.Score == item.Total, At: row.CreatedAt})
	}
	var submissions []struct {
		ID                               uint
		StudentID                        uint
		Questions, Answers, FieldAnswers string
		CreatedAt                        time.Time
	}
	query := r.db.WithContext(ctx).Table("classroom_quiz_submissions AS submissions").
		Select("submissions.id, submissions.student_id, quizzes.questions, submissions.answers, submissions.field_answers, submissions.created_at").
		Joins("JOIN classroom_quizzes AS quizzes ON quizzes.id = submissions.quiz_id").
		Scopes(masteryPeriodScope("submissions.created_at", period)).
		Where("submissions.student_id IN ? AND quizzes.status = ?", users, "closed")
	if classroomID != 0 {
		query = query.Where("quizzes.classroom_id = ?", classroomID)
	}
	if err := query.Order("submissions.created_at ASC, submissions.id ASC").Scan(&submissions).Error; err != nil {
		return nil, err
	}
	for _, row := range submissions {
		var questions []classdomain.QuizQuestion
		var answers []int
		if err := json.Unmarshal([]byte(row.Questions), &questions); err != nil {
			return nil, fmt.Errorf("mastery quiz submission %d questions: %w", row.ID, err)
		}
		if err := json.Unmarshal([]byte(row.Answers), &answers); err != nil {
			return nil, fmt.Errorf("mastery quiz submission %d answers: %w", row.ID, err)
		}
		if len(questions) != len(answers) {
			return nil, fmt.Errorf("mastery quiz submission %d: answer count mismatch", row.ID)
		}
		var fields map[string]map[string]string
		if err := json.Unmarshal([]byte(row.FieldAnswers), &fields); err != nil {
			return nil, fmt.Errorf("mastery quiz submission %d fields: %w", row.ID, err)
		}
		submission := classdomain.QuizSubmission{Answers: answers, FieldAnswers: fields}
		for i, q := range questions {
			if domain.FindCourseLesson(q.LessonID) == nil {
				continue
			}
			score, total, valid := classdomain.QuizAnswerScore(submission, i, q)
			if !valid {
				return nil, fmt.Errorf("mastery quiz submission %d question %s: invalid answer", row.ID, q.ID)
			}
			result = append(result, domain.MasteryEvidence{UserID: row.StudentID, ConceptID: "lesson:" + q.LessonID, QuestionID: "course:" + q.ID, Source: "classroom", Prompt: q.Prompt, Correct: score == total, At: row.CreatedAt})
		}
	}
	return result, nil
}

func masteryPeriodScope(column string, period domain.MasteryPeriod) func(*gorm.DB) *gorm.DB {
	return func(query *gorm.DB) *gorm.DB {
		if !period.StartAt.IsZero() {
			query = query.Where(column+" >= ?", period.StartAt)
		}
		if !period.EndAt.IsZero() {
			query = query.Where(column+" < ?", period.EndAt)
		}
		return query
	}
}
