package exports

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	domain "github.com/DEEIX-AI/DEEIX-Chat/backend/internal/domain/classroom"
	"github.com/DEEIX-AI/DEEIX-Chat/backend/internal/repository"
	"github.com/google/uuid"
)

func (s *Service) gradeDataset(ctx context.Context, actor uint, id string, o Options) (*dataset, *domain.GradeReport, error) {
	if o.Kind != "summary" || o.IncludeOngoing {
		return nil, nil, ErrInvalid
	}
	d, err := s.loadDataset(ctx, actor, id, o)
	if err != nil {
		return nil, nil, err
	}
	r := &domain.GradeReport{Version: domain.GradeVersion, ClassroomID: id, ClassroomName: d.class.Name, GeneratedAt: d.now, Weights: o.Weights, PerformanceRecordID: o.PerformanceRecordID, Students: []domain.GradeStudent{}}
	for _, student := range d.students {
		row := domain.GradeStudent{StudentID: student.PublicID, Username: student.Username, Name: student.DisplayName, Scores: map[string]*float64{}}
		total, valid := 0.0, true
		for _, key := range []string{"homeworks", "labs", "attendance", "performance", "ai_activity"} {
			weight := o.Weights[key]
			if weight <= 0 {
				continue
			}
			score, ok := d.score(student.ID, key)
			if !ok {
				valid = false
				row.Scores[key] = nil
				continue
			}
			value := rounded(score)
			row.Scores[key] = &value
			total += score * weight / 100
		}
		if valid {
			value := rounded(total)
			row.Final = &value
		}
		r.Students = append(r.Students, row)
	}
	// Hash the exact inputs, not volatile generation timestamps or XLSX metadata.
	inputs := []any{domain.GradeVersion, o, d.class, d.students, d.performance}
	if d.aiActivity != nil {
		activity := *d.aiActivity
		activity.GeneratedAt = time.Time{}
		inputs = append(inputs, activity)
		r.AIStartDate, r.AIEndDate = activity.StartDate, activity.EndDate
	}
	for _, item := range d.homeworks {
		inputs = append(inputs, item.item, item.submissions)
	}
	for _, item := range d.labs {
		inputs = append(inputs, item.item, item.states)
	}
	for _, item := range d.attendance {
		inputs = append(inputs, item.item, item.records)
	}
	encoded, err := json.Marshal(inputs)
	if err != nil {
		return nil, nil, err
	}
	hash := sha256.Sum256(encoded)
	r.Fingerprint = hex.EncodeToString(hash[:])
	return d, r, nil
}

func (s *Service) PreviewGrades(ctx context.Context, actor uint, id string, o Options) (*domain.GradeReport, error) {
	_, r, err := s.gradeDataset(ctx, actor, id, o)
	return r, err
}

func (s *Service) FinalizeGrades(ctx context.Context, actor uint, id, title, fingerprint string, o Options) (*domain.GradeRecord, error) {
	title = strings.TrimSpace(title)
	if title == "" || utf8.RuneCountInString(title) > 120 {
		return nil, ErrInvalid
	}
	d, r, err := s.gradeDataset(ctx, actor, id, o)
	if err != nil {
		return nil, err
	}
	if fingerprint == "" || r.Fingerprint != fingerprint {
		return nil, ErrStalePreview
	}
	hasScore := false
	for _, row := range r.Students {
		hasScore = hasScore || row.Final != nil
	}
	if !hasScore {
		return nil, ErrInvalid
	}
	d.recordTitle = title
	file, err := workbook(*d, o)
	if err != nil {
		return nil, err
	}
	record := &domain.GradeRecord{ID: strings.ReplaceAll(uuid.NewString(), "-", ""), ClassroomID: d.class.ID, TeacherID: actor, Title: title, CreatedAt: d.now, Report: *r, Workbook: file.Data}
	if err := s.classes.SaveGradeRecord(ctx, *record); err != nil {
		return nil, err
	}
	return record, nil
}

func (s *Service) GradeRecords(ctx context.Context, actor uint, id string) ([]domain.GradeRecord, error) {
	c, err := s.ownedClassroom(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	return s.classes.ListGradeRecords(ctx, c.ID)
}

func (s *Service) GradeRecord(ctx context.Context, actor uint, id, recordID string) (*domain.GradeRecord, error) {
	c, err := s.ownedClassroom(ctx, actor, id)
	if err != nil {
		return nil, err
	}
	record, err := s.classes.GetGradeRecord(ctx, c.ID, recordID)
	if errors.Is(err, repository.ErrNotFound) {
		return nil, ErrNotFound
	}
	return record, err
}

func (s *Service) ExportGradeRecord(ctx context.Context, actor uint, id, recordID string) (*File, error) {
	r, err := s.GradeRecord(ctx, actor, id, recordID)
	if err != nil {
		return nil, err
	}
	return &File{Name: safeName(r.Report.ClassroomName+"_"+r.Title) + ".xlsx", ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", Data: r.Workbook}, nil
}
