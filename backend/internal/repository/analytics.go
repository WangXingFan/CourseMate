package repository

import (
	"context"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/analytics"
)

type AnalyticsRepository interface {
	RecordVisit(context.Context, domain.Visit) error
	Classrooms(context.Context, uint) ([]domain.Classroom, error)
	Report(context.Context, domain.Filter) (*domain.Report, error)
}
