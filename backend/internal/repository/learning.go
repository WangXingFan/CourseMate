package repository

import (
	"context"
	"time"

	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
)

type LearningRepository interface {
	SaveAttempt(context.Context, learning.Attempt) (*learning.Attempt, error)
	SaveReview(context.Context, learning.Attempt, time.Time) (*learning.Attempt, error)
	Progress(context.Context, uint) (*learning.Progress, error)
}
