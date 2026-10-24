package classroom

import (
	"context"
	"errors"
	"strings"
	"unicode/utf8"

	userapp "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/application/user"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/google/uuid"
)

type userReader interface {
	GetByID(context.Context, uint) (*domainuser.User, error)
}

type Service struct {
	repo  repository.ClassroomRepository
	users userReader
}

func NewService(repo repository.ClassroomRepository, users userReader) *Service {
	return &Service{repo: repo, users: users}
}

func (s *Service) actor(ctx context.Context, id uint) (*domainuser.User, error) {
	if id == 0 {
		return nil, ErrForbidden
	}
	item, err := s.users.GetByID(ctx, id)
	if errors.Is(err, userapp.ErrUserNotFound) || errors.Is(err, repository.ErrNotFound) {
		return nil, ErrForbidden
	}
	if err != nil {
		return nil, err
	}
	return item, nil
}

func (s *Service) teacher(ctx context.Context, id uint) error {
	user, err := s.actor(ctx, id)
	if err != nil {
		return err
	}
	if user.Role != domainuser.RoleTeacher {
		return ErrForbidden
	}
	return nil
}

func (s *Service) List(ctx context.Context, actor uint) ([]domain.Classroom, error) {
	user, err := s.actor(ctx, actor)
	if err != nil {
		return nil, err
	}
	switch {
	case user.Role == domainuser.RoleTeacher:
		return s.repo.ListClassrooms(ctx, actor, true)
	case domainuser.IsAdminRole(user.Role):
		return s.repo.ListClassrooms(ctx, actor, false)
	default:
		return []domain.Classroom{}, nil
	}
}

func details(name, description string) (string, string, error) {
	name = strings.TrimSpace(name)
	description = strings.TrimSpace(description)
	if name == "" || utf8.RuneCountInString(name) > 80 || utf8.RuneCountInString(description) > 255 {
		return "", "", ErrInvalid
	}
	return name, description, nil
}

func (s *Service) Create(ctx context.Context, actor uint, name, description string) (*domain.Classroom, error) {
	if err := s.teacher(ctx, actor); err != nil {
		return nil, err
	}
	name, description, err := details(name, description)
	if err != nil {
		return nil, err
	}
	return s.repo.CreateClassroom(ctx, domain.Classroom{
		PublicID:    strings.ReplaceAll(uuid.NewString(), "-", ""),
		TeacherID:   actor,
		Name:        name,
		Description: description,
	})
}

func (s *Service) owned(ctx context.Context, actor uint, publicID string) (*domain.Classroom, error) {
	if err := s.teacher(ctx, actor); err != nil {
		return nil, err
	}
	item, err := s.repo.GetOwnedClassroom(ctx, strings.TrimSpace(publicID), actor)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	return item, err
}

func (s *Service) readable(ctx context.Context, actor uint, publicID string) (*domain.Classroom, error) {
	user, err := s.actor(ctx, actor)
	if err != nil {
		return nil, err
	}
	var item *domain.Classroom
	switch {
	case user.Role == domainuser.RoleTeacher:
		item, err = s.repo.GetOwnedClassroom(ctx, strings.TrimSpace(publicID), actor)
	case domainuser.IsAdminRole(user.Role):
		item, err = s.repo.GetClassroom(ctx, strings.TrimSpace(publicID))
	default:
		return nil, ErrForbidden
	}
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	return item, err
}

func (s *Service) Update(ctx context.Context, actor uint, publicID, name, description string) error {
	if _, err := s.owned(ctx, actor, publicID); err != nil {
		return err
	}
	name, description, err := details(name, description)
	if err != nil {
		return err
	}
	return mapError(s.repo.UpdateClassroom(ctx, strings.TrimSpace(publicID), actor, name, description))
}

func (s *Service) Delete(ctx context.Context, actor uint, publicID string) error {
	if _, err := s.owned(ctx, actor, publicID); err != nil {
		return err
	}
	return mapError(s.repo.DeleteClassroom(ctx, strings.TrimSpace(publicID), actor))
}

func (s *Service) Students(ctx context.Context, actor uint, publicID string) ([]domain.Student, error) {
	item, err := s.readable(ctx, actor, publicID)
	if err != nil {
		return nil, err
	}
	return s.repo.ListClassroomStudents(ctx, item.ID)
}

func (s *Service) AddStudent(ctx context.Context, actor uint, publicID, username string) error {
	item, err := s.owned(ctx, actor, publicID)
	if err != nil {
		return err
	}
	normalized, err := userapp.NormalizeUsername(username)
	if err != nil {
		return ErrStudentNotFound
	}
	username = normalized
	err = s.repo.AddClassroomStudent(ctx, item.ID, actor, username)
	if errors.Is(err, repository.ErrInvalidInput) || errors.Is(err, repository.ErrNotFound) {
		return ErrStudentNotFound
	}
	return mapError(err)
}

func (s *Service) RemoveStudent(ctx context.Context, actor uint, publicID, studentPublicID string) error {
	item, err := s.owned(ctx, actor, publicID)
	if err != nil {
		return err
	}
	studentPublicID = strings.TrimSpace(studentPublicID)
	if studentPublicID == "" {
		return ErrStudentNotFound
	}
	err = s.repo.RemoveClassroomStudent(ctx, item.ID, actor, studentPublicID)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrStudentNotFound
	}
	return mapError(err)
}

func mapError(err error) error {
	if errors.Is(err, repository.ErrNotFound) {
		return ErrNotFound
	}
	if errors.Is(err, repository.ErrConflict) || errors.Is(err, repository.ErrDuplicate) {
		return ErrAssigned
	}
	return err
}
