package attendance

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/attendance"
	classroom "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	user "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/google/uuid"
)

type userReader interface {
	GetByID(context.Context, uint) (*user.User, error)
	GetCredentialByUserID(context.Context, uint) (*user.Credential, error)
}
type classroomReader interface {
	GetOwnedClassroom(context.Context, string, uint) (*classroom.Classroom, error)
	GetStudentClassroom(context.Context, uint) (*classroom.Classroom, error)
}
type Service struct {
	repo    repository.AttendanceRepository
	classes classroomReader
	users   userReader
	now     func() time.Time
}

func NewService(repo repository.AttendanceRepository, classes classroomReader, users userReader) *Service {
	return &Service{repo: repo, classes: classes, users: users, now: time.Now}
}
func (s *Service) actor(ctx context.Context, id uint, role string) (*user.User, error) {
	u, err := s.users.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if id == 0 || u == nil || u.Role != role || u.Status != user.StatusActive {
		return nil, domain.ErrForbidden
	}
	return u, nil
}
func (s *Service) owned(ctx context.Context, actor uint, id string) (*classroom.Classroom, error) {
	if _, err := s.actor(ctx, actor, user.RoleTeacher); err != nil {
		return nil, err
	}
	c, err := s.classes.GetOwnedClassroom(ctx, id, actor)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, domain.ErrNotFound
	}
	return c, err
}
func (s *Service) teacherSession(ctx context.Context, actor uint, id string) (domain.Session, error) {
	if _, err := s.actor(ctx, actor, user.RoleTeacher); err != nil {
		return domain.Session{}, err
	}
	a, err := s.repo.Get(ctx, id)
	if err != nil {
		return a, err
	}
	if a.TeacherID != actor {
		return domain.Session{}, domain.ErrForbidden
	}
	return a, nil
}
func (s *Service) List(ctx context.Context, actor uint, classID string) ([]domain.Session, error) {
	c, err := s.owned(ctx, actor, classID)
	if err != nil {
		return nil, err
	}
	return s.repo.List(ctx, c.ID)
}
func (s *Service) Create(ctx context.Context, actor uint, classID, title string, minutes, lateAfter int) (domain.Session, error) {
	c, err := s.owned(ctx, actor, classID)
	if err != nil {
		return domain.Session{}, err
	}
	title = strings.TrimSpace(title)
	if title == "" || utf8.RuneCountInString(title) > 120 || minutes < 1 || minutes > 180 || lateAfter < 0 || lateAfter >= minutes {
		return domain.Session{}, domain.ErrInvalid
	}
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err != nil {
		return domain.Session{}, err
	}
	now := s.now().UTC()
	a := domain.Session{ID: strings.ReplaceAll(uuid.NewString(), "-", ""), ClassroomID: c.ID, TeacherID: actor, Title: title, Secret: hex.EncodeToString(secret), StartsAt: now, EndsAt: now.Add(time.Duration(minutes) * time.Minute)}
	if lateAfter > 0 {
		late := now.Add(time.Duration(lateAfter) * time.Minute)
		a.LateAt = &late
	}
	return a, s.repo.Create(ctx, a)
}
func (s *Service) Report(ctx context.Context, actor uint, id string) (domain.Session, []domain.Record, error) {
	a, err := s.teacherSession(ctx, actor, id)
	if err != nil {
		return a, nil, err
	}
	rows, err := s.repo.Records(ctx, id)
	return a, rows, err
}
func (s *Service) Close(ctx context.Context, actor uint, id string) error {
	if _, err := s.teacherSession(ctx, actor, id); err != nil {
		return err
	}
	return s.repo.Close(ctx, id, s.now().UTC())
}
func (s *Service) StudentList(ctx context.Context, actor uint) ([]domain.StudentSession, error) {
	if _, err := s.actor(ctx, actor, user.RoleStudent); err != nil {
		return nil, err
	}
	c, err := s.classes.GetStudentClassroom(ctx, actor)
	if errors.Is(err, repository.ErrNotFound) {
		return []domain.StudentSession{}, nil
	}
	if err != nil {
		return nil, err
	}
	return s.repo.StudentList(ctx, c.ID, actor)
}
func (s *Service) CheckIn(ctx context.Context, actor uint, id, code string) (domain.Record, error) {
	u, err := s.actor(ctx, actor, user.RoleStudent)
	if err != nil {
		return domain.Record{}, err
	}
	credential, err := s.users.GetCredentialByUserID(ctx, actor)
	if err != nil {
		return domain.Record{}, err
	}
	if credential.MustResetPassword {
		return domain.Record{}, domain.ErrActivation
	}
	var rejected error
	result, err := s.repo.Mutate(ctx, id, u.PublicID, func(a domain.Session, r *domain.Record, member bool) error {
		if !member {
			return domain.ErrForbidden
		}
		// Retries must not overwrite an accepted check-in or a teacher correction.
		if r.CheckedAt != nil || len(r.Corrections) > 0 {
			return nil
		}
		now := s.now().UTC()
		if !a.Open(now) {
			return domain.ErrClosed
		}
		window := now.Unix() / 30
		if r.AttemptWindow != window {
			r.AttemptWindow, r.FailedAttempts = window, 0
		}
		if r.FailedAttempts >= 5 {
			return domain.ErrAttempts
		}
		expected, _ := a.Code(now)
		if subtle.ConstantTimeCompare([]byte(strings.TrimSpace(code)), []byte(expected)) != 1 {
			r.FailedAttempts++
			rejected = domain.ErrCode
			return nil // Persist failed attempts even though the request is rejected.
		}
		r.Status, r.CheckedAt = "present", &now
		if a.LateAt != nil && !now.Before(*a.LateAt) {
			r.Status = "late"
		}
		return nil
	})
	if err != nil {
		return result, err
	}
	return result, rejected
}
func (s *Service) Correct(ctx context.Context, actor uint, id, studentID, status, reason string) (domain.Record, error) {
	if _, err := s.teacherSession(ctx, actor, id); err != nil {
		return domain.Record{}, err
	}
	reason = strings.TrimSpace(reason)
	if reason == "" || utf8.RuneCountInString(reason) > 300 {
		return domain.Record{}, domain.ErrInvalid
	}
	switch status {
	case "present", "late", "absent", "excused":
	default:
		return domain.Record{}, domain.ErrInvalid
	}
	return s.repo.Mutate(ctx, id, studentID, func(a domain.Session, r *domain.Record, _ bool) error {
		if a.TeacherID != actor {
			return domain.ErrForbidden
		}
		r.Corrections = append(r.Corrections, domain.Correction{ActorID: actor, At: s.now().UTC(), Previous: r.Status, Status: status, Reason: reason})
		r.Status = status
		return nil
	})
}
