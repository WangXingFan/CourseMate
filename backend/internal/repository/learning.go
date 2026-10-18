package repository

import (
	"context"

	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
)

type LearningRepository interface {
	SaveAttempt(context.Context, learning.Attempt) (*learning.Attempt, error)
	Progress(context.Context, uint) (*learning.Progress, error)
}
