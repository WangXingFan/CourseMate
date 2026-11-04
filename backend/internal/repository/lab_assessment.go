package repository

import (
	"context"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/labassessment"
)

type LabAssessmentRepository interface {
	Create(context.Context, domain.Assignment) error
	List(context.Context, string) ([]domain.Assignment, error)
	Get(context.Context, string) (domain.Assignment, error)
	SetOpen(context.Context, string, bool) error
	ReadState(context.Context, string, uint) (domain.State, error)
	States(context.Context, string) ([]domain.State, error)
	// Assignment lock serializes publication closure, checkpoints and attempts.
	Mutate(context.Context, string, uint, func(domain.Assignment, *domain.State) error) (domain.State, error)
}
