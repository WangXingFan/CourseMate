package classroom

import (
	"context"
	"errors"
	"fmt"
	"time"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
)

func (s *Service) AIActivity(ctx context.Context, actor uint, id string, options domain.AIActivityOptions) (*domain.AIActivityReport, error) {
	c, err := s.owned(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	roster, err := s.repo.ListClassroomStudents(ctx, c.ID)
	if err != nil {
		return nil, err
	}
	return s.buildAIActivity(ctx, c, roster, options, time.Now())
}

// StudentAIActivity exposes only the authenticated student's cumulative statistics.
func (s *Service) StudentAIActivity(ctx context.Context, actor uint) (*domain.AIActivityReport, error) {
	u, err := s.actor(ctx, actor)
	if err != nil {
		return nil, err
	}
	if u.Role != domainuser.RoleStudent {
		return nil, ErrForbidden
	}
	c, err := s.repo.GetStudentClassroom(ctx, actor)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	roster, err := s.repo.ListClassroomStudents(ctx, c.ID)
	if err != nil {
		return nil, err
	}
	for _, st := range roster {
		if st.ID == actor {
			return s.buildAIActivity(ctx, c, []domain.Student{st}, domain.AIActivityOptions{}, time.Now())
		}
	}
	return nil, nil
}

func (s *Service) buildAIActivity(ctx context.Context, c *domain.Classroom, roster []domain.Student, options domain.AIActivityOptions, now time.Time) (*domain.AIActivityReport, error) {
	loc := domain.AIActivityLocation
	start := c.CreatedAt.In(loc)
	today, _ := time.ParseInLocation(time.DateOnly, now.In(loc).Format(time.DateOnly), loc)
	end := today.AddDate(0, 0, 1)
	if options.StartDate != "" {
		value, err := time.ParseInLocation(time.DateOnly, options.StartDate, loc)
		if err != nil {
			return nil, ErrInvalid
		}
		if value.After(start) {
			start = value
		}
	}
	if options.EndDate != "" {
		value, err := time.ParseInLocation(time.DateOnly, options.EndDate, loc)
		if err != nil || value.After(today) {
			return nil, ErrInvalid
		}
		end = value.AddDate(0, 0, 1)
	}
	if !start.Before(end) {
		return nil, ErrInvalid
	}
	ids := make([]uint, 0, len(roster))
	for _, st := range roster {
		ids = append(ids, st.ID)
	}
	events, err := s.repo.ListAIActivityEvents(ctx, ids, end)
	if err != nil {
		return nil, fmt.Errorf("AI activity classroom %s: %w", c.PublicID, err)
	}
	return domain.BuildAIActivity(c.PublicID, roster, events, start, end, now), nil
}
