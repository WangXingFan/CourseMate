package repository

import (
	"context"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
)

type LearningCorrectionsRepository interface {
	CorrectionSources(context.Context, uint) ([]domain.CorrectionSource, error)
}
