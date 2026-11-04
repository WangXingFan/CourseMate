package repository

import (
	"context"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	"time"
)

type LearningMasteryRepository interface {
	MasteryEvidence(context.Context, []uint, uint, time.Time) ([]domain.MasteryEvidence, error)
}
