package classroom

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
)

func (s *Service) ExtendHomeworkDeadline(ctx context.Context, actor uint, id, studentID string, deadline time.Time, reason string) error {
	if err := s.teacher(ctx, actor); err != nil {
		return err
	}
	reason = strings.TrimSpace(reason)
	if reason == "" || utf8.RuneCountInString(reason) > 500 || deadline.IsZero() {
		return ErrHomeworkInvalid
	}
	err := s.repo.ExtendHomeworkDeadline(ctx, id, actor, strings.TrimSpace(studentID), deadline, reason)
	switch {
	case errors.Is(err, repository.ErrNotFound):
		return ErrHomeworkNotFound
	case errors.Is(err, repository.ErrInvalidInput):
		return ErrHomeworkInvalid
	case errors.Is(err, repository.ErrConflict):
		return ErrHomeworkSubmitted
	default:
		return err
	}
}
