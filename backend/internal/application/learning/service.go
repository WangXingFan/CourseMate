package learning

import (
	"context"
	"strings"
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/google/uuid"
)

type Service struct {
	repo          repository.LearningRepository
	lessonRepo    repository.LearningLessonRepository
	routeResolver tutorRouteResolver
	llmGateway    tutorLLMGateway
	now           func() time.Time
}

func NewService(repo repository.LearningRepository) *Service {
	lessonRepo, _ := repo.(repository.LearningLessonRepository)
	return &Service{repo: repo, lessonRepo: lessonRepo, now: time.Now}
}

func (s *Service) Submit(ctx context.Context, userID uint, id, questionID string, selected int) (*domain.Attempt, error) {
	parsed, err := uuid.Parse(id)
	question := domain.FindQuestion(questionID)
	if err != nil || parsed == uuid.Nil || userID == 0 || selected < 0 || selected > 3 || question == nil {
		return nil, ErrInvalid
	}
	correct := selected == question.Answer
	input := domain.Attempt{
		ID:          parsed.String(),
		UserID:      userID,
		QuestionID:  questionID,
		Selected:    selected,
		Correct:     correct,
		Mode:        domain.AttemptModeQuiz,
		ReviewStage: 0,
	}
	if !correct {
		due := s.now().UTC().Add(24 * time.Hour)
		input.NextReviewAt = &due
	}
	return s.saveAndValidate(ctx, input)
}

func (s *Service) SubmitReview(ctx context.Context, userID uint, id, baseQuestionID, variantID string, selected int) (*domain.Attempt, error) {
	parsed, err := uuid.Parse(id)
	variant := domain.FindVariant(variantID)
	if err != nil || parsed == uuid.Nil || userID == 0 || selected < 0 || selected > 3 || variant == nil || variant.BaseQuestionID != baseQuestionID {
		return nil, ErrInvalid
	}
	input := domain.Attempt{ID: parsed.String(), UserID: userID, QuestionID: baseQuestionID,
		Selected: selected, Correct: selected == variant.Answer, Mode: domain.AttemptModeReview, VariantID: variantID}
	saved, err := s.repo.SaveReview(ctx, input, s.now().UTC())
	if err != nil {
		return nil, err
	}
	if saved == nil {
		return nil, ErrInvalid
	}
	return validateSaved(saved, input)
}

func (s *Service) Progress(ctx context.Context, userID uint) (*domain.Progress, error) {
	if userID == 0 {
		return nil, ErrInvalid
	}
	return s.repo.Progress(ctx, userID)
}

func (s *Service) saveAndValidate(ctx context.Context, input domain.Attempt) (*domain.Attempt, error) {
	saved, err := s.repo.SaveAttempt(ctx, input)
	if err != nil {
		return nil, err
	}
	return validateSaved(saved, input)
}

func validateSaved(saved *domain.Attempt, input domain.Attempt) (*domain.Attempt, error) {
	savedMode := strings.TrimSpace(saved.Mode)
	if savedMode == "" {
		savedMode = domain.AttemptModeQuiz
	}
	if saved.QuestionID != input.QuestionID || saved.Selected != input.Selected || savedMode != input.Mode || saved.VariantID != input.VariantID {
		return nil, ErrConflict
	}
	return saved, nil
}
