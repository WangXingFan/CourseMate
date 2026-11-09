package exports

import (
	"context"
	"strings"
	"unicode/utf8"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
)

func normalizeExportProfile(p *domain.ExportProfile) error {
	for _, field := range []struct {
		value *string
		limit int
	}{{&p.AcademicTerm, 64}, {&p.CourseCode, 64}, {&p.CourseName, 120}, {&p.TeacherName, 80}, {&p.College, 120}, {&p.TeachingLocation, 120}} {
		*field.value = strings.TrimSpace(*field.value)
		if *field.value == "" || utf8.RuneCountInString(*field.value) > field.limit {
			return ErrProfileRequired
		}
	}
	return nil
}

func (s *Service) ExportProfile(ctx context.Context, actor uint, id string) (domain.ExportProfile, error) {
	c, err := s.ownedClassroom(ctx, actor, id)
	if err != nil {
		return domain.ExportProfile{}, err
	}
	p, err := s.classes.GetExportProfile(ctx, c.ID)
	if err != nil {
		return p, err
	}
	if p.CourseName == "" {
		p.CourseName = "信号与系统"
	}
	if p.TeacherName == "" {
		p.TeacherName = c.TeacherName
	}
	return p, nil
}

func (s *Service) SaveExportProfile(ctx context.Context, actor uint, id string, p domain.ExportProfile) (domain.ExportProfile, error) {
	c, err := s.ownedClassroom(ctx, actor, id)
	if err != nil {
		return p, err
	}
	if err := normalizeExportProfile(&p); err != nil {
		return p, err
	}
	return p, s.classes.SaveExportProfile(ctx, c.ID, actor, p)
}
