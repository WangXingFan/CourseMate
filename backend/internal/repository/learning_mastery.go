package repository

import (
	"context"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
)

type LearningMasteryRepository interface {
	MasteryEvidence(context.Context, []uint, uint, domain.MasteryPeriod) ([]domain.MasteryEvidence, error)
}
