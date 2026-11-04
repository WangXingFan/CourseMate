package repository

import (
	"context"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
)

type LearningVirtualLabRepository interface {
	VirtualLabAccess(context.Context, uint) (map[string]bool, error)
	GetVirtualLab(context.Context, uint) (*domain.VirtualLab, error)
	SaveVirtualLab(context.Context, uint, uint64, string) (*domain.VirtualLab, error)
}
