package analytics

import (
	"context"
	"errors"
	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/analytics"
	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/google/uuid"
	"time"
)

type userReader interface {
	GetByID(context.Context, uint) (*domainuser.User, error)
}
type Service struct {
	repo  repository.AnalyticsRepository
	users userReader
}

func NewService(repo repository.AnalyticsRepository, users userReader) *Service {
	return &Service{repo: repo, users: users}
}

func (s *Service) RecordVisit(ctx context.Context, actor uint, eventID, path string) error {
	resource, exists := domain.Resources[path]
	if _, err := uuid.Parse(eventID); actor == 0 || err != nil || !exists {
		return ErrInvalid
	}
	return s.repo.RecordVisit(ctx, domain.Visit{EventID: eventID, UserID: actor, Resource: resource.Key, CreatedAt: time.Now().UTC()})
}

func (s *Service) Report(ctx context.Context, actor uint, days int, classroomID string) (*domain.Report, error) {
	if actor == 0 {
		return nil, ErrForbidden
	}
	user, err := s.users.GetByID(ctx, actor)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrForbidden
	}
	if err != nil {
		return nil, err
	}
	filter := domain.Filter{}
	scope := "all"
	if user.Role == domainuser.RoleTeacher {
		filter.TeacherID = actor
		scope = "teacher"
	} else if !domainuser.IsAdminRole(user.Role) {
		return nil, ErrForbidden
	}
	if days != 7 && days != 30 && days != 90 {
		return nil, ErrInvalid
	}
	classes, err := s.repo.Classrooms(ctx, filter.TeacherID)
	if err != nil {
		return nil, err
	}
	if classroomID != "" {
		for _, class := range classes {
			if class.PublicID == classroomID {
				filter.ClassroomID = class.ID
				break
			}
		}
		if filter.ClassroomID == 0 {
			return nil, ErrClassroom
		}
	}
	now := time.Now().In(domain.ReportingZone)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, domain.ReportingZone)
	filter.From, filter.Until = today.AddDate(0, 0, 1-days).UTC(), today.AddDate(0, 0, 1).UTC()
	report, err := s.repo.Report(ctx, filter)
	if err != nil {
		return nil, err
	}
	report.Scope, report.From, report.Until, report.GeneratedAt = scope, filter.From, filter.Until, now.UTC()
	counts := make(map[string]domain.Daily, len(report.Daily))
	for _, day := range report.Daily {
		counts[day.Date] = day
	}
	report.Daily = make([]domain.Daily, 0, days)
	for date := filter.From.In(domain.ReportingZone); date.Before(filter.Until); date = date.AddDate(0, 0, 1) {
		key := date.Format("2006-01-02")
		day := counts[key]
		day.Date = key
		report.Daily = append(report.Daily, day)
	}
	// All permitted classrooms remain available when a single classroom is selected.
	byID := make(map[uint]domain.Classroom)
	for _, class := range report.Classrooms {
		byID[class.ID] = class
	}
	for i := range classes {
		if item, ok := byID[classes[i].ID]; ok {
			classes[i].Visits = item.Visits
		}
	}
	report.Classrooms = classes
	return report, nil
}
