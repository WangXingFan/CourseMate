package learning

import (
	"context"
	_ "embed"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/learning"
	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
)

//go:embed assets/teacher-guide.html
var teacherGuide string

func (s *Service) VirtualLabAccess(ctx context.Context, userID uint) (map[string]bool, error) {
	repo, ok := s.repo.(repository.LearningVirtualLabRepository)
	if !ok || userID == 0 {
		return nil, ErrInvalid
	}
	return repo.VirtualLabAccess(ctx, userID)
}

func (s *Service) VirtualLab(ctx context.Context, userID uint) (*domain.VirtualLab, error) {
	repo, ok := s.repo.(repository.LearningVirtualLabRepository)
	if !ok || userID == 0 {
		return nil, ErrInvalid
	}
	return repo.GetVirtualLab(ctx, userID)
}

func (s *Service) SaveVirtualLab(ctx context.Context, userID uint, revision uint64, document string) (*domain.VirtualLab, error) {
	repo, ok := s.repo.(repository.LearningVirtualLabRepository)
	if !ok || userID == 0 || revision >= 9007199254740991 {
		return nil, ErrInvalid
	}
	if err := domain.ValidateVirtualLab(document); err != nil {
		return nil, ErrInvalid
	}
	access, err := repo.VirtualLabAccess(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !access["L1"] && !access["L2"] && !access["L3"] {
		return nil, ErrVirtualLabClosed
	}
	previous, err := repo.GetVirtualLab(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !domain.VirtualLabChangesAllowed(previous.Document, document, access) {
		return nil, ErrVirtualLabClosed
	}
	return repo.SaveVirtualLab(ctx, userID, revision, document)
}

func (s *Service) VirtualLabGuide(role string) (string, bool) {
	if role != domainuser.RoleTeacher && !domainuser.IsAdminRole(role) {
		return "", false
	}
	return teacherGuide, true
}
