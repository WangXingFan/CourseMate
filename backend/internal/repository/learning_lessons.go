package repository

import (
	"context"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
)

type LearningLessonRepository interface {
	SaveLessonAttempt(context.Context, domain.LessonAttempt) (*domain.LessonAttempt, error)
	LatestLessonAttempts(context.Context, uint, string) ([]domain.LessonAttempt, error)
}
