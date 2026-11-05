package repository

import (
	"context"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/attendance"
	"time"
)

type AttendanceRepository interface {
	Create(context.Context, domain.Session) error
	List(context.Context, uint) ([]domain.Session, error)
	Get(context.Context, string) (domain.Session, error)
	Records(context.Context, string) ([]domain.Record, error)
	StudentList(context.Context, uint, uint) ([]domain.StudentSession, error)
	Close(context.Context, string, time.Time) error
	Mutate(context.Context, string, string, func(domain.Session, *domain.Record, bool) error) (domain.Record, error)
}
