package learning

import (
	"context"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/google/uuid"
)

type Service struct{ repo repository.LearningRepository }

func NewService(repo repository.LearningRepository) *Service { return &Service{repo: repo} }

func (s *Service) Submit(ctx context.Context, userID uint, id, questionID string, selected int) (*domain.Attempt, error) {
	parsed, err := uuid.Parse(id)
	if err != nil || parsed == uuid.Nil || userID == 0 || selected < 0 || selected > 3 {
		return nil, ErrInvalid
	}
	var question *domain.Question
	for _, item := range domain.Questions() {
		if item.ID == questionID {
			question = &item
			break
		}
	}
	if question == nil {
		return nil, ErrInvalid
	}
	input := domain.Attempt{ID: parsed.String(), UserID: userID, QuestionID: questionID, Selected: selected, Correct: selected == question.Answer}
	saved, err := s.repo.SaveAttempt(ctx, input)
	if err != nil {
		return nil, err
	}
	if saved.QuestionID != input.QuestionID || saved.Selected != input.Selected {
		return nil, ErrConflict
	}
	return saved, nil
}

func (s *Service) Progress(ctx context.Context, userID uint) (*domain.Progress, error) {
	if userID == 0 {
		return nil, ErrInvalid
	}
	return s.repo.Progress(ctx, userID)
}
