package classroom

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
	"unicode/utf8"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	domainuser "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/user"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/google/uuid"
)

type PerformanceCorrection struct {
	StudentID string
	Score     float64
	Reason    string
}

type FinalizePerformance struct {
	Title       string
	Options     domain.PerformanceOptions
	Fingerprint string
	Corrections []PerformanceCorrection
}

func (s *Service) Performance(ctx context.Context, actor uint, id string, options domain.PerformanceOptions) (*domain.PerformanceReport, error) {
	c, err := s.owned(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	if options.StartAt != nil && options.EndAt != nil && !options.StartAt.Before(*options.EndAt) || len(options.QuizIDs) > 1000 {
		return nil, ErrInvalid
	}
	roster, err := s.repo.ListClassroomStudents(ctx, c.ID)
	if err != nil {
		return nil, err
	}
	quizzes, err := s.repo.ListQuizzes(ctx, c.ID)
	if err != nil {
		return nil, err
	}
	selected := map[string]bool{}
	for _, q := range options.QuizIDs {
		selected[q] = true
	}
	found := map[string]bool{}
	inputs := []domain.PerformanceInput{}
	now := time.Now()
	for _, q := range quizzes {
		if len(selected) > 0 && !selected[q.PublicID] {
			continue
		}
		if q.Status != domain.QuizStatusClosed || q.ClosedAt == nil || q.ClosedAt.After(now) {
			continue
		}
		if options.StartAt != nil && q.ClosedAt.Before(*options.StartAt) || options.EndAt != nil && !q.ClosedAt.Before(*options.EndAt) {
			continue
		}
		found[q.PublicID] = true
		for i := range q.Questions {
			if q.Questions[i].ConceptID == "" {
				q.Questions[i].ConceptID = questionConcept(q.Questions[i])
			}
		}
		subs, err := s.repo.ListQuizSubmissions(ctx, q.ID)
		if err != nil {
			return nil, fmt.Errorf("performance quiz %s: %w", q.PublicID, err)
		}
		byID := map[uint]domain.QuizSubmission{}
		for _, sub := range subs {
			byID[sub.StudentID] = sub
		}
		inputs = append(inputs, domain.PerformanceInput{Quiz: q, Submissions: byID})
	}
	for id := range selected {
		if !found[id] {
			return nil, ErrInvalid
		}
	}
	// Retests contribute only when their source is in the same closed range.
	filtered := inputs[:0]
	for _, in := range inputs {
		if in.Quiz.SourceQuizID == "" || found[in.Quiz.SourceQuizID] {
			filtered = append(filtered, in)
		}
	}
	r, err := domain.BuildPerformance(id, roster, filtered, options)
	if err != nil {
		return nil, err
	}
	encoded, err := json.Marshal(r)
	if err != nil {
		return nil, err
	}
	hash := sha256.Sum256(encoded)
	r.Fingerprint = hex.EncodeToString(hash[:])
	return r, nil
}

func (s *Service) FinalizePerformance(ctx context.Context, actor uint, id string, in FinalizePerformance) (*domain.PerformanceRecord, error) {
	c, err := s.owned(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	in.Title = strings.TrimSpace(in.Title)
	if in.Title == "" || utf8.RuneCountInString(in.Title) > 120 {
		return nil, ErrInvalid
	}
	r, err := s.Performance(ctx, actor, id, in.Options)
	if err != nil {
		return nil, err
	}
	if len(r.Activities) == 0 || in.Fingerprint == "" || in.Fingerprint != r.Fingerprint {
		return nil, ErrInvalid
	}
	byID := map[string]*domain.PerformanceStudent{}
	for i := range r.Students {
		byID[r.Students[i].StudentID] = &r.Students[i]
	}
	seen := map[string]bool{}
	for _, correction := range in.Corrections {
		row := byID[correction.StudentID]
		reason := strings.TrimSpace(correction.Reason)
		if row == nil || row.Final == nil || seen[correction.StudentID] || reason == "" || utf8.RuneCountInString(reason) > 500 || math.IsNaN(correction.Score) || math.IsInf(correction.Score, 0) || correction.Score < 0 || correction.Score > 100 {
			return nil, ErrInvalid
		}
		value := math.Round(correction.Score*10) / 10
		row.Final, row.Reason = &value, reason
		seen[correction.StudentID] = true
	}
	record := &domain.PerformanceRecord{ID: strings.ReplaceAll(uuid.NewString(), "-", ""), ClassroomID: c.ID, Title: in.Title, CreatedAt: time.Now(), Report: *r}
	if err := s.repo.SavePerformanceRecord(ctx, *record); err != nil {
		return nil, err
	}
	return record, nil
}

func (s *Service) PerformanceRecords(ctx context.Context, actor uint, id string) ([]domain.PerformanceRecord, error) {
	c, err := s.owned(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	return s.repo.ListPerformanceRecords(ctx, c.ID)
}

func (s *Service) PerformanceRecord(ctx context.Context, actor uint, id, recordID string) (*domain.PerformanceRecord, error) {
	c, err := s.owned(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	r, err := s.repo.GetPerformanceRecord(ctx, c.ID, recordID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	return r, err
}

// StudentPerformance returns only this student's latest published row, without ranks or peer data.
func (s *Service) StudentPerformance(ctx context.Context, actor uint) (*domain.PerformanceRecord, error) {
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
	items, err := s.repo.ListPerformanceRecords(ctx, c.ID)
	if err != nil {
		return nil, err
	}
	for _, item := range items {
		r, err := s.repo.GetPerformanceRecord(ctx, c.ID, item.ID)
		if err != nil {
			return nil, err
		}
		for _, row := range r.Report.Students {
			if row.UserID == actor {
				row.Rank = nil
				r.Report.Students = []domain.PerformanceStudent{row}
				r.Report.Eligible = 0
				r.Report.Fingerprint = ""
				return r, nil
			}
		}
	}
	return nil, nil
}
