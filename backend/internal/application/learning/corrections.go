package learning

import (
	"context"
	classroom "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/google/uuid"
	"maps"
	"sort"
	"strconv"
	"strings"
	"time"
)

func (s *Service) Corrections(ctx context.Context, userID uint) ([]domain.CorrectionSource, error) {
	repo, ok := s.repo.(repository.LearningCorrectionsRepository)
	if !ok || userID == 0 || s.lessonRepo == nil {
		return nil, ErrInvalid
	}
	items, err := repo.CorrectionSources(ctx, userID)
	if err != nil {
		return nil, err
	}
	reviews, err := s.lessonRepo.LatestLessonAttempts(ctx, userID, domain.CorrectionVersion)
	if err != nil {
		return nil, err
	}
	byID := map[string]domain.LessonAttempt{}
	for _, review := range reviews {
		byID[review.QuestionID] = review
	}
	for i := range items {
		item := &items[i]
		due := item.At.Add(24 * time.Hour)
		item.NextReviewAt = &due
		if review, exists := byID[item.ID]; exists && review.SourceAt.Equal(item.At) {
			item.ReviewStage, item.NextReviewAt, item.LastReview = review.ReviewStage, review.NextReviewAt, &review
		}
	}
	sort.Slice(items, func(i, j int) bool { return items[i].At.After(items[j].At) })
	return items, nil
}

func (s *Service) SubmitCorrection(ctx context.Context, userID uint, id, correctionID string, answers map[string]string) (*domain.LessonAttempt, error) {
	parsed, err := uuid.Parse(id)
	if err != nil || parsed == uuid.Nil {
		return nil, ErrInvalid
	}
	items, err := s.Corrections(ctx, userID)
	if err != nil {
		return nil, err
	}
	var item *domain.CorrectionSource
	for i := range items {
		if items[i].ID == correctionID {
			item = &items[i]
			break
		}
	}
	if item == nil {
		return nil, ErrInvalid
	}
	results, score, valid := gradeCorrection(*item, answers)
	if !valid {
		return nil, ErrInvalid
	}
	now := s.now().UTC()
	stage, due := item.ReviewStage, item.NextReviewAt
	correct := score == len(results)
	// Early practice gives feedback without skipping scheduled review intervals.
	if !correct || due != nil && !now.Before(*due) {
		stage, due = domain.ScheduleReview(stage, correct, now)
	}
	input := domain.LessonAttempt{ID: parsed.String(), UserID: userID, Version: domain.CorrectionVersion, QuestionID: item.ID, ConceptID: item.ConceptID, LessonID: item.LessonID, Stage: "correction", Answers: answers, Score: score, Total: len(results), Results: results, Explanation: item.Question.Explanation, CreatedAt: now, SourceAt: item.At, ReviewStage: stage, NextReviewAt: due}
	input.EvidenceID = item.EvidenceID
	saved, err := s.lessonRepo.SaveLessonAttempt(ctx, input)
	if err != nil {
		return nil, err
	}
	if saved == nil || saved.Version != input.Version || saved.QuestionID != item.ID || !maps.Equal(saved.Answers, answers) {
		return nil, ErrConflict
	}
	return saved, nil
}

func gradeCorrection(item domain.CorrectionSource, answers map[string]string) ([]domain.LessonFieldResult, int, bool) {
	if item.TextAnswers == nil {
		return domain.GradeCourseQuestion(item.Question, answers)
	}
	question := classroom.HomeworkQuestion{Kind: "blank", Points: len(item.TextAnswers), Accepted: item.TextAnswers, Options: item.Question.Options}
	keys, values := []string{}, []string{}
	if len(question.Options) > 0 {
		question.Kind = "choice"
		keys = append(keys, "choice")
	} else {
		for i := range question.Accepted {
			keys = append(keys, strconv.Itoa(i+1))
		}
	}
	if len(answers) != len(keys) {
		return nil, 0, false
	}
	for _, key := range keys {
		value := strings.TrimSpace(answers[key])
		if value == "" {
			return nil, 0, false
		}
		values = append(values, value)
	}
	graded, score, valid := classroom.GradeHomework([]classroom.HomeworkQuestion{question}, [][]string{values})
	if !valid {
		return nil, 0, false
	}
	results := []domain.LessonFieldResult{}
	for i, key := range keys {
		expected := question.Accepted[i][0]
		if len(question.Options) > 0 {
			index, err := strconv.Atoi(expected)
			if err == nil && index >= 0 && index < len(question.Options) {
				expected = question.Options[index]
			}
		}
		results = append(results, domain.LessonFieldResult{ID: key, Correct: graded[0].Correct[i], Expected: expected})
	}
	return results, score, true
}
